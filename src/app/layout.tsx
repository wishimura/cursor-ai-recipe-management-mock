import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'レシピ原価管理 | RecipeCost',
  description:
    '飲食店向けレシピ原価管理SaaS。食材マスタ・仕込みレシピ・メニュー原価率をリアルタイムで可視化し、利益改善をサポートします。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="font-sans">{children}</body>
    </html>
  )
}
