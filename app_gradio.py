import os
import tempfile
from pathlib import Path

import fitz
import gradio as gr


def process_pdf(pdf_file, x0, y0, width, height, cols):
    """处理 PDF 文件，裁剪并分栏输出"""
    if pdf_file is None:
        return None, "请先上传 PDF 文件"

    # 验证参数
    try:
        x0 = float(x0)
        y0 = float(y0)
        width = float(width)
        height = float(height)
        cols = int(cols)
    except (TypeError, ValueError):
        return None, "参数格式错误"

    if width <= 0 or height <= 0:
        return None, "宽度和高度必须大于 0"

    if cols < 1 or cols > 10:
        return None, "分栏数必须在 1-10 之间"

    try:
        with fitz.open(pdf_file.name) as doc:
            with fitz.open() as out_doc:
                x1 = x0 + width
                y1 = y0 + height

                for page in doc:
                    page_width = page.rect.width
                    page_num = page.number + 1

                    # 奇数页密封线在左边，偶数页镜像处理
                    if page_num % 2 == 1:
                        curr_x0, curr_x1 = x0, x1
                    else:
                        curr_x0 = page_width - x1
                        curr_x1 = page_width - x0

                    curr_col_width = (curr_x1 - curr_x0) / cols

                    for i in range(cols):
                        sub_x0 = curr_x0 + (i * curr_col_width)
                        sub_x1 = sub_x0 + curr_col_width
                        sub_rect = fitz.Rect(sub_x0, y0, sub_x1, y1)

                        # A4 尺寸: 595 x 842 点 (约 210mm x 297mm)
                        new_page = out_doc.new_page(width=595, height=842)
                        new_page.show_pdf_page(new_page.rect, doc, page.number, clip=sub_rect)

                output_path = tempfile.mktemp(suffix=".pdf")
                out_doc.save(output_path)

        with fitz.open(output_path) as result_doc:
            page_count = len(result_doc)

        return output_path, f"✅ 处理完成！共生成 {page_count} 页 A4 文档"

    except Exception as e:
        return None, f"❌ 处理失败: {str(e)}"


def get_pdf_info(pdf_file):
    """获取 PDF 文件信息并设置默认参数"""
    if pdf_file is None:
        return "未上传文件", 100, 10, 400, 700

    try:
        with fitz.open(pdf_file.name) as doc:
            page = doc[0]
            w, h = page.rect.width, page.rect.height
            page_count = len(doc)

            default_x = int(w * 0.15)
            default_w = int(w * 0.83)
            default_h = int(h - 20)

            return f"页面尺寸: {int(w)} × {int(h)}, 共 {page_count} 页", default_x, 10, default_w, default_h
    except Exception as e:
        return f"无法读取文件: {str(e)}", 100, 10, 400, 700


with gr.Blocks(title="试卷切题助手", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 📄 试卷切题助手")
    gr.Markdown("上传双面打印的试卷 PDF，自动去除密封线并分栏输出 A4 打印版")

    with gr.Row():
        with gr.Column(scale=1):
            pdf_input = gr.File(label="上传 PDF 试卷", file_types=[".pdf"])
            pdf_info = gr.Textbox(label="文件信息", interactive=False)

            gr.Markdown("### 裁剪区域设置")
            gr.Markdown("*提示：奇数页密封线在左边，偶数页自动镜像处理*")

            with gr.Row():
                x_input = gr.Number(label="X 起点", value=100, precision=0)
                y_input = gr.Number(label="Y 起点", value=10, precision=0)

            with gr.Row():
                w_input = gr.Number(label="宽度", value=400, precision=0)
                h_input = gr.Number(label="高度", value=700, precision=0)

            cols_input = gr.Radio(choices=[1, 2, 3], value=2, label="分栏模式")

            process_btn = gr.Button("🚀 生成 A4 打印版", variant="primary")

        with gr.Column(scale=1):
            output_file = gr.File(label="下载处理后的 PDF")
            output_msg = gr.Textbox(label="处理结果", interactive=False)

    pdf_input.change(
        fn=get_pdf_info,
        inputs=[pdf_input],
        outputs=[pdf_info, x_input, y_input, w_input, h_input]
    )

    process_btn.click(
        fn=process_pdf,
        inputs=[pdf_input, x_input, y_input, w_input, h_input, cols_input],
        outputs=[output_file, output_msg]
    )

if __name__ == "__main__":
    demo.launch()