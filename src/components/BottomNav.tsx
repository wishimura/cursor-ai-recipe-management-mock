'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Carrot,
  ChefHat,
  ClipboardList,
  MoreHorizontal,
  Utensils,
  TrendingUp,
  Truck,
  Users,
  User,
  Building2,
  CreditCard,
} from 'lucide-react'

const tabItems = [
  { label: 'ホーム', icon: LayoutDashboard, href: '/dashboard' },
  { label: '食材', icon: Carrot, href: '/ingredients' },
  { label: 'レシピ', icon: ChefHat, href: '/recipes' },
  { label: '棚卸', icon: ClipboardList, href: '/inventory' },
]

const moreMenuItems = [
  { label: '仕込みレシピ', icon: Utensils, href: '/prep-recipes' },
  { label: '原価分析', icon: TrendingUp, href: '/analysis' },
  { label: '業者管理', icon: Truck, href: '/suppliers' },
  { label: 'アカウント', icon: Users, href: '/accounts' },
  { label: 'プロフィール', icon: User, href: '/profile' },
  { label: '組織設定', icon: Building2, href: '/settings' },
  { label: '料金プラン', icon: CreditCard, href: '/billing' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleOpenSheet = useCallback(() => {
    setSheetOpen(true)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false)
  }, [])

  const isTabActive = (href: string) => {
    if (href === '/recipes') {
      return pathname === '/recipes' || pathname.startsWith('/recipes/') ||
             pathname === '/prep-recipes' || pathname.startsWith('/prep-recipes/')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isMoreActive = moreMenuItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around h-16">
          {tabItems.map((item) => {
            const active = isTabActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                  active ? 'text-orange-500' : 'text-gray-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}

          {/* More tab */}
          <button
            onClick={handleOpenSheet}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              isMoreActive ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <MoreHorizontal size={20} />
            <span className="text-xs">その他</span>
          </button>
        </div>
      </nav>

      {/* Bottom Sheet Overlay */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={handleCloseSheet}
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          sheetOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Menu items */}
        <nav className="px-4 pb-8">
          {moreMenuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleCloseSheet}
                className={`flex items-center gap-3 py-3 px-2 rounded-lg transition-colors hover:bg-gray-50 ${
                  active ? 'text-orange-500' : 'text-gray-700'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
