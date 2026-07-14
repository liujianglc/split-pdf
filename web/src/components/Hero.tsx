'use client'

export default function Hero() {
  const scrollToTool = () => {
    document.querySelector('#tools')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="pt-28 pb-20 md:pt-36 md:pb-28 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
          免费在线试卷切题助手
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          上传双面打印的试卷 PDF，自动去除密封线区域，按需分栏输出 A4 打印版。
          <span className="block mt-2 text-primary font-medium">无需安装，完全免费。</span>
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={scrollToTool} className="px-8 py-3.5 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25">
            开始切题
          </button>
          <button onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-3.5 border-2 border-gray-200 text-gray-700 text-lg font-medium rounded-xl hover:border-primary hover:text-primary transition-colors">
            了解更多
          </button>
        </div>
      </div>
    </section>
  )
}
