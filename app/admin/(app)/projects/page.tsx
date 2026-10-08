'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import SearchBar from '../../../../components/admin/SearchBar'
import EmptyState from '../../../../components/admin/EmptyState'
import ConfirmDialog from '../../../../components/admin/ConfirmDialog'
import { formatDate, statusProgress, STATUS_COLORS } from '../../../../components/admin/types'
import type { BookingStatusValue } from '../../../../components/admin/types'
import {
  HammerIcon,
  SearchIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  PauseIcon,
  FlagIcon,
  UsersIcon,
} from '../../../../components/admin/icons'

// A project row as returned by /api/dashboard (prisma.project.findMany with
// booking + assignments included). Everything rendered below comes from these
// real database records.
type ProjectRow = {
  id: string
  bookingId: string
  title: string
  description?: string | null
  status: BookingStatusValue
  startDate?: string | null
  endDate?: string | null
  createdAt?: string
  updatedAt?: string
  booking?: {
    id: string
    title?: string
    status?: BookingStatusValue
    startDate?: string | null
    endDate?: string | null
    budget?: number | null
    reports?: { progress?: number | null }[]
    client?: { id: string; name: string; email: string } | null
  } | null
  assignments?: { id: string; techId: string; tech?: { id: string; name: string } | null }[]
}

// Project statuses come straight from the BookingStatus enum in prisma/schema.prisma.
const PROJECT_STATUSES: BookingStatusValue[] = ['APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

type Filter = BookingStatusValue | 'ALL'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  ...PROJECT_STATUSES.map((s) => ({ value: s as Filter, label: STATUS_LABEL[s] })),
]

// Mirrors classifyService() in pages/api/dashboard.ts, which is the app's
// existing definition of a booking's service type (derived from the real title).
function classifyService(title: string): string {
  const t = (title || '').toLowerCase()
  if (t.includes('install')) return 'Installation'
  if (t.includes('mainten')) return 'Maintenance'
  if (t.includes('inspect')) return 'Inspection'
  if (t.includes('repair') || t.includes('fault') || t.includes('outage') || t.includes('short circuit')) return 'Repair'
  return 'Other'
}

const PAGE_SIZE = 8

