const steps = [
  {
    num: '1',
    title: '上传试卷 PDF',
    desc: '点击上传按钮，选择您的双面打印试卷 PDF 文件（支持 JPG/PNG 扫描件转 PDF 格式）。',
  },
  {
    num: '2',
    title: '框选答题区域',
    desc: '在 PDF 预览中框选需要保留的答题区域，系统会自动处理双面方向，支持微调坐标。',
  },
  {
    num: '3',
    title: '下载 A4 打印版',
    desc: '选择分栏数（1/2/3栏），点击生成，等待处理完成后自动下载排好版的 A4 PDF。',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900">三步完成试卷切题</h2>
        <p className="mt-4 text-lg text-gray-500 text-center">简单三步，即可获得可直接打印的 A4 试卷</p>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, i) => (
            <div key={i} className="text-center relative">
              <div className="w-14 h-14 rounded-full bg-primary text-white text-xl font-bold flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
                {step.num}
              </div>
              <h3 className="mt-6 text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
