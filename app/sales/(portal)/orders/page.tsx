'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../../components/admin/PageHeader'
import SearchBar from '../../components/admin/SearchBar'
import FilterBar from '../../components/admin/FilterBar'
import EmptyState from '../../components/admin/EmptyState'
import { CartIcon } from '../../components/admin/icons'
import type { OrderObj } from '../../components/admin/types'

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
  const [busyId, setBusyId] = useState<string | null>(null)
  const [shippingAmounts, setShippingAmounts] = useState<Record<string, string>>({})
  const [fulfillmentNotes, setFulfillmentNotes] = useState<Record<string, string>>({})
  const [riderNames, setRiderNames] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/orders')
      if (!res.ok) {
        if (res.status === 401) { router.push('/admin/login'); return }
        throw new Error('Failed to load orders')
      }
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  async function updateOrder(order: OrderObj, update: { status?: OrderObj['status']; paymentStatus?: string; shipping?: number; fulfillmentNote?: string; riderName?: string }) {
    setBusyId(order.id)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, ...update }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to update order')
      }
      if ('shipping' in update) {
        setShippingAmounts((current) => {
          const next = { ...current }
          delete next[order.id]
          return next
        })
      }
      if ('fulfillmentNote' in update) {
        setFulfillmentNotes((current) => {
          const next = { ...current }
          delete next[order.id]
          return next
        })
      }
      if ('riderName' in update) {
        setRiderNames((current) => {
          const next = { ...current }
          delete next[order.id]
          return next
        })
      }
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to update order')
    } finally {
      setBusyId(null)
    }
  }

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
      <PageHeader
        icon={<CartIcon className="h-5 w-5" />}
        title="Client Orders"
        subtitle={`${orders.length} orders · ${pendingCount} pending`}
        actions={
          <span className="rounded-xl bg-yellow-400 px-3 py-2 text-[11px] font-black text-black">
            ₱{orders.reduce((sum, o) => sum + Number(o.total || 0), 0).toLocaleString()} total
          </span>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by client, email, phone, item…" />
        <FilterBar options={FILTERS} value={filter} onChange={(v) => setFilter(v)} />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CartIcon className="h-6 w-6" />}
          title={orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          message={orders.length === 0 ? 'Client orders from the public product catalog will appear here.' : 'Try adjusting the search or filters.'}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((order) => {
            const itemsText = (order.items || []).map((it) => `${it.quantity}× ${it.name}`).join(', ')
            return (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left: order info */}
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

                    {/* Items */}
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
                          <span>Delivery fee {order.shippingConfirmed ? '' : '(not set)'}</span>
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

                  {/* Right: client + actions */}
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
                      {order.paymentStatus !== 'PAID' && (
                        <button
                          onClick={() => updateOrder(order, { paymentStatus: 'PAID' })}
                          disabled={busyId === order.id || (order.paymentMethod === 'GCASH' && order.paymentStatus !== 'SUBMITTED') || (order.paymentMethod === 'CASH_ON_DELIVERY' && !['DELIVERED', 'COMPLETED'].includes(order.status)) || (order.paymentMethod === 'CASH_ON_PICKUP' && order.status !== 'COMPLETED')}
                          title={order.paymentMethod === 'GCASH' && order.paymentStatus !== 'SUBMITTED' ? 'Client must submit a GCash reference first' : 'Only mark paid after confirming funds were received'}
                          className="mt-2 rounded-lg border border-emerald-200 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Mark payment received
                        </button>
                      )}
                      <p className="mt-2 text-[10px] leading-4 text-slate-400">Confirm the funds were actually received before marking paid.</p>
                    </div>
                    {order.fulfillmentMethod === 'DELIVERY' && order.status === 'PENDING' && (
                      <div className="mt-3 rounded-xl border border-slate-200 p-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Delivery fee (₱)
                          <input
                            type="number"
                            min="0"
                            max="1000000"
                            step="0.01"
                            value={shippingAmounts[order.id] ?? String(order.shipping || 0)}
                            onChange={(event) => setShippingAmounts((current) => ({ ...current, [order.id]: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-800"
                          />
                        </label>
                        <button
                          onClick={() => updateOrder(order, { shipping: Number(shippingAmounts[order.id] ?? order.shipping ?? 0) })}
                          disabled={busyId === order.id || !Number.isFinite(Number(shippingAmounts[order.id] ?? order.shipping ?? 0)) || Number(shippingAmounts[order.id] ?? order.shipping ?? 0) < 0 || Number(shippingAmounts[order.id] ?? order.shipping ?? 0) > 1000000}
                          className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Confirm delivery fee
                        </button>
                        {order.shippingConfirmed && <span className="ml-2 text-[10px] font-semibold text-emerald-700">Fee confirmed</span>}
                      </div>
                    )}
                    {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                      <div className="mt-3 rounded-xl border border-slate-200 p-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {order.fulfillmentMethod === 'PICKUP' ? 'Pickup instructions / location' : 'Delivery instructions'}
                          <textarea
                            value={fulfillmentNotes[order.id] ?? order.fulfillmentNote ?? ''}
                            maxLength={500}
                            rows={3}
                            onChange={(event) => setFulfillmentNotes((current) => ({ ...current, [order.id]: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-800"
                          />
                        </label>
                        <button
                          onClick={() => updateOrder(order, { fulfillmentNote: fulfillmentNotes[order.id] ?? order.fulfillmentNote ?? '' })}
                          disabled={busyId === order.id}
                          className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Save instructions
                        </button>
                      </div>
                    )}
                    {order.fulfillmentMethod === 'DELIVERY' && (
                      <div className="mt-3 rounded-xl border border-slate-200 p-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Assign rider
                          <input
                            type="text"
                            value={riderNames[order.id] ?? order.riderName ?? ''}
                            maxLength={100}
                            placeholder="Enter rider name"
                            onChange={(event) => setRiderNames((current) => ({ ...current, [order.id]: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-800"
                          />
                        </label>
                        <button
                          onClick={() => updateOrder(order, { riderName: riderNames[order.id] ?? order.riderName ?? '' })}
                          disabled={busyId === order.id}
                          className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Assign rider
                        </button>
                        {order.riderName && <div className="mt-2 text-[10px] font-semibold text-emerald-700">Rider: {order.riderName}</div>}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => updateOrder(order, { status: 'APPROVED' })}
                          disabled={busyId === order.id || (order.fulfillmentMethod === 'DELIVERY' && !order.shippingConfirmed)}
                          title={order.fulfillmentMethod === 'DELIVERY' && !order.shippingConfirmed ? 'Set and confirm the delivery fee first' : undefined}
                          className="rounded-lg bg-yellow-400 px-3 py-1.5 text-[11px] font-black text-black hover:bg-yellow-500 disabled:opacity-50 transition-colors"
                        >
                          Confirm order
                        </button>
                      )}
                      {order.status === 'APPROVED' && (
                        order.warehouseRequest
                          ? <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">Awaiting warehouse release</span>
                          : <button
                              onClick={() => updateOrder(order, { status: 'PROCESSING' })}
                              disabled={busyId === order.id}
                              className="rounded-lg border border-violet-200 px-3 py-1.5 text-[11px] font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50 transition-colors"
                            >
                              Start preparing
                            </button>
                      )}
                      {order.warehouseRequest && order.warehouseRequest._count.releases > 0 && (
                        <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
                          Warehouse items have been released; use a return workflow instead of cancellation.
                        </span>
                      )}
                      {order.status === 'PROCESSING' && (
                        <button
                          onClick={() => updateOrder(order, { status: order.fulfillmentMethod === 'PICKUP' ? 'READY_FOR_PICKUP' : 'SHIPPED' })}
                          disabled={busyId === order.id}
                          className="rounded-lg border border-indigo-200 px-3 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                        >
                          {order.fulfillmentMethod === 'PICKUP' ? 'Mark ready for pickup' : 'Mark shipped'}
                        </button>
                      )}
                      {order.status === 'SHIPPED' && (
                        <button
                          onClick={() => updateOrder(order, { status: 'DELIVERED' })}
                          disabled={busyId === order.id}
                          className="rounded-lg border border-cyan-200 px-3 py-1.5 text-[11px] font-bold text-cyan-700 hover:bg-cyan-50 disabled:opacity-50 transition-colors"
                        >
                          Mark delivered
                        </button>
                      )}
                      {['PENDING', 'APPROVED', 'PROCESSING'].includes(order.status) && (
                        <button
                          onClick={() => updateOrder(order, { status: 'CANCELLED' })}
                          disabled={busyId === order.id || Boolean(order.warehouseRequest?._count.releases) || (order.paymentMethod === 'GCASH' && order.paymentStatus === 'PAID')}
                          title={order.warehouseRequest?._count.releases ? 'Released warehouse items require an authorized return workflow' : order.paymentMethod === 'GCASH' && order.paymentStatus === 'PAID' ? 'Paid GCash cancellations require handling the refund first' : undefined}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          Cancel order
                        </button>
                      )}
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
