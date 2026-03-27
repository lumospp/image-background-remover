import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 智能抠图 | Image Background Remover',
  description: '使用 AI 一键移除图片背景',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  )
}
