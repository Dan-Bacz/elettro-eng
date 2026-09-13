'use client'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type TechShellProps = {
  user: { name: string; email: string; role: string; profileImageUrl?: string | null }
  children: ReactNode
}

export default function TechShell({ user, children }: TechShellProps) {
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      // ignore
    }
    router.push('/technician/login')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f10]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/technician/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400 text-black text-lg font-black">⚡</div>
            <div>
              <div className="text-sm font-black leading-tight text-white tracking-wide">ELETTRO</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-semibold">Technician</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profileImageUrl} alt={user.name} className="h-8 w-8 rounded-full object-cover border border-white/20" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-yellow-400 text-sm font-black">
                  {(user.name || 'T').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="text-xs font-black text-white leading-tight">{user.name}</div>
                <div className="text-[10px] text-gray-500 font-medium">Technician</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              {loggingOut ? '…' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] font-medium text-slate-400">
        © {new Date().getFullYear()} ELETTRO Engineering Enterprises — Technician Portal
      </footer>
    </div>
  )
}