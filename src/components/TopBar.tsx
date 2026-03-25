'use client'

import { Menu } from 'lucide-react'

type TopBarProps = {
  title: string
  children?: React.ReactNode
  onMenuToggle: () => void
}

export default function TopBar({ title, children, onMenuToggle }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="メニューを開く"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>

        {children && (
          <div className="flex items-center gap-2">{children}</div>
        )}
      </div>
    </header>
  )
}
