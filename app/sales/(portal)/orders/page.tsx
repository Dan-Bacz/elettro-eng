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
  const [viewingOrder, setViewingOrder] = useState<OrderObj | null>(null)
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
          ₱{orders.filter((o) => o.isFullyReceived).reduce((sum, o) => sum + Number(o.total || 0), 0).toLocaleString()} Completed Sales
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${
                  filter === f.value ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders or customers..."
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-400 lg:w-72"
          />
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
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Order ID</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Customer / Client</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Order status</th>
                  <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((order) => (
                  <tr key={order.id} className="transition hover:bg-yellow-50/30">
                    <td className="px-5 py-4 font-mono text-xs font-black text-slate-900">{order.reference}</td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-black text-slate-800">{order.clientName || 'Unnamed client'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setViewingOrder(order)}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-yellow-400 hover:text-slate-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingOrder && (() => {
        const order = viewingOrder
        const isDelivery = order.fulfillmentMethod === 'DELIVERY'
        const deliveryStatus = order.deliveryStatus || 'AWAITING_ASSIGNMENT'
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setViewingOrder(null)}>
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600">Order details</p>
                  <h2 className="mt-1 font-mono text-xl font-black text-slate-900">{order.reference}</h2>
                  <p className="mt-1 text-xs text-slate-500">Placed {formatDate(order.createdAt)}</p>
                </div>
                <button onClick={() => setViewingOrder(null)} className="rounded-full px-3 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-800" aria-label="Close order details">×</button>
              </div>

              <div className="grid gap-4 p-6 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Customer / Client</h3>
                  <p className="mt-2 text-sm font-black text-slate-900">{order.clientName || 'Unnamed client'}</p>
                  <p className="mt-1 text-xs text-slate-600">{order.email || 'No email provided'}</p>
                  <p className="text-xs text-slate-600">{order.phone || 'No phone provided'}</p>
                  {isDelivery && <p className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-700"><span className="font-bold">Address: </span>{[order.address, order.barangay, order.city, order.province, order.postalCode].filter(Boolean).join(', ') || 'No address provided'}</p>}
                  {order.deliveryNotes && <p className="mt-2 text-xs italic text-slate-500">Notes: {order.deliveryNotes}</p>}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Order status</h3>
                  <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>{order.status.replace(/_/g, ' ')}</span>
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p><span className="font-bold">Fulfillment:</span> {isDelivery ? 'Delivery' : 'Pickup'}</p>
                    <p><span className="font-bold">Payment:</span> {(order.paymentMethod || 'Not specified').replace(/_/g, ' ')} · {order.paymentStatus || 'UNPAID'}</p>
                    {isDelivery && <p><span className="font-bold">Delivery:</span> <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${DELIVERY_STATUS_STYLES[deliveryStatus] || 'bg-slate-100 text-slate-700'}`}>{deliveryStatus.replace(/_/g, ' ')}</span></p>}
                    {order.trackingNumber && <p><span className="font-bold">Tracking:</span> {order.trackingNumber}</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 md:col-span-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Items and total</h3>
                  <div className="mt-3 divide-y divide-slate-100">
                    {(order.items || []).map((item) => <div key={item.id} className="flex justify-between gap-4 py-2 text-xs"><span className="font-semibold text-slate-700">{item.name}</span><span className="font-bold text-slate-500">{item.quantity} {item.unit || 'pcs'}{item.unitPrice > 0 ? ` · ₱${(Number(item.unitPrice) * item.quantity).toLocaleString()}` : ''}</span></div>)}
                  </div>
                  <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs">
                    <div className="flex justify-between text-slate-600"><span>Items subtotal</span><span>₱{Number(order.total || 0).toLocaleString()}</span></div>
                    {isDelivery && <div className="flex justify-between text-slate-600"><span>Delivery fee</span><span>₱{Number(order.shipping || 0).toLocaleString()}</span></div>}
                    <div className="flex justify-between text-sm font-black text-slate-900"><span>Grand total</span><span>₱{(Number(order.total || 0) + Number(order.shipping || 0)).toLocaleString()}</span></div>
                  </div>
                </div>

                {isDelivery && <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2"><h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Rider and fulfillment</h3><p className="mt-2 text-xs text-slate-700">{order.riderName ? `${order.riderName}${order.assignedRider?.phone ? ` · ${order.assignedRider.phone}` : ''}` : 'No delivery rider assigned yet.'}</p>{order.deliveryFailedReason && <p className="mt-2 text-xs text-red-600"><span className="font-bold">Failed reason:</span> {order.deliveryFailedReason}</p>}</div>}
                {order.warehouseRequest && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:col-span-2"><h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Warehouse request</h3><p className="mt-2 text-xs font-bold text-emerald-900">{order.warehouseRequest.reference}</p><p className="text-xs text-emerald-700">Status: {order.warehouseRequest.status.replace(/_/g, ' ')}</p></div>}
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
                {order.status === 'PENDING' && <button onClick={() => { setConfirmingOrder(order); setShippingFee(order.shipping ? String(order.shipping) : ''); setViewingOrder(null) }} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-black hover:bg-yellow-300">Confirm order</button>}
                {isDelivery && order.status !== 'CANCELLED' && <button onClick={() => { setAssigningOrder(order); setSelectedRiderId(order.riderId || ''); setAssignError(''); setViewingOrder(null) }} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{order.riderId ? 'Reassign rider' : 'Assign rider'}</button>}
                {order.proofOfDelivery && <button onClick={() => { setViewingProof(order); setViewingOrder(null) }} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500">View delivery proof</button>}
                {order.deliveryHistories && order.deliveryHistories.length > 0 && <button onClick={() => { setViewingHistory(order); setViewingOrder(null) }} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Delivery timeline</button>}
                <button onClick={() => setViewingOrder(null)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">Close</button>
              </div>
            </div>
          </div>
        )
      })()}

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
