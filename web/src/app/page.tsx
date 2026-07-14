import Navbar from "@/components/Navbar"
import Hero from "@/components/Hero"
import Features from "@/components/Features"
import HowItWorks from "@/components/HowItWorks"
import FAQ from "@/components/FAQ"
import Footer from "@/components/Footer"
import ToolSection from "@/components/tool/ToolSection"

export default function Page() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <FAQ />
        <section id="tools" className="py-20 md:py-28 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">开始使用</h2>
              <p className="mt-3 text-lg text-gray-500">上传试卷 PDF，框选区域，一键生成 A4 打印版</p>
            </div>
            <ToolSection />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
