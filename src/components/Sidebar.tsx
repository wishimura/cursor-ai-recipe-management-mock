'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ChefHat,
  UtensilsCrossed,
  ClipboardList,
  BarChart3,
  Truck,
  User,
  Users,
  Building2,
  CreditCard,
  LogOut,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type SidebarProps = {
  orgName?: string
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { label: 'ダッシュボード', icon: LayoutDashboard, href: '/dashboard' },
  { label: '食材マスタ', icon: Package, href: '/ingredients' },
  { label: '仕込みレシピ', icon: ChefHat, href: '/prep-recipes' },
  { label: 'メニューレシピ', icon: UtensilsCrossed, href: '/recipes' },
  { label: '棚卸', icon: ClipboardList, href: '/inventory' },
  { label: '原価分析', icon: BarChart3, href: '/analysis' },
  { label: '業者管理', icon: Truck, href: '/suppliers' },
  { label: 'アカウント', icon: Users, href: '/accounts' },
  { label: 'プロフィール', icon: User, href: '/profile' },
  { label: '組織設定', icon: Building2, href: '/settings' },
  { label: '料金プラン', icon: CreditCard, href: '/billing' },
]

export default function Sidebar({ orgName = 'マイ店舗', isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Sidebar - desktop only */}
      <aside
        className="hidden lg:flex fixed top-0 left-0 z-50 h-full w-[260px] bg-white border-r border-gray-200 flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {orgName}
              </p>
              <p className="text-xs text-gray-500">RecipeCost</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon
                  size={20}
                  className={isActive ? 'text-primary-600' : 'text-gray-400'}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
                       text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
          >
            <LogOut size={20} className="text-gray-400" />
            ログアウト
          </button>
        </div>
      </aside>
    </>
  )
}
