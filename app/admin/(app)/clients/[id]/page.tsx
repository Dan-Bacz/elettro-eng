'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusBadge from '../../../../../components/admin/StatusBadge'
import EmptyState from '../../../../../components/admin/EmptyState'
import type { BookingObj, DashboardData, UserObj } from '../../../../../components/admin/types'
import { formatDate } from '../../../../../components/admin/types'

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id ?? ''
  const router = useRouter()
  const [client, setClient] = useState<UserObj | null>(null)
  const [bookings, setBookings] = useState<BookingObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return }
          throw new Error('Failed to load client')
        }
        const payload: DashboardData = await res.json()
        const found = (payload.clients || []).find((c: any) => c.id === clientId)
        if (!found) throw new Error('Client not found')
        if (!cancelled) {
          setClient(found)
          setBookings((payload.bookings || []).filter((b) => b.clientId === clientId))
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load client')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [clientId, router])

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />

  if (error || !client) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="text-2xl">⚠️</div>
        <div className="mt-2 text-sm font-bold text-slate-700">{error || 'Client not found'}</div>
        <Link href="/admin/clients" className="text-xs font-bold text-yellow-600 hover:underline">← Back to clients</Link>
      </div>
    )
  }

  const active = bookings.filter((b) => ['PENDING', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS'].includes(b.status)).length
  const completed = bookings.filter((b) => b.status === 'COMPLETED').length
  const totalSpent = bookings.reduce((sum, b) => sum + (Number(b.budget) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/clients" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-yellow-600">←</Link>
        <h1 className="text-lg font-black text-slate-900">Client Profile</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-yellow-400 text-xl font-black">{client.name?.charAt(0)?.toUpperCase()}</div>
            <div>
              <h2 className="text-base font-black text-slate-900">{client.name}</h2>
              <div className="text-xs text-slate-400">{client.email}</div>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-xs">
            <div className="flex justify-between"><dt className="text-slate-400">Phone</dt><dd className="font-bold text-slate-700">{client.phone || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Joined</dt><dd className="font-bold text-slate-700">{formatDate(client.createdAt)}</dd></div>
          </dl>
        </div>

        <div className="grid grid-cols-3 gap-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-black text-slate-900">{bookings.length}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total Bookings</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-black text-yellow-600">{active}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Active</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-black text-emerald-600">{completed}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Completed</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-black text-slate-900">Booking History</h2>
          {bookings.length === 0 ? (
            <EmptyState icon="🧾" title="No bookings yet" message="This client has not made any bookings." />
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4 font-bold">Booking</th>
                    <th className="pb-3 pr-4 font-bold">Status</th>
                    <th className="pb-3 pr-4 font-bold">Technician</th>
                    <th className="pb-3 font-bold text-right">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-slate-100">
                      <td className="py-3 pr-4">
                        <Link href={`/admin/bookings/${b.id}`} className="text-xs font-bold text-slate-800 hover:text-yellow-600">{b.title}</Link>
                      </td>
                      <td className="py-3 pr-4"><StatusBadge status={b.status} /></td>
                      <td className="py-3 pr-4 text-xs text-slate-500">{b.assignedTo?.name || '—'}</td>
                      <td className="py-3 text-right text-xs font-bold text-slate-700">{b.budget != null ? `$${Number(b.budget).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black text-slate-900">Totals</h2>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between"><span className="text-slate-400">Bookings</span><span className="font-black text-slate-800">{bookings.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Completed</span><span className="font-black text-slate-800">{completed}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Booking Value</span><span className="font-black text-slate-800">${totalSpent.toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}