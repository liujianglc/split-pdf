export default function Footer() {
  return (
    <footer className="py-10 px-4 bg-gray-900 text-gray-400 text-sm">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-gray-300 font-medium">试卷切题助手</p>
        <p className="mt-2">免费在线试卷 PDF 切分工具 — 去除密封线，分栏输出 A4 打印版</p>
        <p className="mt-6 text-xs">© {new Date().getFullYear()} 试卷切题助手 · 无需安装 · 完全免费</p>
      </div>
    </footer>
  )
}
