'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
const STATUS_ROWS = [
  { value: 'PENDING', label: 'Under Review', tone: 'bg-amber-500' },
  { value: 'APPROVED', label: 'Approved', tone: 'bg-blue-500' },
  { value: 'ASSIGNED', label: 'Assigned', tone: 'bg-emerald-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', tone: 'bg-violet-500' },
  { value: 'COMPLETED', label: 'Completed', tone: 'bg-slate-500' },
  { value: 'CANCELLED', label: 'Cancelled', tone: 'bg-rose-500' },
]

function readRequestDetails(description?: string | null) {
  const details: Record<string, string> = {}
  const notes: string[] = []
  const labels: Record<string, string> = {
    'Selected offerings': 'offerings',
    'Building type': 'buildingType',
    Location: 'location',
    'Preferred date': 'preferredDate',
    'Preferred time': 'preferredTime',
    Attachment: 'attachment',
  }

  for (const rawLine of (description || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    const separator = line.indexOf(':')
    const label = separator >= 0 ? line.slice(0, separator).trim() : ''
    const value = separator >= 0 ? line.slice(separator + 1).trim() : ''
    const key = labels[label]

    if (key && value) details[key] = value
    else if (label.startsWith('Client ')) continue
    else if (line) notes.push(line)
  }

  return { ...details, notes: notes.join('\n') } as {
    offerings?: string
    buildingType?: string
    location?: string
    preferredDate?: string
    preferredTime?: string
    attachment?: string
    notes: string
  }
}

export default function AdminBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [totalBookings, setTotalBookings] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

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
        if (!cancelled) {
          setBookings((payload.bookings || []).filter((b: BookingObj) => BOOKINGS_LIST_STATUSES.includes(b.status)))
          setTotalBookings(Number(payload.stats?.totalBookings ?? payload.bookings?.length ?? 0))
          setStatusCounts(Object.fromEntries(
            (payload.statusBreakdown || []).map((row: { status: string; value: number }) => [row.status, Number(row.value || 0)])
          ))
        }
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-yellow-300 bg-yellow-100 text-slate-900">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="5" width="16" height="15" rx="2" />
              <path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Bookings</h1>
            <p className="mt-0.5 text-xs text-slate-500">Review client requests and manage the booking lifecycle.</p>
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-500"><span className="text-lg font-black text-slate-900">{totalBookings}</span> bookings</div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section aria-label="Client booking requests" className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search bookings by client or service</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by client or service..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-slate-400 hover:text-slate-700">×</button>
              )}
            </label>
            <div className="max-w-full overflow-x-auto pb-1 sm:pb-0">
              <div className="w-max">
                <FilterBar options={FILTERS} value={filter} onChange={(value) => setFilter(value as Filter)} />
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-sm font-black text-slate-900">Incoming Requests</h2>
              <p className="mt-0.5 text-xs text-slate-500">Client-submitted bookings awaiting review</p>
            </div>
            <span className="tabular-nums text-xs font-bold text-slate-500">{loading ? '—' : `${visible.length} shown`}</span>
          </div>

          {loading ? (
            <div className="space-y-3" aria-label="Loading bookings">
              {[...Array(3)].map((_, index) => <div key={index} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
            </div>
          ) : error ? (
            <EmptyState icon="⚠️" title={error} message="Try refreshing the page." />
          ) : visible.length === 0 ? (
            <EmptyState
              icon="🧾"
              title={bookings.length === 0 ? 'No client bookings yet' : 'No bookings match your search'}
              message={bookings.length === 0 ? 'Client booking requests will appear here when submitted.' : 'Try another client name or service.'}
            />
          ) : (
            <div className="space-y-3">
              {visible.map((booking) => {
                const details = readRequestDetails(booking.description)
                return (
                  <article key={booking.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
                    <div className="border-l-4 border-yellow-400 px-4 py-4 sm:px-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Service</p>
                          <h3 className="mt-0.5 break-words text-base font-extrabold text-slate-900">{booking.title}</h3>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-sm font-bold text-slate-800">{booking.client?.name || 'Client'}</span>
                        <span className="text-xs text-slate-400">Booking #{booking.id}</span>
                      </div>

                      <div className="mt-3 grid gap-x-5 gap-y-2 text-xs text-slate-600 sm:grid-cols-2">
                        <div className="flex min-w-0 gap-2">
                          <span className="shrink-0 text-slate-400">Date</span>
                          <span className="font-medium">{details.preferredDate || formatDate(booking.startDate || booking.createdAt)}</span>
                          {details.preferredTime && <span className="font-medium">· {details.preferredTime}</span>}
                        </div>
                        {details.location && <div className="min-w-0 break-words"><span className="mr-2 text-slate-400">Location</span><span className="font-medium">{details.location}</span></div>}
                        {details.offerings && <div className="min-w-0 break-words sm:col-span-2"><span className="mr-2 text-slate-400">Selected offering</span><span className="font-medium">{details.offerings}</span></div>}
                        {booking.assignedTo && <div className="min-w-0"><span className="mr-2 text-slate-400">Technician</span><span className="font-medium">{booking.assignedTo.name}</span></div>}
                      </div>

                      {details.notes && <p className="mt-3 line-clamp-2 whitespace-pre-line break-words text-xs leading-relaxed text-slate-500">{details.notes}</p>}

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[11px] text-slate-400">Submitted {formatDate(booking.createdAt)}</span>
                        <Link href={`/admin/bookings/${booking.id}`} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-yellow-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2">
                          View Details <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <aside aria-label="Booking status summary" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
          <h2 className="text-sm font-black text-slate-900">Booking Status</h2>
          <p className="mt-1 text-xs text-slate-500">Current request counts</p>
          <dl className="mt-4 divide-y divide-slate-100">
            {STATUS_ROWS.map((row) => (
              <div key={row.value} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span className={`h-2 w-2 rounded-full ${row.tone}`} />{row.label}
                </dt>
                <dd className="tabular-nums text-sm font-extrabold text-slate-900">{statusCounts[row.value] ?? 0}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
            Approved requests continue in Projects for technician assignment and progress tracking.
          </p>
        </aside>
      </div>
    </div>
  )
}