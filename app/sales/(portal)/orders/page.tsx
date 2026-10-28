'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import EmptyState from '../../../../components/admin/EmptyState'
import { CartIcon } from '../../../../components/admin/icons'
import type { OrderObj } from '../../../../components/admin/types'

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All Orders' },
  { value: 'PENDING', label: 'New / Pending' },
  { value: 'APPROVED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Preparing' },
  { value: 'SHIPPED', label: 'Dispatched / In Delivery' },
  { value: 'DELIVERED', label: 'Delivered (Awaiting Receipt)' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-violet-100 text-violet-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  READY_FOR_PICKUP: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-cyan-100 text-cyan-800',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

const DELIVERY_STATUS_STYLES: Record<string, string> = {
  AWAITING_ASSIGNMENT: 'bg-slate-100 text-slate-700 border-slate-300',
  ASSIGNED: 'bg-amber-50 text-amber-800 border-amber-300',
  PREPARING_DISPATCH: 'bg-blue-50 text-blue-800 border-blue-300',
  IN_TRANSIT: 'bg-indigo-50 text-indigo-800 border-indigo-300',
  DELIVERED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  DELIVERY_FAILED: 'bg-red-50 text-red-800 border-red-300',
  CANCELLATION_REQUESTED: 'bg-orange-50 text-orange-800 border-orange-300',
  CANCELLED: 'bg-gray-100 text-gray-700 border-gray-300',
  RETURN_REQUESTED: 'bg-purple-50 text-purple-800 border-purple-300',
  RETURNED: 'bg-purple-100 text-purple-900 border-purple-300',
}

type Rider = {
  id: string
  name: string
  email: string
  phone?: string | null
}

function formatDate(iso?: string | null) {
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
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')

  // Rider assignment state
  const [assigningOrder, setAssigningOrder] = useState<OrderObj | null>(null)
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')

  // Proof of delivery modal
  const [viewingProof, setViewingProof] = useState<OrderObj | null>(null)

  // Delivery history modal
  const [viewingHistory, setViewingHistory] = useState<OrderObj | null>(null)

  // Order approval / shipping fee modal
  const [confirmingOrder, setConfirmingOrder] = useState<OrderObj | null>(null)
  const [shippingFee, setShippingFee] = useState('')
  const [updatingOrder, setUpdatingOrder] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [ordersRes, ridersRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/users?role=RIDER'),
      ])
      if (ordersRes.status === 401) {
        router.push('/sales/login')
        return
      }
      if (!ordersRes.ok) throw new Error('Failed to load orders')
      const ordersData = await ordersRes.json()
      setOrders(ordersData.orders || [])

      if (ridersRes.ok) {
        const ridersData = await ridersRes.json()
        setRiders(ridersData.users || [])
      }
      setError('')
    } catch (e: any) {
      setError(e.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAssignRider() {
    if (!assigningOrder || !selectedRiderId) return
    setAssigning(true)
    setAssignError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assigningOrder.id,
          riderId: selectedRiderId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign rider')
      setAssigningOrder(null)
      setSelectedRiderId('')
      await load()
    } catch (e: any) {
      setAssignError(e.message || 'Failed to assign rider')
    } finally {
      setAssigning(false)
    }
  }

  async function handleConfirmOrder() {
    if (!confirmingOrder) return
    setUpdatingOrder(true)
    try {
      const fee = Number(shippingFee)
      const body: any = {
        id: confirmingOrder.id,
        status: 'APPROVED',
      }
      if (confirmingOrder.fulfillmentMethod === 'DELIVERY' && !confirmingOrder.shippingConfirmed) {
        if (!Number.isFinite(fee) || fee < 0) {
          setError('Please provide a valid delivery fee')
          setUpdatingOrder(false)
          return
        }
        body.shipping = fee
      }

      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to confirm order')
      setConfirmingOrder(null)
      setShippingFee('')
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to confirm order')
    } finally {
      setUpdatingOrder(false)
    }
  }

  const visible = orders.filter((o) => {
    const matchesFilter = filter === 'ALL' || o.status === filter
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q ||
      (o.clientName || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q) ||
      (o.phone || '').toLowerCase().includes(q) ||
      (o.reference || '').toLowerCase().includes(q) ||
      (o.trackingNumber || '').toLowerCase().includes(q) ||
      (o.riderName || '').toLowerCase().includes(q) ||
      (o.items || []).some((it) => (it.name || '').toLowerCase().includes(q))
    return matchesFilter && matchesQuery
  })

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Client Sales Orders</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {orders.length} total orders · {pendingCount} awaiting confirmation
          </p>
        </div>
        <span className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-black text-black shadow-sm">
          ₱{orders.reduce((sum, o) => sum + Number(o.total || 0), 0).toLocaleString()} Total Sales
        </span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by client, order ref, tracking number, item, rider…"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 sm:w-80"
        />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                filter === f.value ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CartIcon className="h-6 w-6" />}
          title={orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          message={orders.length === 0 ? 'Client orders will appear here.' : 'Try adjusting the search query or filter.'}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((order) => {
            const isDelivery = order.fulfillmentMethod === 'DELIVERY'
            const hasTracking = Boolean(order.trackingNumber)
            const deliveryStatus = order.deliveryStatus || 'AWAITING_ASSIGNMENT'
            const hasProof = Boolean(order.proofOfDelivery)

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Header bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-900">{order.reference}</span>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                        STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</span>

                    {/* Method & Payment Badges */}
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {isDelivery ? 'Delivery' : 'Pickup'} · {(order.paymentMethod || '').replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${
                        order.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Payment: {order.paymentStatus || 'UNPAID'}
                    </span>
                  </div>

                  {/* Delivery Status & Tracking */}
                  {isDelivery && (
                    <div className="flex flex-wrap items-center gap-2">
                      {hasTracking ? (
                        <span className="rounded-lg border border-yellow-300 bg-yellow-50 px-2.5 py-1 font-mono text-[11px] font-black text-yellow-900">
                          Tracking: {order.trackingNumber}
                        </span>
                      ) : (
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                          No Tracking Yet
                        </span>
                      )}
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase ${
                          DELIVERY_STATUS_STYLES[deliveryStatus] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        Delivery: {deliveryStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content body */}
                <div className="p-5">
                  <div className="grid gap-5 lg:grid-cols-3">
                    {/* Items & Pricing */}
                    <div className="lg:col-span-1 rounded-xl bg-slate-50 p-3.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Items</div>
                      <div className="mt-2 divide-y divide-slate-100">
                        {(order.items || []).map((it) => (
                          <div key={it.id} className="flex items-center justify-between gap-3 py-1 text-xs">
                            <span className="font-semibold text-slate-700">{it.name}</span>
                            <span className="shrink-0 text-right font-bold text-slate-500">
                              {it.quantity} {it.unit || 'pcs'}
                              {it.unitPrice > 0 ? ` · ₱${(Number(it.unitPrice) * it.quantity).toLocaleString()}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 border-t border-slate-200 pt-2 space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-600">
                          <span>Items Subtotal</span>
                          <span>₱{Number(order.total || 0).toLocaleString()}</span>
                        </div>
                        {isDelivery && (
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Delivery Fee</span>
                            <span>₱{Number(order.shipping || 0).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-yellow-800 border-t border-slate-200/60 pt-1">
                          <span>Grand Total</span>
                          <span>₱{(Number(order.total || 0) + Number(order.shipping || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Destination Info */}
                    <div className="lg:col-span-1 space-y-3">
                      <div className="rounded-xl border border-slate-200 p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</div>
                        <div className="mt-1 text-xs font-black text-slate-800">{order.clientName}</div>
                        <div className="text-[11px] text-slate-500">{order.email}</div>
                        <div className="text-[11px] font-semibold text-slate-600">{order.phone}</div>
                        {isDelivery && (
                          <div className="mt-2 text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg">
                            <span className="font-bold">Address: </span>
                            {[order.address, order.barangay, order.city, order.province, order.postalCode]
                              .filter(Boolean)
                              .join(', ') || 'No address provided'}
                          </div>
                        )}
                        {order.deliveryNotes && (
                          <div className="mt-1 text-[11px] text-slate-500 italic">
                            Delivery notes: {order.deliveryNotes}
                          </div>
                        )}
                      </div>

                      {/* Warehouse request link if any */}
                      {order.warehouseRequest && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                          <div className="font-bold text-emerald-900">
                            Warehouse Request: {order.warehouseRequest.reference}
                          </div>
                          <div className="text-[11px] text-emerald-700">
                            Status: {order.warehouseRequest.status.replace(/_/g, ' ')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delivery & Rider Management Actions */}
                    <div className="lg:col-span-1 flex flex-col justify-between rounded-xl border border-slate-200 p-3.5">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Rider & Fulfillment
                        </div>

                        {isDelivery ? (
                          <div className="mt-2 space-y-2">
                            {order.riderName ? (
                              <div className="rounded-xl bg-slate-50 p-2.5">
                                <div className="text-xs font-bold text-slate-800">
                                  Rider: {order.riderName}
                                </div>
                                {order.assignedRider?.phone && (
                                  <div className="text-[11px] text-slate-500">Contact: {order.assignedRider.phone}</div>
                                )}
                                <div className="text-[10px] text-slate-400">
                                  Assigned: {formatDate(order.riderAssignedAt)}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800">
                                No delivery rider assigned yet.
                              </div>
                            )}

                            {order.deliveryFailedReason && (
                              <div className="rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                                <span className="font-bold">Failed Reason: </span>
                                {order.deliveryFailedReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                            Customer will pick up order at branch.
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setConfirmingOrder(order)
                              setShippingFee(order.shipping ? String(order.shipping) : '')
                            }}
                            className="rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-black shadow-sm transition hover:bg-yellow-300"
                          >
                            Confirm Order
                          </button>
                        )}

                        {isDelivery && order.status !== 'CANCELLED' && (
                          <button
                            onClick={() => {
                              setAssigningOrder(order)
                              setSelectedRiderId(order.riderId || '')
                              setAssignError('')
                            }}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            {order.riderId ? 'Reassign Rider' : 'Assign Rider'}
                          </button>
                        )}

                        {hasProof && (
                          <button
                            onClick={() => setViewingProof(order)}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-500"
                          >
                            View Delivery Proof
                          </button>
                        )}

                        {order.deliveryHistories && order.deliveryHistories.length > 0 && (
                          <button
                            onClick={() => setViewingHistory(order)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Delivery Timeline
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Assign Rider Modal */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">Assign Delivery Rider</h2>
            <p className="mt-1 text-xs text-slate-500">
              Assign an authorized ELETTRO rider to order{' '}
              <span className="font-mono font-bold text-slate-800">{assigningOrder.reference}</span>. A unique tracking
              number will be generated automatically.
            </p>

            {assignError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                {assignError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700">Select Active Rider</label>
              {riders.length === 0 ? (
                <div className="mt-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 font-medium">
                  No active rider accounts found. Please ensure rider users exist with role RIDER and status ACTIVE.
                </div>
              ) : (
                <select
                  value={selectedRiderId}
                  onChange={(e) => setSelectedRiderId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-800 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">-- Choose a rider --</option>
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.email}) {r.phone ? `· ${r.phone}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigningOrder(null)}
                disabled={assigning}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignRider}
                disabled={assigning || !selectedRiderId}
                className="rounded-xl bg-yellow-400 px-5 py-2 text-xs font-black text-black shadow-sm transition hover:bg-yellow-300 disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Order / Set Shipping Fee Modal */}
      {confirmingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">Confirm Order</h2>
            <p className="mt-1 text-xs text-slate-500">
              Confirm order <span className="font-mono font-bold text-slate-800">{confirmingOrder.reference}</span> for client{' '}
              {confirmingOrder.clientName}.
            </p>

            {confirmingOrder.fulfillmentMethod === 'DELIVERY' && !confirmingOrder.shippingConfirmed && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700">Delivery Fee (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  placeholder="e.g. 150"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-800 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingOrder(null)}
                disabled={updatingOrder}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={updatingOrder}
                className="rounded-xl bg-yellow-400 px-5 py-2 text-xs font-black text-black shadow-sm transition hover:bg-yellow-300 disabled:opacity-50"
              >
                {updatingOrder ? 'Confirming...' : 'Confirm & Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Delivery Modal */}
      {viewingProof && viewingProof.proofOfDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Proof of Delivery</h3>
                <div className="font-mono text-xs text-yellow-700 font-bold">
                  Tracking: {viewingProof.trackingNumber || viewingProof.proofOfDelivery.trackingNumber}
                </div>
              </div>
              <button
                onClick={() => setViewingProof(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                <Image
                  src={viewingProof.proofOfDelivery.imageUrl}
                  alt="Delivery Proof Photo"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
                <div>
                  <span className="font-bold text-slate-700">Delivered At: </span>
                  <span className="text-slate-600">{formatDate(viewingProof.proofOfDelivery.deliveredAt)}</span>
                </div>
                {viewingProof.proofOfDelivery.recipientName && (
                  <div>
                    <span className="font-bold text-slate-700">Received By: </span>
                    <span className="text-slate-600">{viewingProof.proofOfDelivery.recipientName}</span>
                  </div>
                )}
                {viewingProof.proofOfDelivery.notes && (
                  <div>
                    <span className="font-bold text-slate-700">Rider Delivery Notes: </span>
                    <span className="text-slate-600 italic">{viewingProof.proofOfDelivery.notes}</span>
                  </div>
                )}
                <div>
                  <span className="font-bold text-slate-700">Rider: </span>
                  <span className="text-slate-600">{viewingProof.riderName || 'Assigned Rider'}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewingProof(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Timeline Modal */}
      {viewingHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Delivery History Timeline</h3>
                <div className="font-mono text-xs text-slate-500">Order: {viewingHistory.reference}</div>
              </div>
              <button
                onClick={() => setViewingHistory(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-3">
              {(viewingHistory.deliveryHistories || []).map((h) => (
                <div key={h.id} className="relative flex items-start gap-3 border-l-2 border-yellow-400 pl-4 py-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-800 uppercase">
                        {h.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(h.createdAt)}</span>
                    </div>
                    {h.notes && <div className="mt-1 text-xs text-slate-600">{h.notes}</div>}
                    {h.actorRole && (
                      <div className="mt-0.5 text-[10px] text-slate-400">Recorded by: {h.actorRole}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewingHistory(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
