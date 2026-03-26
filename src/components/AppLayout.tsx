'use client'

import { useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import ChatAssistant from '@/components/ChatAssistant'

type AppLayoutProps = {
  children: React.ReactNode
  title: string
  orgName?: string
  actions?: React.ReactNode
}

export default function AppLayout({
  children,
  title,
  orgName,
  actions,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar orgName={orgName} isOpen={sidebarOpen} onClose={handleClose} />

      <div className="lg:ml-[260px] flex flex-col min-h-screen">
        <TopBar title={title} onMenuToggle={handleToggle}>
          {actions}
        </TopBar>

        <main className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6">{children}</main>
      </div>

      <BottomNav />
      <ChatAssistant />
    </div>
  )
}
