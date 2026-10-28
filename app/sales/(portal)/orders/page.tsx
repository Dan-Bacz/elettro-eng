'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import EmptyState from '../../../components/admin/EmptyState'
import { CartIcon } from '../../../components/admin/icons'
import type { OrderObj } from '../../../components/admin/types'

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'PROCESSING' | 'READY_FOR_PICKUP' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'New' },
  { value: 'APPROVED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Preparing' },
  { value: 'SHIPPED', label: 'To Receive' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-violet-100 text-violet-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  READY_FOR_PICKUP: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-cyan-100 text-cyan-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'New order',
  APPROVED: 'Confirmed',
  PROCESSING: 'Preparing',
  SHIPPED: 'Shipped · to receive',
  READY_FOR_PICKUP: 'Ready for pickup',
  DELIVERED: 'Delivered · awaiting receipt',
  COMPLETED: 'Received',
  CANCELLED: 'Cancelled',
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SalesOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/orders')
        if (!res.ok) {
          if (res.status === 401) { router.push('/sales/login'); return }
          throw new Error('Failed to load orders')
        }
        const data = await res.json()
        setOrders(data.orders || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const visible = orders.filter((o) => {
    const matchesFilter = filter === 'ALL' || o.status === filter
    const q = query.trim().toLowerCase()
    const matchesQuery = !q
      || (o.clientName || '').toLowerCase().includes(q)
      || (o.email || '').toLowerCase().includes(q)
      || (o.phone || '').toLowerCase().includes(q)
      || (o.reference || '').toLowerCase().includes(q)
      || (o.items || []).some((it) => (it.name || '').toLowerCase().includes(q))
    return matchesFilter && matchesQuery
  })

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Client Orders</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">{orders.length} orders · {pendingCount} pending</p>
        </div>
        <span className="rounded-xl bg-yellow-400 px-3 py-2 text-[11px] font-black text-black">
          ₱{orders.reduce((sum, o) => sum + Number(o.total || 0), 0).toLocaleString()} total
        </span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by client, email, phone, item…"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CartIcon className="h-6 w-6" />}
          title={orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          message={orders.length === 0 ? 'Client orders will appear here.' : 'Try adjusting the search or filters.'}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((order) => {
            const itemsText = (order.items || []).map((it) => `${it.quantity}× ${it.name}`).join(', ')
            return (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{order.reference}</span>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</span>
                      {order.warehouseRequest && (
                        <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Warehouse {order.warehouseRequest.status.toLowerCase().replace(/_/g, ' ')} · {order.warehouseRequest.reference}
                        </span>
                      )}
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'} · {(order.paymentMethod || '').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      {(order.items || []).map((it) => (
                        <div key={it.id} className="flex items-center justify-between gap-3 py-0.5">
                          <span className="text-xs font-semibold text-slate-700">{it.name}</span>
                          <span className="shrink-0 text-right text-[11px] font-bold text-slate-500">
                            {it.quantity} {it.unit || 'pcs'}{it.unitPrice > 0 ? ` · ₱${(Number(it.unitPrice) * it.quantity).toLocaleString()}` : ''}
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</span>
                        <span className="text-sm font-black text-yellow-700">₱{Number(order.total || 0).toLocaleString()}</span>
                      </div>
                      {order.fulfillmentMethod === 'DELIVERY' && (
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Delivery fee</span>
                          <span>₱{Number(order.shipping || 0).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Customer total</span>
                        <span>₱{(Number(order.total || 0) + Number(order.shipping || 0)).toLocaleString()}</span>
                      </div>
                    </div>

                    {itemsText && (
                      <p className="mt-2 text-[10px] text-slate-400">{itemsText}</p>
                    )}
                  </div>

                  <div className="shrink-0 lg:w-64">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="text-xs font-bold text-slate-800">{order.clientName}</div>
                      <div className="mt-1 truncate text-[11px] text-slate-500">{order.email}</div>
                      <div className="text-[11px] font-semibold text-slate-600">{order.phone}</div>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Payment</div>
                      <div className="mt-1 text-xs font-bold text-slate-700">{(order.paymentStatus || 'UNPAID').replace(/_/g, ' ')}</div>
                      {order.paymentReference && <div className="mt-1 break-all text-[11px] text-slate-500">GCash reference: {order.paymentReference}</div>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
