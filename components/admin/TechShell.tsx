'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TechnicianSidebar from './TechnicianSidebar'
import { BellIcon } from './icons'

type TechShellProps = {
  user: { name: string; email: string; role: string; profileImageUrl?: string | null }
  children: ReactNode
}

export default function TechShell({ user, children }: TechShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      // Continue to the native login shell when this is an Android WebView.
    }
    if (navigator.userAgent.includes('ElettroAndroid')) {
      window.location.href = 'elettro://logout'
      return
    }
    router.push('/technician/login')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <TechnicianSidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className={`flex min-h-screen flex-col transition-all duration-300 ${collapsed ? 'md:ml-[68px]' : 'md:ml-[260px]'}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#2a3138] bg-[#0b0f10] px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setMobileOpen(true)} aria-label="Open technician navigation" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2a3138] text-xl text-[#a7b1bc] transition hover:bg-[#141a1f] hover:text-white md:hidden">☰</button>
            <Link href="/technician/dashboard" className="hidden min-w-0 items-center gap-2 sm:flex">
              <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
              <div className="min-w-0">
                <div className="text-sm font-black leading-tight tracking-wide text-white">ELETTRO</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-500">Engineering Technician</div>
              </div>
            </Link>
          </div>

          <div className="pointer-events-none absolute left-1/2 max-w-[44vw] -translate-x-1/2 truncate text-center text-[10px] font-black uppercase tracking-[0.14em] text-[#f5f7fa] sm:text-sm sm:tracking-[0.22em]">
            <span className="sm:hidden">TECHNICIAN PORTAL</span>
            <span className="hidden sm:inline">Elettro Engineering Enterprises</span>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button aria-label="Notifications" onClick={() => router.push('/technician/dashboard#notifications')} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#2a3138] bg-[#0b0f10] text-[#a7b1bc] transition hover:bg-[#141a1f] hover:text-white"><BellIcon className="h-5 w-5" /></button>
            <div className="flex items-center gap-2 sm:gap-3">
              {user.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profileImageUrl} alt={user.name} className="h-9 w-9 rounded-full border border-[#2a3138] object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5c400] text-sm font-black text-black">{(user.name || 'T').charAt(0).toUpperCase()}</div>
              )}
              <div className="hidden md:block">
                <div className="max-w-[180px] truncate text-xs font-black leading-tight text-[#f5f7fa]">{user.name}</div>
                <div className="text-[10px] font-medium text-[#77848f]">Technician</div>
              </div>
              <button onClick={handleLogout} disabled={loggingOut} className="rounded-lg border border-[#2a3138] px-2.5 py-1.5 text-xs font-bold text-[#a7b1bc] transition hover:bg-red-950/50 hover:text-red-400">{loggingOut ? '…' : 'Logout'}</button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-[11px] font-medium text-slate-400">© {new Date().getFullYear()} ELETTRO Engineering Enterprises — Technician Panel</footer>
      </div>
    </div>
  )
}
