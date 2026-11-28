'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusBadge from '../../../../../components/admin/StatusBadge'
import { CartIcon, DocumentIcon } from '../../../../../components/admin/icons'
import EmptyState from '../../../../../components/admin/EmptyState'
import type { BookingObj, DashboardData, OrderObj, UserObj } from '../../../../../components/admin/types'
import { formatDate } from '../../../../../components/admin/types'

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format
const headingCell = 'px-4 py-3 text-left text-xs font-bold text-slate-700'
const bodyCell = 'px-4 py-3 text-sm text-slate-700'

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id ?? ''
  const router = useRouter()
  const [client, setClient] = useState<UserObj | null>(null)
  const [bookings, setBookings] = useState<BookingObj[]>([])
  const [orders, setOrders] = useState<OrderObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return }
          throw new Error('Failed to load client')
        }
        const payload: DashboardData = await res.json()
        const found = (payload.clients || []).find((record) => record.id === clientId)
        if (!found) throw new Error('Client not found')
        if (!cancelled) {
          setClient(found)
          setBookings((payload.bookings || []).filter((b) => b.clientId === clientId))
          setOrders((payload.orders || []).filter((order) => order.clientId === clientId))
        }
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'Failed to load client')
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
  const totalSpent = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const accountStatus = client.status === 'SUSPENDED'
    ? 'Suspended'
    : client.status === 'REJECTED'
      ? 'Disabled'
      : client.emailVerifiedAt
        ? 'Active'
        : 'Awaiting email verification'

  const initials = client.name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || 'C'
  const indicators = [
    ['Bookings', bookings.length],
    ['Active bookings', active],
    ['Completed bookings', completed],
    ['Product orders', orders.length],
    ['Order value', money(totalSpent)],
  ] as const

  return (
    <div className="min-w-0 space-y-5">
      <Link href="/admin/clients" className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-cyan-500 hover:text-cyan-800">
        <span aria-hidden="true">&larr;</span> Back to clients
      </Link>

      <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-[#172c3c] to-[#08727f] px-5 py-6 text-white shadow-sm sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-center gap-4">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-yellow-300 text-2xl font-black text-slate-950">{initials}</span>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl">{client.name}</h1>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${accountStatus === 'Active' ? 'bg-emerald-100 text-emerald-900' : accountStatus === 'Awaiting email verification' ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-900'}`}>{accountStatus}</span>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/20 pt-5 sm:grid-cols-3 xl:grid-cols-5">
          {indicators.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs font-semibold text-slate-200">{label}</dt>
              <dd className="mt-1 break-words text-lg font-black tabular-nums text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section aria-labelledby="contact-heading" className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <h2 id="contact-heading" className="text-base font-bold text-slate-950">Contact and account details</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ['Email', client.email],
            ['Phone', client.phone || 'Not provided'],
            ['Address', client.address || 'Not provided'],
            ['Joined', formatDate(client.createdAt)],
            ['Email verified', client.emailVerifiedAt ? formatDate(client.emailVerifiedAt) : 'Awaiting verification'],
          ].map(([label, value]) => (
            <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3" key={label}>
              <dt className="text-xs font-semibold text-slate-600">{label}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <HistorySection title="Booking history" count={bookings.length}>
        {bookings.length === 0 ? (
          <EmptyState icon={<DocumentIcon className="h-6 w-6" />} title="No bookings yet" message="This client has not made any bookings." />
        ) : (
          <table className="w-full min-w-[540px] text-left">
            <thead className="bg-slate-100">
              <tr>
                <th scope="col" className={headingCell}>Booking</th>
                <th scope="col" className={headingCell}>Status</th>
                <th scope="col" className={headingCell}>Technician</th>
                <th scope="col" className={`${headingCell} text-right`}>Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((booking) => (
                <tr key={booking.id} className="even:bg-slate-50/60">
                  <th scope="row" className={bodyCell}>
                    <Link href={`/admin/bookings/${booking.id}`} className="break-words font-bold text-cyan-800 hover:underline">{booking.title}</Link>
                  </th>
                  <td className={bodyCell}><StatusBadge status={booking.status} /></td>
                  <td className={bodyCell}>{booking.assignedTo?.name || 'Unassigned'}</td>
                  <td className={`${bodyCell} whitespace-nowrap text-right font-semibold`}>{booking.budget != null ? money(Number(booking.budget)) : 'Not set'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </HistorySection>

      <HistorySection title="Product order history" count={orders.length}>
        {orders.length === 0 ? (
          <EmptyState icon={<CartIcon className="h-6 w-6" />} title="No product orders" message="This client has not placed any product orders." />
        ) : (
          <table className="w-full min-w-[620px] text-left">
            <thead className="bg-slate-100">
              <tr>
                <th scope="col" className={headingCell}>Order</th>
                <th scope="col" className={headingCell}>Products</th>
                <th scope="col" className={headingCell}>Status</th>
                <th scope="col" className={headingCell}>Payment</th>
                <th scope="col" className={`${headingCell} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="even:bg-slate-50/60">
                  <th scope="row" className={bodyCell}>
                    <span className="font-mono text-xs font-bold text-slate-950">{order.reference}</span>
                    <time dateTime={order.createdAt} className="mt-1 block text-xs font-normal text-slate-600">{formatDate(order.createdAt)}</time>
                  </th>
                  <td className={`${bodyCell} w-2/5 break-words`}>{(order.items || []).map((item) => `${item.name} (qty ${item.quantity})`).join(', ') || 'No items listed'}</td>
                  <td className={bodyCell}><StatusBadge status={order.status} /></td>
                  <td className={`${bodyCell} capitalize`}>{order.paymentStatus?.toLowerCase().replace(/_/g, ' ') || 'Not specified'}</td>
                  <td className={`${bodyCell} whitespace-nowrap text-right font-semibold`}>{money(Number(order.total) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </HistorySection>
    </div>
  )
}

function HistorySection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        <span className="text-xs font-semibold text-slate-600">{count} {count === 1 ? 'record' : 'records'}</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}
