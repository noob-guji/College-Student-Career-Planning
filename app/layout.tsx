import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '大学生职业规划智能体系统',
  description: 'A modern AI-driven career planning agent for college students.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={`${inter.className} bg-[#F8FAFC] antialiased`}>
        {children}
      </body>
    </html>
  )
}
