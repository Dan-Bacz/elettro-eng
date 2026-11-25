'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GearIcon, GridIcon, LogoutIcon, PackageIcon, UserIcon } from './icons'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: GridIcon, href: '/rider/dashboard' },
  { key: 'deliveries', label: 'My Deliveries', icon: PackageIcon, href: '/rider/dashboard#deliveries' },
  { key: 'profile', label: 'Profile', icon: UserIcon, href: '/rider/dashboard#profile' },
  { key: 'settings', label: 'Settings', icon: GearIcon, href: '/rider/dashboard#settings' },
]

type Props = { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onClose: () => void }

export default function RiderSidebar({ collapsed, onToggle, mobileOpen, onClose }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [hash, setHash] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sync = () => setHash(window.location.hash.replace('#', ''))
      sync()
      window.addEventListener('hashchange', sync)
      return () => window.removeEventListener('hashchange', sync)
    }
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* Continue to login */ }
    if (navigator.userAgent.includes('ElettroAndroid')) { window.location.href = 'elettro://logout'; return }
    router.push('/rider/login')
  }

  return <>
    {mobileOpen && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/45 md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-[#2a3138] bg-[#0b0f10] text-gray-300 shadow-2xl transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[260px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {collapsed ? <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={36} height={36} className="mx-auto h-9 w-9 rounded-lg object-cover" /> : <>
          <div className="flex min-w-0 items-center gap-2"><Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg object-cover" /><div className="min-w-0"><div className="text-sm font-black leading-tight tracking-wide text-white">ELETTRO</div><div className="truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-500">Engineering Rider</div></div></div>
          <button onClick={onToggle} title="Collapse sidebar" className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-white/10 hover:text-white">‹</button>
        </>}
      </div>
      {collapsed && <div className="flex justify-center border-b border-white/10 py-2"><button onClick={onToggle} title="Expand sidebar" className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white">›</button></div>}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => { const active = pathname === '/rider/dashboard' && (item.key === 'dashboard' ? !hash || hash === 'dashboard' : hash === item.key); return <Link key={item.key} href={item.href} onClick={onClose} title={collapsed ? item.label : undefined} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><span className="flex h-5 w-5 shrink-0 items-center justify-center"><item.icon className="h-[18px] w-[18px]" /></span>{!collapsed && <span className="truncate">{item.label}</span>}</Link> })}
      </nav>
      <div className="border-t border-white/10 p-3"><button onClick={handleLogout} disabled={loggingOut} title={collapsed ? 'Logout' : undefined} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-400 transition hover:bg-red-500/10 hover:text-red-400"><span className="flex h-5 w-5 shrink-0 items-center justify-center"><LogoutIcon className="h-[18px] w-[18px]" /></span>{!collapsed && <span className="truncate">{loggingOut ? 'Signing out…' : 'Logout'}</span>}</button></div>
    </aside>
  </>
}
