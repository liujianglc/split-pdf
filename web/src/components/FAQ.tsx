'use client'

import { useState } from 'react'

const faqs = [
  {
    q: '支持哪些文件格式？',
    a: '支持 PDF 格式文件，单个文件最大 50MB。如果是扫描件图片，建议先合并为 PDF 后再上传。',
  },
  {
    q: '如何处理双面打印的试卷？',
    a: '系统会自动识别页码奇偶，偶数页会自动镜像翻转选区坐标，确保密封线位置正确。您只需要框选一次即可。',
  },
  {
    q: '输出文件是什么格式？',
    a: '输出为标准 A4 尺寸的 PDF 文件，可直接打印。分辨率约 216 DPI，满足打印需求。',
  },
  {
    q: '分栏数怎么选？',
    a: '一般建议选择 2 栏。如果试卷内容较多且文字较小，可选 1 栏；若内容紧凑，可选 3 栏以节省纸张。',
  },
  {
    q: '文件会保存在服务器上吗？',
    a: '处理完成后文件会在 1 小时后自动删除。我们不会保存您的任何试卷内容，请放心使用。',
  },
  {
    q: '是否有使用次数限制？',
    a: '没有限制。完全免费，无需注册，无使用次数上限。',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 md:py-28 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900">常见问题</h2>
        <p className="mt-4 text-lg text-gray-500 text-center">关于试卷切题助手的常见疑问</p>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-4 flex items-center justify-between text-left text-gray-900 font-medium hover:bg-gray-50 transition-colors"
              >
                {faq.q}
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4 text-sm text-gray-500 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
