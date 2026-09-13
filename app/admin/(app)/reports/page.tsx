'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import SearchBar from '../../../../components/admin/SearchBar'
import EmptyState from '../../../../components/admin/EmptyState'
import StatusBadge from '../../../../components/admin/StatusBadge'
import { formatDateTime } from '../../../../components/admin/types'

type ReportItem = {
  id: string
  author?: { id: string; name: string; email: string; role?: string }
  booking?: { id: string; title: string; status: string }
  content: string
  createdAt: string
}

type ActivityItem = {
  id: string
  tech?: { id: string; name: string; email: string }
  booking?: { id: string; title: string; status: string }
  message: string
  createdAt: string
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<ReportItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/reports')
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return }
          throw new Error('Failed to load reports')
        }
        const payload = await res.json()
        if (!cancelled) {
          setReports(payload.reports || [])
          setActivities(payload.activities || [])
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load reports')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  const filteredReports = reports.filter((r) => {
    const q = query.trim().toLowerCase()
    return !q || (r.content || '').toLowerCase().includes(q) || (r.booking?.title || '').toLowerCase().includes(q) || (r.author?.name || '').toLowerCase().includes(q)
  })

  const filteredActivities = activities.filter((a) => {
    const q = query.trim().toLowerCase()
    return !q || (a.message || '').toLowerCase().includes(q) || (a.booking?.title || '').toLowerCase().includes(q) || (a.tech?.name || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <PageHeader icon="📊" title="Reports & Activity" subtitle="Job reports written by technicians and admins" />

      <SearchBar value={query} onChange={setQuery} placeholder="Search reports and activity…" />

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title={error} message="Try refreshing the page." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Reports */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Reports ({filteredReports.length})</h2>
            {filteredReports.length === 0 ? (
              <EmptyState icon="📄" title="No reports yet" message="Reports created against bookings will appear here." />
            ) : (
              <div className="mt-3 space-y-3">
                {filteredReports.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                      {r.booking ? (
                        <Link href={`/admin/bookings/${r.booking.id}`} className="text-xs font-bold text-slate-800 hover:text-yellow-600">{r.booking.title}</Link>
                      ) : <span className="text-xs text-slate-400">—</span>}
                      {r.booking?.status && <StatusBadge status={r.booking.status} />}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{r.content}</p>
                    <div className="mt-2 text-[10px] text-slate-400">
                      {r.author?.name || 'Unknown'} · {formatDateTime(r.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Technician Activity ({filteredActivities.length})</h2>
            {filteredActivities.length === 0 ? (
              <EmptyState icon="📋" title="No activity yet" message="Technician updates will show up here." />
            ) : (
              <div className="mt-3 space-y-3">
                {filteredActivities.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                      {a.booking ? (
                        <Link href={`/admin/bookings/${a.booking.id}`} className="text-xs font-bold text-slate-800 hover:text-yellow-600">{a.booking.title}</Link>
                      ) : <span className="text-xs text-slate-400">—</span>}
                      {a.booking?.status && <StatusBadge status={a.booking.status} />}
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{a.message}</p>
                    <div className="mt-2 text-[10px] text-slate-400">
                      🛠️ {a.tech?.name || 'Technician'} · {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}