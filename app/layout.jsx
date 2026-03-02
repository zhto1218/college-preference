import './globals.css'

export const metadata = {
  title: '志愿参谋 - AI择校顾问',
  description: 'AI驱动的高考志愿填报助手，像跟人聊天一样，给你个性化的院校推荐',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
