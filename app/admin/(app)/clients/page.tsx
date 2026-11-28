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

  const activeClients = clients.filter((client) => accountStatus(client) === 'Active').length
  const verifiedClients = clients.filter((client) => Boolean(client.emailVerifiedAt)).length
  const clientsWithBookings = clients.filter((client) => (bookingCounts[client.id] || 0) > 0).length

  function accountStatus(client: UserObj) {
    if (client.status === 'SUSPENDED') return 'Suspended'
    if (client.status === 'REJECTED') return 'Disabled'
    if (!client.emailVerifiedAt) return 'Email not verified'
    return 'Active'
  }

  return (
    <div
      className="relative space-y-6 rounded-2xl bg-cover bg-center p-4 sm:p-6"
      style={{
        backgroundImage:
          "linear-gradient(rgba(247,248,250,0.88), rgba(247,248,250,0.88)), url('/bgweb.png')",
      }}
    >
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#182d3d] to-[#08727f] p-6 text-white shadow-[0_28px_60px_-30px_rgba(15,23,42,0.85)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" /><div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><span className="inline-flex rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">Client directory</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Customer command center</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">Manage client profiles, account health, contact details, and service engagement from one organized view.</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-xs font-semibold leading-5 text-slate-200">Use each client profile to review their bookings, account information, and activity history.</div></div>
        <div className="relative mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">{[['Registered', clients.length], ['Active', activeClients], ['Verified', verifiedClients], ['With bookings', clientsWithBookings]].map(([label, value]) => <div key={String(label)}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div></div>)}</div>
      </section>


      <div className="hidden"><PageHeader
        icon="👥"
        title="Clients"
        subtitle={`${clients.length} registered clients`}
      /></div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><SearchBar value={query} onChange={setQuery} placeholder="Search by name, email, or phone…" /></div>

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
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#173b44] text-[10px] uppercase tracking-wider text-white/60">
                <th className="px-5 py-3.5 font-bold">Client</th>
                <th className="px-4 py-3.5 font-bold">Contact</th>
                <th className="px-4 py-3.5 font-bold">Account</th>
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
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      accountStatus(c) === 'Active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : accountStatus(c) === 'Suspended' || accountStatus(c) === 'Disabled'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}>
                      {accountStatus(c)}
                    </span>
                  </td>
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
