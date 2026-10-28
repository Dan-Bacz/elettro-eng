'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { GridIcon, CartIcon, InboxIcon, PackageIcon, BarChartIcon, DocumentIcon, LogoutIcon } from '../admin/icons'

type Department = 'sales' | 'warehouse'

type NavItem = {
  key: string
  label: string
  href: string
  icon: typeof GridIcon
}

const NAVIGATION: Record<Department, NavItem[]> = {
  sales: [
    { key: 'dashboard', label: 'Dashboard', href: '/sales/dashboard', icon: GridIcon },
    { key: 'orders', label: 'Client Orders', href: '/sales/orders', icon: CartIcon },
    { key: 'catalog', label: 'Product Catalog', href: '/sales/catalog', icon: PackageIcon },
    { key: 'deliveries', label: 'Delivery Monitoring', href: '/sales/deliveries', icon: BarChartIcon },
    { key: 'requests', label: 'Warehouse Requests', href: '/sales/requests', icon: InboxIcon },
    { key: 'receipts', label: 'Materials Received', href: '/sales/receipts', icon: DocumentIcon },
  ],
  warehouse: [
    { key: 'dashboard', label: 'Dashboard', href: '/warehouse/dashboard', icon: GridIcon },
    { key: 'requests', label: 'Requests & Releases', href: '/warehouse/requests', icon: InboxIcon },
    { key: 'inventory', label: 'Inventory & Stock', href: '/warehouse/inventory', icon: PackageIcon },
    { key: 'receipts', label: 'Release Receipts', href: '/warehouse/receipts', icon: DocumentIcon },
  ],
}

export default function DepartmentShell({
  department,
  name,
  children,
}: {
  department: Department
  name: string
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const title = department === 'sales' ? 'Sales' : 'Warehouse'
  const currentPath = pathname ?? ''

  async function logout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push(department === 'warehouse' ? '/warehouse' : '/admin/login')
    } finally {
      setLoggingOut(false)
    }
  }

  function isActive(href: string) {
    const p = pathname ?? ''
    if (href === `/${department}/dashboard`) return p === href || p === `/${department}`
    return p.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-[#2a3138] bg-[#0b0f10] text-gray-300 transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-[260px]'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          {collapsed ? (
            <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={36} height={36} className="mx-auto h-9 w-9 rounded-lg object-cover" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
                <div>
                  <div className="text-sm font-black leading-tight text-white tracking-wide">ELETTRO</div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-semibold">{title} Department</div>
                </div>
              </div>
              <button
                onClick={() => setCollapsed((c) => !c)}
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
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              ›
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAVIGATION[department].map((item) => {
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
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {<item.icon className="h-[18px] w-[18px]" />}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={logout}
            disabled={loggingOut}
            title={collapsed ? 'Logout' : undefined}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <LogoutIcon className="h-[18px] w-[18px]" />
            </span>
            {!collapsed && <span className="truncate">{loggingOut ? 'Signing out…' : 'Logout'}</span>}
          </button>
        </div>
      </aside>

      <div
        className="flex min-h-screen flex-col transition-all duration-300"
        style={{ marginLeft: collapsed ? 68 : 260 }}
      >
        <header className="border-b border-slate-800 bg-[#0b0f10] text-white">
          <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2">
            <Link href={`/${department}/dashboard`} className="flex items-center gap-2">
              <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={38} height={38} className="h-9 w-9 rounded-lg object-cover" />
              <span>
                <span className="block text-sm font-black tracking-wide">ELETTRO</span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{title} Department</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs font-semibold text-slate-300 sm:inline">{name}</span>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-50"
              >
                {loggingOut ? 'Signing out…' : 'Log out'}
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] font-medium text-slate-400">
          © {new Date().getFullYear()} ELETTRO Engineering Enterprises — {title} Portal
        </footer>
      </div>
    </div>
  )
}
