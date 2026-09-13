'use client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import StatusBadge from '../../../components/admin/StatusBadge'
import EmptyState from '../../../components/admin/EmptyState'
import type { BookingObj, UserObj } from '../../../components/admin/types'
import { formatDate, formatDateTime } from '../../../components/admin/types'

type TechPayload = {
  tech: UserObj
  bookings: BookingObj[]
}

const TECH_UPDATE_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export default function TechnicianDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<TechPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activityMsg, setActivityMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/tech')
      if (!res.ok) {
        if (res.status === 401) { router.push('/technician/login'); return }
        throw new Error('Failed to load your jobs')
      }
      const payload = await res.json()
      setData(payload)
      setError('')
    } catch (e: any) {
      setError(e.message || 'Failed to load your jobs')
    } finally {
      setLoading(false)
    }
  }

  const loadCb = useCallback(load, [router])
  useEffect(() => { loadCb() }, [loadCb])

  async function postActivity(bookingId: string) {
    if (!data?.tech || !activityMsg.trim()) return
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch('/api/tech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techId: data.tech.id, bookingId, message: activityMsg.trim() }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to post update')
      }
      setActivityMsg('')
      setNotice('Progress update posted.')
      await loadCb()
    } catch (e: any) {
      setNotice(e.message || 'Failed to post update')
    } finally {
      setBusy(false)
    }
  }

  async function updateStatus(bookingId: string, status: string) {
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', bookingId, status }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to update status')
      }
      setNotice(`Job status updated to ${status}.`)
      await loadCb()
    } catch (e: any) {
      setNotice(e.message || 'Failed to update status')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />)}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        icon="⚠️"
        title={error || 'No data'}
        message="Try refreshing the page."
        action={<button onClick={() => router.refresh()} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black">Refresh</button>}
      />
    )
  }

  const active = data.bookings.filter((b) => ['ASSIGNED', 'IN_PROGRESS'].includes(b.status))
  const completed = data.bookings.filter((b) => b.status === 'COMPLETED')
  const pending = data.bookings.filter((b) => b.status === 'APPROVED')

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-black text-slate-900">Welcome, {data.tech.name.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.tech.specialization ? `${data.tech.specialization} · ` : ''}You have {active.length} active job{active.length === 1 ? '' : 's'}.
        </p>
      </div>

      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${notice.toLowerCase().includes('fail') ? 'border-red-200 bg-red-50 text-red-600' : 'border-emerald-200 bg-emerald-50 text-emerald-600'}`}>
          {notice}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-black text-slate-900">{data.bookings.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total Assigned</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-black text-yellow-600">{active.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">In Progress</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-black text-emerald-600">{completed.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Completed</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-2xl font-black text-slate-900">{pending.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assigned Jobs</div>
        </div>
      </div>

      {/* Bookings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-black text-slate-900">My Jobs ({data.bookings.length})</h2>

        {data.bookings.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon="🧾" title="No jobs assigned yet" message="When the admin assigns a job to you, it will appear here." />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {data.bookings.map((b) => {
              const isOpen = expanded === b.id
              return (
                <div key={b.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : b.id)}
                    className="flex w-full flex-col gap-3 p-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900">{b.title}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {b.client?.name || 'Client'} · {formatDate(b.startDate)} → {formatDate(b.endDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <span className="font-bold text-slate-700">{b.budget != null ? `$${Number(b.budget).toLocaleString()}` : '—'}</span>
                      <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-4">
                      {/* Description */}
                      {b.description && <p className="rounded-xl bg-white p-3 text-xs text-slate-600">{b.description}</p>}

                      {/* Status update */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Update status:</span>
                        {TECH_UPDATE_STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(b.id, s)}
                            disabled={busy || b.status === s}
                            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors disabled:opacity-40 ${
                              b.status === s
                                ? 'bg-black text-yellow-400'
                                : 'border border-slate-200 bg-white text-slate-500 hover:border-yellow-400 hover:text-yellow-700'
                            }`}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

                      {/* Add progress update */}
                      <div className="flex gap-2">
                        <input
                          value={activityMsg}
                          onChange={(e) => setActivityMsg(e.target.value)}
                          placeholder="Post a progress update…"
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                        <button
                          onClick={() => postActivity(b.id)}
                          disabled={busy || !activityMsg.trim()}
                          className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-yellow-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          {busy ? '…' : 'Post'}
                        </button>
                      </div>

                      {/* Activity timeline */}
                      <div className="space-y-2">
                        {(b.technicianActivities || []).length === 0 && (
                          <div className="rounded-xl bg-white p-3 text-xs text-slate-400">No updates posted yet.</div>
                        )}
                        {(b.technicianActivities || []).map((a) => (
                          <div key={a.id} className="relative pl-4">
                            <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-yellow-400" />
                            <div className="rounded-xl bg-white p-3">
                              <div className="text-xs font-bold text-slate-800">{a.message}</div>
                              <div className="mt-1 text-[10px] text-slate-400">{formatDateTime(a.createdAt)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}