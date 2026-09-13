'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import SearchBar from '../../../../components/admin/SearchBar'
import FilterBar from '../../../../components/admin/FilterBar'
import StatusBadge from '../../../../components/admin/StatusBadge'
import EmptyState from '../../../../components/admin/EmptyState'
import ConfirmDialog from '../../../../components/admin/ConfirmDialog'
import type { UserObj, UserStatus } from '../../../../components/admin/types'
import { formatDate } from '../../../../components/admin/types'

type Filter = UserStatus | 'ALL'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

export default function AdminRegistrationsPage() {
  const router = useRouter()
  const [registrations, setRegistrations] = useState<UserObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('PENDING')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showReject, setShowReject] = useState<UserObj | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/admin')
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return }
          throw new Error('Failed to load registrations')
        }
        const payload = await res.json()
        if (!cancelled) setRegistrations(payload.registrations || [])
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load registrations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  async function act(userId: string, action: string, extra: Record<string, any> = {}) {
    setBusyId(userId)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, ...extra }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Action failed')
      }
      setShowReject(null)
      setRejectReason('')
      const up = await fetch('/api/admin')
      if (up.ok) setRegistrations((await up.json()).registrations || [])
    } catch (e: any) {
      setError(e.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  function effectiveStatus(u: UserObj): string {
    return u.status || (u.approved ? 'ACTIVE' : 'PENDING')
  }

  const visible = registrations
    .map((u) => ({ ...u, __status: effectiveStatus(u) }))
    .filter((u: any) => {
      const matchesFilter = filter === 'ALL' || u.__status === filter
      const q = query.trim().toLowerCase()
      const matchesQuery = !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.specialization || '').toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })

  return (
    <div className="space-y-6">
      <PageHeader
        icon="📋"
        title="Registrations"
        subtitle={`${registrations.filter((u) => effectiveStatus(u) === 'PENDING').length} technician applications pending review`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Search technicians…" />
        <FilterBar options={FILTERS} value={filter} onChange={(v) => setFilter(v)} />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="📋"
          title={filter === 'PENDING' ? 'No pending registrations' : 'No registrations match your filters'}
          message={filter === 'PENDING' ? 'New technician applications will appear here.' : 'Try adjusting the filter or search.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5 font-bold">Technician</th>
                <th className="px-4 py-3.5 font-bold">Specialization</th>
                <th className="px-4 py-3.5 font-bold">Experience</th>
                <th className="px-4 py-3.5 font-bold">Status</th>
                <th className="px-4 py-3.5 font-bold">Applied</th>
                {filter === 'PENDING' ? (
                  <th className="px-5 py-3.5 font-bold text-right">Review</th>
                ) : (
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(visible as any[]).map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-yellow-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/registrations/${u.id}`} className="flex items-center gap-3">
                      {u.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.profileImageUrl} alt={u.name} className="h-9 w-9 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-yellow-400 text-xs font-black">{u.name?.charAt(0)?.toUpperCase() || 'T'}</div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-slate-800 hover:text-yellow-600">{u.name}</div>
                        <div className="truncate text-[10px] text-slate-400">{u.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-slate-600">{u.specialization || '—'}</td>
                  <td className="px-4 py-3.5 text-xs font-medium text-slate-600">{u.yearsOfExperience != null ? `${u.yearsOfExperience} yrs` : '—'}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={u.__status} /></td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    {u.__status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => act(u.id, 'approve_user')}
                          disabled={busyId === u.id}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                          {busyId === u.id ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => setShowReject(u)}
                          disabled={busyId === u.id}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {u.__status === 'ACTIVE' && (
                          <button onClick={() => act(u.id, 'suspend_user')} disabled={busyId === u.id} className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                            {busyId === u.id ? '…' : 'Suspend'}
                          </button>
                        )}
                        {u.__status === 'SUSPENDED' && (
                          <button onClick={() => act(u.id, 'activate_user')} disabled={busyId === u.id} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50">
                            {busyId === u.id ? '…' : 'Reactivate'}
                          </button>
                        )}
                        {u.__status === 'REJECTED' && (
                          <button onClick={() => act(u.id, 'activate_user')} disabled={busyId === u.id} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50">
                            {busyId === u.id ? '…' : 'Reinstate'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!showReject}
        title={`Reject ${showReject?.name || 'technician'}?`}
        message="Leave a reason the technician will see when they next try to sign in."
        confirmLabel="Reject Application"
        danger
        busy={busyId === showReject?.id}
        onConfirm={() => showReject && act(showReject.id, 'reject_user', { reason: rejectReason || 'Your application was not approved at this time.' })}
        onCancel={() => setShowReject(null)}
      >
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-500 mb-1">Rejection reason</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Optional reason for rejection…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}