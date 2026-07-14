import atexit
import shutil
import tempfile
import threading
import time
import uuid
from pathlib import Path

import fitz
from flask import Flask, jsonify, render_template, request, send_file


app = Flask(__name__)

app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024


# 临时文件目录
UPLOAD_FOLDER = tempfile.mkdtemp()

FILE_TTL_SECONDS = 3600


# A4尺寸
A4_WIDTH = 595
A4_HEIGHT = 842

PAGE_MARGIN = 20

# 栅格化倍率 (约 216 DPI)。越大越清晰但文件越大, 打印可用 3~4。
RENDER_ZOOM = 3.0

PROCESS_TIMEOUT = 300

# 异步任务进度
_tasks = {}
_tasks_lock = threading.Lock()


# =========================
# 清理文件
# =========================

def cleanup_upload_folder():
    shutil.rmtree(
        UPLOAD_FOLDER,
        ignore_errors=True
    )


def cleanup_expired_files():

    now = time.time()

    folder = Path(UPLOAD_FOLDER)

    if not folder.exists():
        return


    for f in folder.iterdir():

        try:

            if now - f.stat().st_mtime > FILE_TTL_SECONDS:
                f.unlink()

        except:
            pass

    with _tasks_lock:
        expired = [
            tid
            for tid, t in _tasks.items()
            if now - t["created_at"] > FILE_TTL_SECONDS
            and t["status"] in ("done", "error", "timeout")
        ]
        for tid in expired:
            del _tasks[tid]



atexit.register(cleanup_upload_folder)



@app.before_request
def before_request():

    cleanup_expired_files()



# =========================
# 工具
# =========================

def validate_file_id(fid):

    try:
        uuid.UUID(fid)
        return True

    except:
        return False



def validate_pdf_file(path):

    try:

        with open(path,"rb") as f:

            if f.read(5)!=b"%PDF-":
                return False,"不是PDF文件"


        return True,""

    except Exception as e:

        return False,str(e)




def fit_rect_in_a4(rect):

    w = rect.width
    h = rect.height


    max_w = A4_WIDTH - PAGE_MARGIN*2
    max_h = A4_HEIGHT - PAGE_MARGIN*2


    scale=min(
        max_w/w,
        max_h/h
    )


    nw=w*scale
    nh=h*scale


    x=(A4_WIDTH-nw)/2
    y=(A4_HEIGHT-nh)/2


    return fitz.Rect(
        x,
        y,
        x+nw,
        y+nh
    )




def add_clip_page(
        out_doc,
        src_doc,
        page,
        clip_rect
):
    """
    把源页面的选区放到一张 A4 上。

    关键: 用 page.get_pixmap(clip=...) 栅格化, 而不是 show_pdf_page。
    - get_pixmap 会遵循页面的显示旋转 (/Rotate), 输出方向与预览一致,
      不会出现内容侧躺/旋转 90 度的问题;
    - clip 坐标与 page.rect (即前端预览) 处在同一坐标系, 选区不会错位。
    """

    mat = fitz.Matrix(RENDER_ZOOM, RENDER_ZOOM)

    pix = page.get_pixmap(matrix=mat, clip=clip_rect)

    new_page = out_doc.new_page(
        width=A4_WIDTH,
        height=A4_HEIGHT
    )

    # 按图片实际宽高比居中放置, 避免拉伸变形
    target = fit_rect_in_a4(
        fitz.Rect(0, 0, pix.width, pix.height)
    )

    new_page.insert_image(
        target,
        stream=pix.tobytes("png")
    )




# =========================
# 首页
# =========================

@app.route("/")
def index():

    return render_template(
        "index.html"
    )




# =========================
# 上传
# =========================

@app.route(
    "/upload",
    methods=["POST"]
)
def upload_pdf():


    if "file" not in request.files:

        return jsonify(
            {"error":"没有文件"}
        ),400


    file=request.files["file"]


    if file.filename=="":
        return jsonify(
            {"error":"文件为空"}
        ),400



    if not file.filename.lower().endswith(".pdf"):

        return jsonify(
            {"error":"只支持PDF"}
        ),400



    fid=str(uuid.uuid4())


    path=Path(
        UPLOAD_FOLDER
    )/f"{fid}.pdf"


    file.save(path)



    ok,msg=validate_pdf_file(
        str(path)
    )


    if not ok:

        path.unlink()

        return jsonify(
            {"error":msg}
        ),400




    try:

        with fitz.open(path) as doc:

            page=doc[0]


            return jsonify({

                "file_id":fid,

                "page_count":len(doc),

                "page_width":page.rect.width,

                "page_height":page.rect.height

            })



    except Exception as e:


        path.unlink()

        return jsonify(
            {
            "error":str(e)
            }
        ),500





# =========================
# 查看PDF
# =========================

