'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import SearchBar from '../../../../components/admin/SearchBar'
import FilterBar from '../../../../components/admin/FilterBar'
import StatusBadge from '../../../../components/admin/StatusBadge'
import EmptyState from '../../../../components/admin/EmptyState'
import { statusProgress, formatDate } from '../../../../components/admin/types'
import type { BookingObj } from '../../../../components/admin/types'

type Filter = 'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
]

const PROJECT_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']

export default function AdminProjectsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return }
          throw new Error('Failed to load projects')
        }
        const payload = await res.json()
        if (!cancelled) setBookings((payload.bookings || []).filter((b: BookingObj) => PROJECT_STATUSES.includes(b.status)))
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load projects')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  const visible = bookings.filter((b) => {
    const matchesFilter = filter === 'ALL' || b.status === filter
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || (b.title || '').toLowerCase().includes(q) || (b.client?.name || '').toLowerCase().includes(q)
    return matchesFilter && matchesQuery
  })

  return (
    <div className="space-y-6">
      <PageHeader
        icon="🛠️"
        title="Projects"
        subtitle={`${visible.length} active / completed projects from bookings`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Search projects…" />
        <FilterBar options={FILTERS} value={filter} onChange={(v) => setFilter(v)} />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title={error} message="Try refreshing the page." />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="🛠️"
          title="No projects yet"
          message="Projects are created automatically once a booking is assigned to a technician."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((b) => {
            const progress = statusProgress(b.status)
            return (
              <Link key={b.id} href={`/admin/projects/${b.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-lg hover:border-yellow-300 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{b.title}</h3>
                    <div className="mt-0.5 text-xs font-medium text-slate-400">
                      {b.client?.name || 'Client'} · {formatDate(b.startDate)} → {formatDate(b.endDate)}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">
                    👷 {b.assignedTo?.name || 'Unassigned'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {b.budget != null ? `$${Number(b.budget).toLocaleString()}` : '—'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}