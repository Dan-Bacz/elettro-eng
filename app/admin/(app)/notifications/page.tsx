'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import EmptyState from '../../../../components/admin/EmptyState'
import { formatDateTime } from '../../../../components/admin/types'

type NotificationItem = {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read: boolean
  createdAt: string
}

type ViewFilter = 'ALL' | 'UNREAD' | 'READ'

const iconFor = (type: string) => {
  switch (type) {
    case 'ASSIGNMENT': return '🛠️'
    case 'ACCOUNT': return '👤'
    case 'REGISTRATION': return '📋'
    case 'ORDER': return '🛒'
    case 'BOOKING': return '📅'
    case 'REPORT': return '📊'
    case 'INVENTORY': return '📦'
    case 'WARNING': return '⚠️'
    default: return '🔔'
  }
}

const toneFor = (type: string) => {
  switch (type) {
    case 'WARNING': return 'bg-red-100 text-red-700 ring-red-200'
    case 'ORDER': return 'bg-violet-100 text-violet-700 ring-violet-200'
    case 'INVENTORY': return 'bg-cyan-100 text-cyan-700 ring-cyan-200'
    case 'REPORT': return 'bg-emerald-100 text-emerald-700 ring-emerald-200'
    default: return 'bg-amber-100 text-amber-700 ring-amber-200'
  }
}

export default function AdminNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<ViewFilter>('ALL')

  async function load() {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) {
        if (res.status === 401) { router.push('/admin/login'); return }
        throw new Error('Failed to load notifications')
      }
      const payload = await res.json()
      setNotifications(payload.notifications || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [router])

  async function markAll() {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) })
      await load()
    } catch {
      setError('Could not mark notifications as read.')
    }
  }

  async function markOne(id: string) {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      await load()
    } catch {
      setError('Could not update notification.')
    }
  }

  async function remove(id: string) {
    try {
      await fetch('/api/notifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      await load()
    } catch {
      setError('Could not delete notification.')
    }
  }

  const unread = notifications.filter(notification => !notification.read).length
  const visibleNotifications = notifications.filter(notification => view === 'ALL' || (view === 'UNREAD' ? !notification.read : notification.read))

  return (
    <div className="space-y-6">
      <div className="hidden"><PageHeader icon="🔔" title="Notifications" subtitle={`${unread} unread of ${notifications.length}`} /></div>

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#122b35] to-[#08727f] p-6 text-white shadow-[0_28px_60px_-30px_rgba(15,23,42,0.85)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" /><div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.9)]" /> Admin inbox</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Notifications</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Stay on top of registrations, orders, project updates, reports, and important system activity.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-wider text-slate-300">Total</p><p className="mt-2 text-2xl font-black">{notifications.length}</p><p className="mt-1 text-[10px] text-slate-400">All alerts</p></div><div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-wider text-amber-100">Unread</p><p className="mt-2 text-2xl font-black text-amber-200">{unread}</p><p className="mt-1 text-[10px] text-amber-100/60">Needs attention</p></div><div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Read</p><p className="mt-2 text-2xl font-black text-emerald-200">{notifications.length - unread}</p><p className="mt-1 text-[10px] text-emerald-100/60">Reviewed alerts</p></div></div></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Activity center</p><h2 className="mt-1 text-lg font-black text-slate-950">Your notification stream</h2></div><div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl bg-slate-100 p-1">{(['ALL', 'UNREAD', 'READ'] as const).map(option => <button key={option} type="button" onClick={() => setView(option)} className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${view === option ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{option === 'ALL' ? `All ${notifications.length}` : option === 'UNREAD' ? `Unread ${unread}` : `Read ${notifications.length - unread}`}</button>)}</div>{unread > 0 && <button type="button" onClick={() => void markAll()} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-[10px] font-black text-cyan-800 transition hover:bg-cyan-100">Mark all read</button>}</div></div></section>

      {loading ? <div className="space-y-3">{[1, 2, 3, 4].map(item => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />)}</div> : error ? <EmptyState icon="⚠️" title={error} message="Try refreshing the page." /> : notifications.length === 0 ? <EmptyState icon="🔔" title="No notifications" message="You are all caught up!" /> : visibleNotifications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><div className="text-3xl">✨</div><h2 className="mt-3 text-sm font-black text-slate-900">Nothing in this view</h2><p className="mt-1 text-xs text-slate-500">Try another filter to see more notifications.</p></div> : <div className="space-y-3">{visibleNotifications.map(notification => <article key={notification.id} className={`group relative overflow-hidden rounded-2xl border p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,.7)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-25px_rgba(15,23,42,.55)] sm:p-5 ${notification.read ? 'border-slate-200 bg-white' : 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-white'}`}><div className={`absolute inset-y-0 left-0 w-1 ${notification.read ? 'bg-slate-200' : 'bg-amber-400'}`} /><div className="flex flex-col gap-4 pl-2 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg ring-4 ${toneFor(notification.type)}`}>{iconFor(notification.type)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-slate-950">{notification.title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">{notification.type}</span>{!notification.read && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950">NEW</span>}</div>{notification.message && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{notification.message}</p>}<div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" />{formatDateTime(notification.createdAt)}</div></div></div><div className="flex shrink-0 items-center gap-2 pl-14 sm:pl-0">{notification.link && <Link href={notification.link} onClick={() => { if (!notification.read) void markOne(notification.id) }} className={`rounded-xl px-3 py-2 text-[10px] font-black transition hover:-translate-y-0.5 ${notification.read ? 'border border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700' : 'bg-slate-950 text-amber-300 hover:bg-cyan-900'}`}>Open <span className="ml-1">→</span></Link>}{!notification.read && <button type="button" onClick={() => void markOne(notification.id)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700">Mark read</button>}<button type="button" onClick={() => void remove(notification.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-red-200 bg-white text-sm font-black text-red-500 transition hover:bg-red-50" title="Delete notification" aria-label="Delete notification">×</button></div></div></article>)}</div>}
    </div>
  )
}
