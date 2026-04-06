import atexit
import re
import shutil
import tempfile
import uuid
from pathlib import Path

import fitz
from flask import Flask, jsonify, render_template, request, send_file

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

UPLOAD_FOLDER = tempfile.mkdtemp()


def cleanup_upload_folder():
    """清理临时上传目录"""
    try:
        shutil.rmtree(UPLOAD_FOLDER, ignore_errors=True)
    except Exception:
        pass


atexit.register(cleanup_upload_folder)


def validate_file_id(file_id: str) -> bool:
    """验证 file_id 是否为有效的 UUID 格式"""
    return bool(re.match(r'^[a-f0-9\-]{36}$', file_id))


def validate_pdf_file(filepath: str) -> tuple[bool, str]:
    """验证文件是否为有效的 PDF"""
    try:
        with open(filepath, 'rb') as f:
            header = f.read(5)
            if header != b'%PDF-':
                return False, '文件不是有效的 PDF 格式'
        return True, ''
    except Exception as e:
        return False, str(e)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({'error': '未上传文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': '仅支持 PDF 文件'}), 400

    file_id = str(uuid.uuid4())
    filepath = Path(UPLOAD_FOLDER) / f"{file_id}.pdf"
    file.save(filepath)

    # 验证文件内容
    is_valid, error_msg = validate_pdf_file(str(filepath))
    if not is_valid:
        filepath.unlink(missing_ok=True)
        return jsonify({'error': error_msg}), 400

    try:
        with fitz.open(str(filepath)) as doc:
            page = doc[0]
            page_width = page.rect.width
            page_height = page.rect.height
            page_count = len(doc)

        return jsonify({
            'file_id': file_id,
            'page_count': page_count,
            'page_width': page_width,
            'page_height': page_height
        })
    except Exception as e:
        filepath.unlink(missing_ok=True)
        return jsonify({'error': f'无法读取 PDF 文件: {str(e)}'}), 500


@app.route('/pdf/<file_id>')
def get_pdf(file_id):
    if not validate_file_id(file_id):
        return jsonify({'error': '无效的文件 ID'}), 400

    filepath = Path(UPLOAD_FOLDER) / f"{file_id}.pdf"
    if not filepath.exists():
        return jsonify({'error': '文件不存在'}), 404

    return send_file(str(filepath), mimetype='application/pdf')


@app.route('/process', methods=['POST'])
def process_pdf():
    data = request.json

    # 验证 file_id
    file_id = data.get('file_id')
    if not file_id or not validate_file_id(file_id):
        return jsonify({'error': '无效的文件 ID'}), 400

    # 验证坐标参数
    try:
        x0 = float(data.get('x0'))
        y0 = float(data.get('y0'))
        x1 = float(data.get('x1'))
        y1 = float(data.get('y1'))
        num_cols = int(data.get('cols', 2))
    except (TypeError, ValueError):
        return jsonify({'error': '坐标参数格式错误'}), 400

    # 验证坐标范围
    if x1 <= x0 or y1 <= y0:
        return jsonify({'error': '坐标参数无效：终点坐标必须大于起点坐标'}), 400

    if num_cols < 1 or num_cols > 10:
        return jsonify({'error': '分栏数必须在 1-10 之间'}), 400

    filepath = Path(UPLOAD_FOLDER) / f"{file_id}.pdf"
    if not filepath.exists():
        return jsonify({'error': '文件不存在'}), 404

    try:
        with fitz.open(str(filepath)) as doc:
            with fitz.open() as out_doc:
                total_width = x1 - x0

                for page in doc:
                    page_width = page.rect.width
                    page_num = page.number + 1

                    # 奇数页密封线在左边，偶数页镜像处理
                    if page_num % 2 == 1:
                        curr_x0, curr_x1 = x0, x1
                    else:
                        curr_x0 = page_width - x1
                        curr_x1 = page_width - x0

                    curr_total_width = curr_x1 - curr_x0
                    curr_col_width = curr_total_width / num_cols

                    for i in range(num_cols):
                        sub_x0 = curr_x0 + (i * curr_col_width)
                        sub_x1 = sub_x0 + curr_col_width
                        sub_rect = fitz.Rect(sub_x0, y0, sub_x1, y1)

                        # A4 尺寸: 595 x 842 点 (约 210mm x 297mm)
                        new_page = out_doc.new_page(width=595, height=842)
                        new_page.show_pdf_page(new_page.rect, doc, page.number, clip=sub_rect)

                output_id = str(uuid.uuid4())
                output_path = Path(UPLOAD_FOLDER) / f"{output_id}_output.pdf"
                out_doc.save(str(output_path))

        with fitz.open(str(output_path)) as out_doc:
            page_count = len(out_doc)

        return jsonify({
            'output_id': output_id,
            'page_count': page_count
        })
    except Exception as e:
        return jsonify({'error': f'处理失败: {str(e)}'}), 500


@app.route('/download/<output_id>')
def download_pdf(output_id):
    if not validate_file_id(output_id):
        return jsonify({'error': '无效的输出 ID'}), 400

    filepath = Path(UPLOAD_FOLDER) / f"{output_id}_output.pdf"
    if not filepath.exists():
        return jsonify({'error': '文件不存在'}), 404

    return send_file(str(filepath), as_attachment=True, download_name='试卷_A4打印版.pdf')


if __name__ == '__main__':
    app.run(debug=True, port=5000)