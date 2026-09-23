'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '▣', href: '/admin/dashboard' },
  { key: 'bookings', label: 'Bookings', icon: '🧾', href: '/admin/bookings' },
  { key: 'projects', label: 'Projects', icon: '🛠️', href: '/admin/projects' },
  { key: 'registrations', label: 'Registrations', icon: '📋', href: '/admin/registrations' },
  { key: 'inventory', label: 'Inventory', icon: '📦', href: '/admin/inventory' },
  { key: 'technicians', label: 'Technicians', icon: '👷', href: '/admin/technicians' },
  { key: 'reports', label: 'Reports', icon: '📊', href: '/admin/reports' },
  { key: 'notifications', label: 'Notifications', icon: '🔔', href: '/admin/notifications' },
  { key: 'settings', label: 'Settings', icon: '⚙️', href: '/admin/settings' },
]

export default function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  function isActive(href: string) {
    const p = pathname || ''
    if (href === '/admin/dashboard') return p === '/admin/dashboard' || p === '/admin'
    return p.startsWith(href)
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      // ignore
    }
    router.push('/admin/login')
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-[#2a3138] bg-[#0b0f10] text-gray-300 transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-[260px]'
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {collapsed ? (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400 text-black font-black">
            ⚡
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400 text-black font-black text-lg">
                ⚡
              </div>
              <div>
                <div className="text-sm font-black leading-tight text-white tracking-wide">ELETTRO</div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-semibold">Engineering Admin</div>
              </div>
            </div>
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              ‹
            </button>
          </>
        )}
      </div>

      {/* Collapse toggle (icons only mode) */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-white/10">
          <button
            onClick={onToggle}
            title="Expand sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            ›
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.key}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? 'Logout' : undefined}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">⎋</span>
          {!collapsed && <span className="truncate">{loggingOut ? 'Signing out…' : 'Logout'}</span>}
        </button>
      </div>
    </aside>
  )
}