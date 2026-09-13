'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

type AdminHeaderProps = {
  user: { name: string; email: string; role: string; profileImageUrl?: string | null }
  unreadCount: number
  onRefreshNotifications: () => Promise<void>
}

export default function AdminHeader({ user, unreadCount, onRefreshNotifications }: AdminHeaderProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loadingN, setLoadingN] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  const title = deriveTitle(pathname || '')

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setPanelOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function loadNotifications() {
    setLoadingN(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingN(false)
    }
  }

  async function togglePanel() {
    const next = !panelOpen
    setPanelOpen(next)
    if (next) await loadNotifications()
    else await onRefreshNotifications()
  }

  async function markRead(id?: string) {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { markAll: true })
      })
      if (res.ok) {
        await loadNotifications()
        await onRefreshNotifications()
      }
    } catch (e) {
      // ignore
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/admin/login')
    } catch (e) {
      router.push('/admin/login')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div>
        <h1 className="text-sm sm:text-base font-black text-slate-900">{title}</h1>
        <p className="hidden sm:block text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
          Elettro Engineering Enterprises
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={togglePanel}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Notifications"
          >
            <span className="text-lg leading-none">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-black text-black">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {panelOpen && (
            <div className="absolute right-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="text-sm font-black text-slate-900">Notifications</div>
                <button
                  onClick={() => markRead()}
                  className="text-[11px] font-bold text-yellow-600 hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loadingN && <div className="p-6 text-center text-xs text-slate-400">Loading…</div>}
                {!loadingN && notifications.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400">No notifications yet</div>
                )}
                {!loadingN &&
                  notifications.slice(0, 8).map((n) => (
                    <div key={n.id} className={`border-b border-slate-50 px-4 py-3 ${n.read ? 'opacity-60' : 'bg-yellow-50/40'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-bold text-slate-800">{n.title}</div>
                        {!n.read && (
                          <button onClick={() => markRead(n.id)} className="text-[10px] font-bold text-yellow-600 hover:underline shrink-0">
                            Mark read
                          </button>
                        )}
                      </div>
                      {n.message && <div className="mt-1 text-xs text-slate-500">{n.message}</div>}
                      <div className="mt-1 text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleString()}
                        {n.link && (
                          <Link href={n.link} className="ml-2 font-bold text-yellow-700 hover:underline">
                            Open →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="border-t border-slate-100 p-2">
                <Link href="/admin/notifications" onClick={() => setPanelOpen(false)} className="block text-center text-xs font-bold text-slate-600 hover:text-yellow-600 py-1.5">
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Admin profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profileImageUrl} alt={user.name} className="h-9 w-9 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-yellow-400 text-sm font-black">
              {(user.name || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="hidden md:block">
            <div className="text-xs font-black text-slate-900 leading-tight">{user.name}</div>
            <div className="text-[10px] text-slate-400 font-medium">Administrator</div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 transition-colors"
          >
            {loggingOut ? '…' : 'Logout'}
          </button>
        </div>
      </div>
    </header>
  )
}

function deriveTitle(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)
  const last = seg[seg.length - 1] || 'dashboard'
  if (last === 'new') return 'New Item'
  if (last === 'edit') return 'Edit Item'
  if (/^[a-f0-9-]{36}$/i.test(last)) return 'Details'
  if (!/^[a-f0-9-]{36}$/i.test(last)) {
    const map: Record<string, string> = {
      dashboard: 'Dashboard', bookings: 'Bookings', projects: 'Projects', registrations: 'Registrations',
      inventory: 'Inventory', technicians: 'Technicians', clients: 'Clients', reports: 'Reports',
      notifications: 'Notifications', settings: 'Settings'
    }
    if (map[last]) return map[last]
  }
  return 'Dashboard'
}