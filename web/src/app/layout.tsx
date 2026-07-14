import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "试卷切题助手 - 免费在线PDF切分工具",
  description: "免费在线试卷切题工具，支持双面打印试卷PDF处理，自动去除密封线，分栏输出A4打印版，无需安装软件。",
  keywords: "PDF切分,试卷处理,密封线去除,分栏打印,试卷切题,PDF工具,在线PDF处理",
  openGraph: {
    title: "试卷切题助手 - 免费在线PDF切分工具",
    description: "上传双面打印的试卷PDF，自动去除密封线并分栏输出A4打印版",
    locale: "zh_CN",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
