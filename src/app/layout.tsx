import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/features/auth/components/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '大学生职业规划智能体系统',
  description: 'A modern AI-driven career planning agent for college students.',
}

// 防止主题切换闪烁（在 React 水合前执行）
const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('theme') || 'system';
    if (t === 'system') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" data-theme="light" suppressHydrationWarning>
      <head>
        {/* 主题初始化脚本 — 必须在所有样式之前执行 */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} bg-[#F8FAFC] antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
