'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import EmptyState from '../../../../components/admin/EmptyState'
import { BarChartIcon } from '../../../../components/admin/icons'
import type { OrderObj } from '../../../../components/admin/types'

type DeliveryFilter =
  | 'ALL'
  | 'AWAITING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'CANCELLED'
  | 'RETURNED'

const FILTERS: { value: DeliveryFilter; label: string }[] = [
  { value: 'ALL', label: 'All Deliveries' },
  { value: 'AWAITING_ASSIGNMENT', label: 'Awaiting Rider' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'DELIVERY_FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
]

const STATUS_BADGES: Record<string, string> = {
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

export default function SalesDeliveriesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderObj[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DeliveryFilter>('ALL')

  // Details Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderObj | null>(null)

  // Rider assignment modal
  const [assigningOrder, setAssigningOrder] = useState<OrderObj | null>(null)
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')

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
      // Filter only delivery orders
      const deliveryOrders = (ordersData.orders || []).filter(
        (o: OrderObj) => o.fulfillmentMethod === 'DELIVERY' || o.trackingNumber || o.riderName
      )
      setOrders(deliveryOrders)

      if (ridersRes.ok) {
        const ridersData = await ridersRes.json()
        setRiders(ridersData.users || [])
      }
      setError('')
    } catch (e: any) {
      setError(e.message || 'Failed to load deliveries')
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

  const deliveryOrders = orders.filter((o) => {
    const status = o.deliveryStatus || 'AWAITING_ASSIGNMENT'
    const matchesFilter = filter === 'ALL' || status === filter
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q ||
      (o.clientName || '').toLowerCase().includes(q) ||
      (o.reference || '').toLowerCase().includes(q) ||
      (o.trackingNumber || '').toLowerCase().includes(q) ||
      (o.riderName || '').toLowerCase().includes(q) ||
      (o.address || '').toLowerCase().includes(q) ||
      (o.city || '').toLowerCase().includes(q)
    return matchesFilter && matchesQuery
  })

  // KPI counters
  const totalDeliveries = orders.length
  const awaitingCount = orders.filter((o) => (o.deliveryStatus || 'AWAITING_ASSIGNMENT') === 'AWAITING_ASSIGNMENT').length
  const inTransitCount = orders.filter((o) => o.deliveryStatus === 'IN_TRANSIT').length
  const deliveredCount = orders.filter((o) => o.deliveryStatus === 'DELIVERED').length
  const failedCount = orders.filter((o) => o.deliveryStatus === 'DELIVERY_FAILED').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Delivery Monitoring</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Real-time delivery progress, rider assignments, tracking numbers, and photo proof verification.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
            {totalDeliveries} Deliveries
          </span>
          <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
            {awaitingCount} Awaiting Rider
          </span>
          <span className="rounded-xl bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-800">
            {inTransitCount} In Transit
          </span>
          <span className="rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
            {deliveredCount} Delivered
          </span>
          {failedCount > 0 && (
            <span className="rounded-xl bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800">
              {failedCount} Failed
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
          {error}
        </div>
      )}

      {/* Filters and search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by tracking number, order reference, customer, or rider…"
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

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : deliveryOrders.length === 0 ? (
        <EmptyState
          icon={<BarChartIcon className="h-6 w-6" />}
          title={orders.length === 0 ? 'No delivery orders' : 'No deliveries match your filter'}
          message={
            orders.length === 0
              ? 'Customer orders placed with delivery fulfillment will appear here for monitoring.'
              : 'Try clearing the search query or changing filter tabs.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Tracking Number</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Assigned Rider</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Proof</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {deliveryOrders.map((order) => {
                  const deliveryStatus = order.deliveryStatus || 'AWAITING_ASSIGNMENT'
                  const hasProof = Boolean(order.proofOfDelivery)

                  return (
                    <tr key={order.id} className="transition hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {order.trackingNumber ? (
                          <span className="rounded bg-yellow-50 px-2 py-0.5 text-yellow-900 border border-yellow-200 font-mono text-[11px] font-black">
                            {order.trackingNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not generated</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{order.reference}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div>{order.clientName}</div>
                        <div className="text-[10px] text-slate-400">{order.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs truncate">
                        {[order.barangay, order.city].filter(Boolean).join(', ') || order.address || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {order.riderName ? (
                          <div>
                            <span className="font-bold text-slate-800">{order.riderName}</span>
                            <div className="text-[10px] text-slate-400">{formatDate(order.riderAssignedAt)}</div>
                          </div>
                        ) : (
                          <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase ${
                            STATUS_BADGES[deliveryStatus] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {deliveryStatus.replace(/_/g, ' ')}
                        </span>
                        {order.deliveryFailedReason && (
                          <div className="mt-0.5 text-[10px] text-red-600 truncate max-w-[140px]" title={order.deliveryFailedReason}>
                            Reason: {order.deliveryFailedReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.paymentStatus || 'UNPAID'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {hasProof ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                            ✓ Photo Verified
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">No Photo</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Details
                          </button>
                          {order.status !== 'CANCELLED' && order.deliveryStatus !== 'DELIVERED' && (
                            <button
                              onClick={() => {
                                setAssigningOrder(order)
                                setSelectedRiderId(order.riderId || '')
                                setAssignError('')
                              }}
                              className="rounded-lg bg-yellow-400 px-2.5 py-1 text-xs font-black text-black hover:bg-yellow-300"
                            >
                              {order.riderId ? 'Reassign' : 'Assign'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Complete Order Delivery Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-yellow-600">
                  DELIVERY MONITORING RECORD
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Tracking: {selectedOrder.trackingNumber || 'Awaiting Assignment'}
                </h2>
                <div className="text-xs font-semibold text-slate-500">
                  Order Reference: {selectedOrder.reference}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* Delivery Status & Rider Card */}
              <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 text-xs sm:grid-cols-3">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Current Delivery Status
                  </span>
                  <span
                    className={`mt-1 inline-block rounded-lg border px-2 py-0.5 text-xs font-black uppercase ${
                      STATUS_BADGES[selectedOrder.deliveryStatus || 'AWAITING_ASSIGNMENT'] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {(selectedOrder.deliveryStatus || 'AWAITING_ASSIGNMENT').replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Assigned Rider
                  </span>
                  <div className="mt-1 font-bold text-slate-800">
                    {selectedOrder.riderName || 'Unassigned'}
                  </div>
                  {selectedOrder.assignedRider?.phone && (
                    <div className="text-[11px] text-slate-500">Phone: {selectedOrder.assignedRider.phone}</div>
                  )}
                  {selectedOrder.riderAssignedAt && (
                    <div className="text-[10px] text-slate-400">Assigned: {formatDate(selectedOrder.riderAssignedAt)}</div>
                  )}
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Payment & Fee
                  </span>
                  <div className="mt-1 font-bold text-slate-800">
                    Status: {selectedOrder.paymentStatus || 'UNPAID'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Fee: ₱{Number(selectedOrder.shipping || 0).toLocaleString()} · Total: ₱
                    {(Number(selectedOrder.total || 0) + Number(selectedOrder.shipping || 0)).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Recipient & Destination */}
              <div className="rounded-2xl border border-slate-200 p-4 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Recipient & Destination
                </div>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="font-bold text-slate-800">{selectedOrder.clientName}</div>
                    <div className="text-slate-500">{selectedOrder.phone}</div>
                    <div className="text-slate-500">{selectedOrder.email}</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-700">Delivery Address:</div>
                    <div className="text-slate-600">
                      {[selectedOrder.address, selectedOrder.barangay, selectedOrder.city, selectedOrder.province, selectedOrder.postalCode]
                        .filter(Boolean)
                        .join(', ') || 'No address provided'}
                    </div>
                    {selectedOrder.deliveryNotes && (
                      <div className="mt-1 italic text-slate-500">
                        Instructions: {selectedOrder.deliveryNotes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items to Deliver */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Products to Deliver
                </div>
                <div className="divide-y divide-slate-100 p-3">
                  {(selectedOrder.items || []).map((it) => (
                    <div key={it.id} className="flex justify-between py-1 text-xs">
                      <span className="font-semibold text-slate-700">{it.name}</span>
                      <span className="font-bold text-slate-500">
                        {it.quantity} {it.unit || 'pcs'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Failure / Issue info if reported */}
              {selectedOrder.deliveryFailedReason && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs">
                  <div className="font-black text-red-800 uppercase text-[10px] tracking-wider">
                    Reported Delivery Problem
                  </div>
                  <div className="mt-1 font-semibold text-red-700">{selectedOrder.deliveryFailedReason}</div>
                </div>
              )}

              {/* Proof of delivery photo section */}
              {selectedOrder.proofOfDelivery && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    Official Photo Proof of Delivery
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 items-center">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-emerald-200 bg-slate-900">
                      <Image
                        src={selectedOrder.proofOfDelivery.imageUrl}
                        alt="Proof of Delivery Photo"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div>
                        <span className="font-bold">Delivered At: </span>
                        <span>{formatDate(selectedOrder.proofOfDelivery.deliveredAt)}</span>
                      </div>
                      {selectedOrder.proofOfDelivery.recipientName && (
                        <div>
                          <span className="font-bold">Received By: </span>
                          <span>{selectedOrder.proofOfDelivery.recipientName}</span>
                        </div>
                      )}
                      {selectedOrder.proofOfDelivery.notes && (
                        <div>
                          <span className="font-bold">Rider Notes: </span>
                          <span className="italic">{selectedOrder.proofOfDelivery.notes}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-bold">Verified Rider: </span>
                        <span>{selectedOrder.riderName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery History Timeline */}
              {selectedOrder.deliveryHistories && selectedOrder.deliveryHistories.length > 0 && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    Delivery Status History Timeline
                  </div>
                  <div className="space-y-2 rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                    {selectedOrder.deliveryHistories.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 border-l-2 border-yellow-400 pl-3 py-0.5 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 uppercase text-[10px]">
                              {h.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400">{formatDate(h.createdAt)}</span>
                          </div>
                          {h.notes && <div className="text-slate-600 text-[11px] mt-0.5">{h.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
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
    </div>
  )
}
