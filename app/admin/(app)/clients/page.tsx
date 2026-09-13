'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import SearchBar from '../../../../components/admin/SearchBar'
import EmptyState from '../../../../components/admin/EmptyState'
import type { DashboardData, UserObj } from '../../../../components/admin/types'
import { formatDate } from '../../../../components/admin/types'

export default function AdminClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<UserObj[]>([])
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return }
          throw new Error('Failed to load clients')
        }
        const payload: DashboardData = await res.json()
        if (!cancelled) {
          setClients(payload.clients || [])
          const counts: Record<string, number> = {}
          for (const b of payload.bookings || []) {
            if (b.clientId) counts[b.clientId] = (counts[b.clientId] || 0) + 1
          }
          setBookingCounts(counts)
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load clients')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  const visible = clients.filter((c) => {
    const q = query.trim().toLowerCase()
    return !q || (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        icon="👥"
        title="Clients"
        subtitle={`${clients.length} registered clients`}
      />

      <SearchBar value={query} onChange={setQuery} placeholder="Search clients…" />

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : error ? (
        <EmptyState icon="⚠️" title={error} message="Try refreshing the page." />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="👥"
          title={clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
          message="Clients who book a service through the website will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5 font-bold">Client</th>
                <th className="px-4 py-3.5 font-bold">Contact</th>
                <th className="px-4 py-3.5 font-bold text-center">Bookings</th>
                <th className="px-4 py-3.5 font-bold">Joined</th>
                <th className="px-5 py-3.5 font-bold text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-yellow-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/clients/${c.id}`} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-yellow-400 text-xs font-black">{c.name?.charAt(0)?.toUpperCase() || 'C'}</div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-slate-800 hover:text-yellow-600">{c.name}</div>
                        <div className="truncate text-[10px] text-slate-400">{c.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-slate-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3.5 text-center text-xs font-black text-slate-700">{bookingCounts[c.id] || 0}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/clients/${c.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-700 transition-colors">
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