@app.route(
    "/pdf/<fid>"
)
def get_pdf(fid):


    if not validate_file_id(fid):

        return jsonify(
            {"error":"ID错误"}
        ),400



    path=Path(
        UPLOAD_FOLDER
    )/f"{fid}.pdf"


    if not path.exists():

        return jsonify(
            {"error":"文件不存在"}
        ),404



    return send_file(
        path,
        mimetype="application/pdf"
    )





# =========================
# 核心裁剪
# =========================


def _process_task(
    task_id, pdf_path, x0, y0, x1, y1, cols
):
    try:
        with _tasks_lock:
            _tasks[task_id]["status"] = "running"

        with fitz.open(pdf_path) as doc:
            total_pages = len(doc)
            total_steps = total_pages * cols

            with _tasks_lock:
                _tasks[task_id]["total_steps"] = total_steps

            with fitz.open() as out:
                for page in doc:
                    page_width = page.rect.width
                    page_num = page.number + 1

                    if page_num % 2 == 1:
                        px0, px1 = x0, x1
                    else:
                        px0 = page_width - x1
                        px1 = page_width - x0

                    py0, py1 = y0, y1
                    total_width = px1 - px0
                    col_width = total_width / cols

                    for i in range(cols):
                        cx0 = px0 + i * col_width
                        cx1 = cx0 + col_width
                        rect = fitz.Rect(cx0, py0, cx1, py1)
                        add_clip_page(out, doc, page, rect)

                        with _tasks_lock:
                            _tasks[task_id]["current_step"] += 1
                            pct = round(
                                _tasks[task_id]["current_step"] / total_steps * 100, 1
                            )
                            _tasks[task_id]["progress"] = pct

                out_id = str(uuid.uuid4())
                out_path = Path(UPLOAD_FOLDER) / f"{out_id}_output.pdf"
                page_count = len(out)
                out.save(out_path)

                with _tasks_lock:
                    _tasks[task_id]["status"] = "done"
                    _tasks[task_id]["output_id"] = out_id
                    _tasks[task_id]["page_count"] = page_count
                    _tasks[task_id]["progress"] = 100.0

    except Exception as e:
        with _tasks_lock:
            _tasks[task_id]["status"] = "error"
            _tasks[task_id]["error"] = str(e)


@app.route(
    "/process",
    methods=["POST"]
)
def process_pdf():


    data=request.json



    fid=data.get("file_id")



    if not fid or not validate_file_id(fid):

        return jsonify(
            {"error":"ID错误"}
        ),400



    try:

        x0=float(data["x0"])
        y0=float(data["y0"])

        x1=float(data["x1"])
        y1=float(data["y1"])


        cols=int(
            data.get(
                "cols",
                2
            )
        )


    except Exception:

        return jsonify(
            {"error":"参数错误"}
        ),400



    if x1 <= x0 or y1 <= y0:
        return jsonify(
            {"error":"选区无效: 终点坐标必须大于起点坐标"}
        ),400

    if cols < 1 or cols > 10:
        return jsonify(
            {"error":"分栏数必须在 1-10 之间"}
        ),400




    pdf_path=Path(
        UPLOAD_FOLDER
    )/f"{fid}.pdf"



    if not pdf_path.exists():

        return jsonify(
            {"error":"文件不存在"}
        ),404



    task_id = str(uuid.uuid4())
    with _tasks_lock:
        _tasks[task_id] = {
            "status": "pending",
            "progress": 0.0,
            "total_steps": 0,
            "current_step": 0,
            "output_id": None,
            "page_count": 0,
            "error": None,
            "timeout_at": time.time() + PROCESS_TIMEOUT,
            "created_at": time.time(),
        }

    t = threading.Thread(
        target=_process_task,
        args=(task_id, str(pdf_path), x0, y0, x1, y1, cols),
        daemon=True,
    )
    t.start()

    return jsonify({"task_id": task_id})


@app.route(
    "/progress/<task_id>"
)
def get_progress(task_id):

    with _tasks_lock:
        task = _tasks.get(task_id)

    if not task:
        return jsonify({"error": "任务不存在"}), 404

    if task["status"] == "running" and time.time() > task["timeout_at"]:
        with _tasks_lock:
            task["status"] = "timeout"

    return jsonify({
        "status": task["status"],
        "progress": task["progress"],
        "output_id": task["output_id"],
        "page_count": task["page_count"],
        "error": task["error"],
    })





# =========================
# 下载
# =========================

@app.route(
    "/download/<oid>"
)
def download_pdf(oid):


    if not validate_file_id(oid):

        return jsonify(
            {"error":"ID错误"}
        ),400



    path=Path(
        UPLOAD_FOLDER
    )/f"{oid}_output.pdf"



    if not path.exists():

        return jsonify(
            {"error":"不存在"}
        ),404



    return send_file(

        path,

        as_attachment=True,

        download_name="试卷_A4打印版.pdf"

    )




if __name__=="__main__":

    app.run(
        debug=True,
        port=5000
    )