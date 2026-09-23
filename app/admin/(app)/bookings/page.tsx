'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import SearchBar from '../../../../components/admin/SearchBar'
import FilterBar from '../../../../components/admin/FilterBar'
import StatusBadge from '../../../../components/admin/StatusBadge'
import EmptyState from '../../../../components/admin/EmptyState'
import type { BookingObj } from '../../../../components/admin/types'
import { formatDate } from '../../../../components/admin/types'

type Filter = 'PENDING' | 'ALL'

// Bookings are the incoming requests awaiting approval. Once approved they become
// projects (see the Projects section) and no longer appear here.
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Under Review' },
]

const BOOKINGS_LIST_STATUSES = ['PENDING']

export default function AdminBookingsPage() {
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
          throw new Error('Failed to load bookings')
        }
        const payload = await res.json()
        if (!cancelled) setBookings((payload.bookings || []).filter((b: BookingObj) => BOOKINGS_LIST_STATUSES.includes(b.status)))
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load bookings')
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
        icon="🧾"
        title="Bookings"
        subtitle={`${visible.length} of ${bookings.length} bookings`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by title or client…" />
        <FilterBar options={FILTERS} value={filter} onChange={(v) => setFilter(v)} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-200/70" />)}
        </div>
      ) : error ? (
        <EmptyState icon="⚠️" title={error} message="Try refreshing the page." />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="🧾"
          title={bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filters'}
          message={bookings.length === 0 ? 'New client bookings will appear here for approval.' : 'Try adjusting the search or filter.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5 font-bold">Booking</th>
                <th className="px-4 py-3.5 font-bold">Client</th>
                <th className="px-4 py-3.5 font-bold">Technician</th>
                <th className="px-4 py-3.5 font-bold">Status</th>
                <th className="px-4 py-3.5 font-bold">Dates</th>
                <th className="px-5 py-3.5 font-bold text-right">Budget</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-yellow-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/bookings/${b.id}`} className="text-xs font-bold text-slate-800 hover:text-yellow-600">
                      {b.title}
                    </Link>
                    {b.description && <div className="mt-0.5 line-clamp-1 max-w-[220px] text-[10px] text-slate-400">{b.description}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-slate-600">{b.client?.name || '—'}</td>
                  <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                    {b.assignedTo ? (
                      <Link href={`/admin/technicians/${b.assignedTo.id}`} className="text-slate-600 hover:text-yellow-600">
                        {b.assignedTo.name}
                      </Link>
                    ) : <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3.5"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {formatDate(b.startDate)}{b.endDate ? ` → ${formatDate(b.endDate)}` : ''}
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs font-bold text-slate-700">
                    {b.budget != null ? `$${Number(b.budget).toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}