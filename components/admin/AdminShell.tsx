'use client'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'

type AdminShellProps = {
  user: { name: string; email: string; role: string; profileImageUrl?: string | null }
  children: ReactNode
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [unread, setUnread] = useState(0)

  const refreshUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setUnread(data.unread || 0)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    refreshUnread()
  }, [refreshUnread])

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        className="flex min-h-screen flex-col transition-all duration-300"
        style={{ marginLeft: collapsed ? 68 : 260 }}
      >
        <AdminHeader user={user} unreadCount={unread} onRefreshNotifications={refreshUnread} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-slate-200 py-4 px-6 text-center text-[11px] font-medium text-slate-400">
          © {new Date().getFullYear()} ELETTRO Engineering Enterprises — Admin Panel
        </footer>
      </div>
    </div>
  )
}