'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

type Department = 'sales' | 'warehouse'

const NAVIGATION: Record<Department, { label: string; href: string }[]> = {
  sales: [
    { label: 'Dashboard', href: '/sales/dashboard' },
    { label: 'Warehouse Requests', href: '/sales/requests' },
    { label: 'Release Receipts', href: '/sales/receipts' },
  ],
  warehouse: [
    { label: 'Dashboard', href: '/warehouse/dashboard' },
    { label: 'Requests & Releases', href: '/warehouse/requests' },
    { label: 'Inventory & Stock', href: '/warehouse/inventory' },
    { label: 'Receipts', href: '/warehouse/receipts' },
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
  const [loggingOut, setLoggingOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const title = department === 'sales' ? 'Sales' : 'Warehouse'
  const currentPath = pathname ?? ''

  async function logout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/admin/login')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
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
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2">
          {NAVIGATION[department].map((item) => {
            const active = currentPath === item.href || (item.href !== `/${department}/dashboard` && currentPath.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  active ? 'bg-yellow-400 text-black' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] font-medium text-slate-400">
        © {new Date().getFullYear()} ELETTRO Engineering Enterprises — {title} Portal
      </footer>
    </div>
  )
}
