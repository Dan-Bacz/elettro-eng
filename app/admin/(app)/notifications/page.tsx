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

export default function AdminNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) {
        if (res.status === 401) { router.push('/admin/login'); return }
        throw new Error('Failed to load notifications')
      }
      const payload = await res.json()
      setNotifications(payload.notifications || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [router])

  async function markAll() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      await load()
    } catch (e) {
      // ignore
    }
  }

  async function markOne(id: string) {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await load()
    } catch (e) {
      // ignore
    }
  }

  async function remove(id: string) {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await load()
    } catch (e) {
      // ignore
    }
  }

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon="🔔"
        title="Notifications"
        subtitle={`${unread} unread of ${notifications.length}`}
        actions={
          unread > 0 ? (
            <button onClick={markAll} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-700 transition-colors">
              Mark all read
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title={error} message="Try refreshing the page." />
      ) : notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" message="You are all caught up!" />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className={`rounded-2xl border p-4 ${n.read ? 'border-slate-200 bg-white' : 'border-yellow-300 bg-yellow-50/50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{n.type === 'ASSIGNMENT' ? '🛠️' : n.type === 'ACCOUNT' ? '👤' : n.type === 'REGISTRATION' ? '📋' : 'ℹ️'}</span>
                    <span className="text-sm font-black text-slate-900">{n.title}</span>
                    {!n.read && <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[9px] font-black text-black">NEW</span>}
                  </div>
                  {n.message && <p className="mt-1 text-xs text-slate-600">{n.message}</p>}
                  <div className="mt-2 text-[10px] font-medium text-slate-400">{formatDateTime(n.createdAt)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {n.link && !n.read && (
                    <Link href={n.link} onClick={() => markOne(n.id)} className="rounded-lg bg-black px-3 py-1.5 text-[11px] font-bold text-yellow-400 hover:bg-slate-800 transition-colors">
                      Open →
                    </Link>
                  )}
                  {n.link && n.read && (
                    <Link href={n.link} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-yellow-700 transition-colors">
                      Open →
                    </Link>
                  )}
                  {!n.read && (
                    <button onClick={() => markOne(n.id)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:text-yellow-700 transition-colors">
                      Mark read
                    </button>
                  )}
                  <button onClick={() => remove(n.id)} className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}