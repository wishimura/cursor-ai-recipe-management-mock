'use client'

type TopBarProps = {
  title: string
  children?: React.ReactNode
  onMenuToggle?: () => void
}

export default function TopBar({ title, children }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>

        {children && (
          <div className="flex items-center gap-2">{children}</div>
        )}
      </div>
    </header>
  )
}