// Real progress: the latest progress reported by the technician (Report.progress).
// Falls back to the same status-derived value the rest of the admin UI uses.
function projectProgress(p: ProjectRow): number {
  const reported = Math.max(0, ...(p.booking?.reports || []).map((r) => Number(r.progress || 0)))
  if (reported > 0) return Math.min(100, reported)
  return statusProgress(p.status)
}

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.PENDING
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${color}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export default function AdminProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [page, setPage] = useState(1)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ProjectRow | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to load projects')
      }
      const payload = await res.json()
      setProjects((payload.projects || []) as ProjectRow[])
    } catch (e: any) {
      setError(e.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  // Close the row action menu on any outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Real counts, derived from the loaded project records.
  const counts = useMemo(() => {
    const base: Record<string, number> = { total: projects.length, APPROVED: 0, ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 }
    for (const p of projects) {
      if (base[p.status] != null) base[p.status] += 1
    }
    return base
  }, [projects])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => {
      const matchesStatus = filter === 'ALL' || p.status === filter
      if (!matchesStatus) return false
      if (!q) return true
      const client = p.booking?.client?.name || ''
      const shortId = p.id.slice(0, 8)
      return (
        p.title.toLowerCase().includes(q) ||
        client.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        shortId.toLowerCase().includes(q) ||
        p.bookingId.toLowerCase().includes(q) ||
        shortId.toLowerCase().startsWith(q)
      )
    })
  }, [projects, query, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [query, filter])

  // /api/admin is the existing project endpoint. Admin may only change status
  // while the booking is APPROVED and no technicians are assigned, so the UI
  // hides the control in every other state.
  const statusEditable = (p: ProjectRow) =>
    p.status === 'APPROVED' && (p.assignments || []).length === 0

  async function runAction(action: string, row: ProjectRow, extra: Record<string, unknown> = {}) {
    setBusyId(row.id)
    setActionError('')
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, bookingId: row.bookingId, ...extra }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Action failed')
      setOpenMenu(null)
      await load()
    } catch (e: any) {
      setActionError(e.message || 'Action failed')
      setOpenMenu(null)
    } finally {
      setBusyId(null)
    }
  }

  const summaryCards = [
    { label: 'Total Projects', value: counts.total, icon: <HammerIcon className="h-4 w-4" />, accent: 'text-slate-900 bg-slate-100' },
    { label: 'Approved', value: counts.APPROVED, icon: <FlagIcon className="h-4 w-4" />, accent: 'text-blue-600 bg-blue-500/10' },
    { label: 'In Progress', value: counts.IN_PROGRESS, icon: <ClockIcon className="h-4 w-4" />, accent: 'text-yellow-600 bg-yellow-500/10' },
    { label: 'Completed', value: counts.COMPLETED, icon: <CheckCircleIcon className="h-4 w-4" />, accent: 'text-emerald-600 bg-emerald-500/10' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<HammerIcon className="h-5 w-5" />}
        title="Projects"
        subtitle="Manage and track all electrical projects from booking to completion."
      />

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
          ⚠ {actionError}
          <button onClick={() => setActionError('')} className="ml-3 font-black text-red-500 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Management counters — real database counts, no trend data. */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{card.label}</span>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.accent}`}>{card.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchBar value={query} onChange={setQuery} placeholder="Search projects…" />
        </div>
        <div className="relative w-full sm:w-44 sm:shrink-0">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            aria-label="Filter projects by status"
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">▾</span>
        </div>
        <button
          onClick={() => router.push('/admin/bookings')}
          title="Projects are created when an admin approves a booking"
          className="w-full shrink-0 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-sm transition-colors hover:bg-yellow-500 active:bg-yellow-600 disabled:opacity-60 sm:w-auto"
        >
          + New Project
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Main table */}
        <div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-black text-slate-900">Projects</h2>
              <span className="text-[11px] font-bold text-slate-400">
                {filtered.length} of {projects.length}
              </span>
            </div>

            {loading ? (
              <div className="space-y-2 p-5">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : error ? (
              <div className="p-5">
                <EmptyState icon="⚠️" title={error} message="Try refreshing the page." />
              </div>
            ) : pageRows.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<HammerIcon className="h-7 w-7" />}
                  title={projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
                  message={
                    projects.length === 0
                      ? 'Projects created from approved bookings will appear here.'
                      : 'Try adjusting the search term or status filter.'
                  }
                  action={
                    projects.length === 0 ? (
                      <button
                        onClick={() => router.push('/admin/bookings')}
                        className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-black transition-colors hover:bg-yellow-500"
                      >
                        + Create Project
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div ref={menuRef} className="w-full">
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-[42%] md:w-[32%] lg:w-[24%]" />
                    <col className="w-[35%] md:w-[25%] lg:w-[18%]" />
                    <col className="hidden md:table-column md:w-[12%] lg:w-[10%]" />
                    <col className="w-[15%] md:w-[17%] lg:w-[11%]" />
                    <col className="hidden lg:table-column lg:w-[13%]" />
                    <col className="hidden lg:table-column lg:w-[9%]" />
                    <col className="hidden lg:table-column lg:w-[9%]" />
                    <col className="w-[8%] md:w-[14%] lg:w-[6%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="px-2 py-3 font-bold sm:px-3">Project</th>
                      <th className="px-2 py-3 font-bold sm:px-3">Client</th>
                      <th className="hidden px-3 py-3 font-bold md:table-cell">Type</th>
                      <th className="px-2 py-3 font-bold sm:px-3">Status</th>
                      <th className="hidden px-3 py-3 font-bold lg:table-cell">Progress</th>
                      <th className="hidden px-3 py-3 font-bold lg:table-cell">Start</th>
                      <th className="hidden px-3 py-3 font-bold lg:table-cell">End</th>
                      <th className="px-2 py-3 text-right font-bold sm:px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((p) => {
                      const progress = projectProgress(p)
                      const client = p.booking?.client?.name || '—'
                      const techCount = (p.assignments || []).length
                      const detailHref = `/admin/projects/${p.bookingId}`
                      return (
                        <tr key={p.id} className="border-t border-slate-100 align-middle transition-colors hover:bg-yellow-50/40">
                          <td className="min-w-0 px-2 py-3 sm:px-3">
                            <Link href={detailHref} className="block break-words text-xs font-bold text-slate-800 hover:text-yellow-600">
                              {p.title}
                            </Link>
                            {(p.description || p.booking?.title) && (
                              <div className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
                                {(p.description || p.booking?.title || '').slice(0, 80)}
                              </div>
                            )}
                          </td>
                          <td className="min-w-0 px-2 py-3 text-xs font-medium text-slate-600 sm:px-3 sm:py-3.5">
                            <span className="block break-words">{client}</span>
                            {techCount > 0 && (
                              <span className="mt-0.5 block text-[10px] text-slate-400">
                                {techCount} technician{techCount === 1 ? '' : 's'}
                              </span>
                            )}
                          </td>
                          <td className="hidden px-3 py-3.5 text-xs font-medium text-slate-600 md:table-cell">{classifyService(p.title)}</td>
                          <td className="px-2 py-3 sm:px-3"><StatusPill status={p.status} /></td>
                          <td className="hidden px-3 py-3.5 lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full transition-all ${p.status === 'COMPLETED' ? 'bg-emerald-500' : p.status === 'CANCELLED' ? 'bg-slate-300' : 'bg-yellow-400'}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="w-8 shrink-0 text-right text-[11px] font-bold text-slate-600">{progress}%</span>
                            </div>
                          </td>
                          <td className="hidden whitespace-nowrap px-3 py-3.5 text-xs text-slate-500 lg:table-cell">{formatDate(p.startDate || p.booking?.startDate)}</td>
                          <td className="hidden whitespace-nowrap px-3 py-3.5 text-xs text-slate-500 lg:table-cell">{formatDate(p.endDate || p.booking?.endDate)}</td>
                          <td className="relative px-2 py-3 text-right sm:px-3 sm:py-3.5">
                            <button
                              onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                              disabled={busyId === p.id}
                              aria-label={`Actions for ${p.title}`}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:border-yellow-400 hover:text-yellow-600 active:bg-slate-50 disabled:opacity-50"
                            >
                              ⋯
                            </button>
                            {openMenu === p.id && (
                              <div className="absolute right-4 top-11 z-20 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-lg">
                                <Link href={detailHref} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                                  <SearchIcon className="h-3.5 w-3.5 text-slate-400" /> View Details
                                </Link>
                                <Link href={detailHref} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                                  <UsersIcon className="h-3.5 w-3.5 text-slate-400" /> Manage Team &amp; Dates
                                </Link>
                                <div className="border-t border-slate-100 px-3 py-2">
                                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Update Status
                                  </div>
                                  <select
                                    disabled={!statusEditable(p)}
                                    value={p.status}
                                    onChange={(e) => runAction('update_status', p, { status: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                                  >
                                    {PROJECT_STATUSES.map((s) => (
                                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                                    ))}
                                  </select>
                                  {!statusEditable(p) && (
                                    <p className="mt-1 text-[10px] leading-snug text-slate-400">
                                      {techCount > 0
                                        ? 'Status is managed by the assigned technicians.'
                                        : 'Status can only be changed while approved.'}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => { setOpenMenu(null); setConfirmDelete(p) }}
                                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                                >
                                  <PauseIcon className="h-3.5 w-3.5" /> Delete Project
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                <span className="text-[11px] font-medium text-slate-400">
                  Page {safePage} of {totalPages} · {filtered.length} project{filtered.length === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((n) => Math.max(1, n - 1))}
                    disabled={safePage <= 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-yellow-400 hover:text-yellow-600 active:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                    disabled={safePage >= totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-yellow-400 hover:text-yellow-600 active:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        danger
        title="Delete project"
        message={`This permanently deletes "${confirmDelete?.title}" together with its booking, reports and activity log. This cannot be undone.`}
        confirmLabel="Delete"
        busy={busyId === confirmDelete?.id}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return
          await runAction('delete_booking', confirmDelete)
          setConfirmDelete(null)
        }}
      />
    </div>
  )
}
