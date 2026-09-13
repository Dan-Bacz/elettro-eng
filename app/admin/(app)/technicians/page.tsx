'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import SearchBar from '../../../../components/admin/SearchBar'
import FilterBar from '../../../../components/admin/FilterBar'
import StatusBadge from '../../../../components/admin/StatusBadge'
import EmptyState from '../../../../components/admin/EmptyState'
import type { UserObj, UserStatus } from '../../../../components/admin/types'
import { formatDate } from '../../../../components/admin/types'

type Filter = UserStatus | 'ALL'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
]

export default function AdminTechniciansPage() {
  const router = useRouter()
  const [techs, setTechs] = useState<UserObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/admin')
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return }
          throw new Error('Failed to load technicians')
        }
        const payload = await res.json()
        if (!cancelled) setTechs(payload.registrations || [])
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load technicians')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  function effectiveStatus(u: UserObj) {
    return u.status || (u.approved ? 'ACTIVE' : 'PENDING')
  }

  const visible = techs
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
        icon="👷"
        title="Technicians"
        subtitle={`${techs.filter((u) => effectiveStatus(u) === 'ACTIVE').length} active technicians`}
        actions={
          <Link href="/technician/register" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-700 transition-colors">
            + Add Technician
          </Link>
        }
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
          icon="👷"
          title="No technicians found"
          message="Technician accounts will appear here once they register or are added."
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
                <th className="px-4 py-3.5 font-bold">Joined</th>
                <th className="px-5 py-3.5 font-bold text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {(visible as any[]).map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-yellow-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/technicians/${u.id}`} className="flex items-center gap-3">
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
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/technicians/${u.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-700 transition-colors">
                      Profile →
                    </Link>
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