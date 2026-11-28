'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import ReportPhotoPicker from '@/components/ReportPhotoPicker'
import StatusBadge from '@/components/admin/StatusBadge'
import { riderDeliveryNeedsReason, riderDeliveryTransitions } from '@/lib/rider-delivery-status'

type Delivery = {
  id: string
  reference: string
  trackingNumber: string
  clientName?: string
  deliveryAddress?: string
  deliveryStatus: string
  items: { id: string; name: string; quantity: number; unit?: string }[]
  proofOfDelivery?: { deliveredAt: string; imageUrl: string; recipientName?: string } | null
}

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-600'
const button = 'rounded-lg bg-cyan-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50'

export default function RiderDeliveriesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Delivery[] | null>(null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const selected = orders?.find(order => order.id === selectedId)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch('/api/rider', { cache: 'no-store', signal: controller.signal })
        if (res.status === 401) { router.replace('/rider/login'); return }
        if (!res.ok) throw new Error('Unable to load your deliveries.')
        setOrders((await res.json()).orders)
      } catch (error) {
        if (!controller.signal.aborted) setError((error as Error).message)
      }
    }
    void load()
    return () => controller.abort()
  }, [router])

  function replaceOrder(id: string, changes: Partial<Delivery>) {
    setOrders(current => current?.map(order => order.id === id ? { ...order, ...changes } : order) ?? null)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-2xl bg-slate-950 p-6 text-white">
        <h1 className="text-2xl font-black">My Deliveries</h1>
        <p className="mt-1 text-sm text-slate-300">View assignments, update delivery status, and record parcel handovers.</p>
      </header>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {!orders && !error && <p role="status" className="text-sm text-slate-600">Loading deliveries…</p>}
      {orders?.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">No deliveries assigned yet.</p>}
      {orders?.map(order => (
        <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-xs font-semibold text-slate-600">{order.reference} · {order.trackingNumber}</p>
              <h2 className="mt-1 text-base font-black text-slate-900">{order.clientName || 'Customer delivery'}</h2>
              {order.deliveryAddress && <p className="mt-1 break-words text-sm text-slate-600">{order.deliveryAddress}</p>}
            </div>
            <StatusBadge status={order.deliveryStatus} />
          </div>
          <button type="button" aria-expanded={selected?.id === order.id} onClick={() => setSelectedId(selected?.id === order.id ? '' : order.id)} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800">
            {selected?.id === order.id ? 'Hide delivery details' : 'View delivery'}
          </button>
          {selected?.id === order.id && <DeliveryDetails order={order} onUpdate={changes => replaceOrder(order.id, changes)} />}
        </article>
      ))}
    </div>
  )
}

function DeliveryDetails({ order, onUpdate }: { order: Delivery; onUpdate: (changes: Partial<Delivery>) => void }) {
  const [nextStatus, setNextStatus] = useState('')
  const [reason, setReason] = useState('')
  const [arrival, setArrival] = useState('')
  const [recipient, setRecipient] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [preparing, setPreparing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null)
  const allowed = riderDeliveryTransitions[order.deliveryStatus] ?? []
  const needsReason = riderDeliveryNeedsReason(nextStatus)

  async function submit(event: FormEvent<HTMLFormElement>, complete: boolean) {
    event.preventDefault()
    if (busy || preparing) return
    const arrivedAt = new Date(arrival)
    if (complete && (!photos[0] || !Number.isFinite(arrivedAt.getTime()) || arrivedAt.getTime() > Date.now())) {
      setFeedback({ error: true, message: 'Enter the actual arrival date and time and capture a proof photo.' })
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/rider', {
        method: complete ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complete
          ? { orderId: order.id, arrivalDateTime: arrivedAt.toISOString(), imageData: photos[0], recipientName: recipient }
          : { orderId: order.id, status: nextStatus, reason: needsReason ? reason : undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to update this delivery.')
      onUpdate({ ...data.order, ...(complete ? { proofOfDelivery: data.proof } : {}) })
      setNextStatus('')
      setReason('')
      setFeedback({ error: false, message: complete ? 'Proof submitted. Delivery completed.' : 'Delivery status updated.' })
    } catch (error) {
      setFeedback({ error: true, message: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
      {order.items?.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg bg-slate-50 px-3">
          {order.items.map(item => <li key={item.id} className="flex justify-between gap-3 py-2 text-sm"><span>{item.name}</span><span className="shrink-0 font-semibold">{item.quantity} {item.unit || 'pcs'}</span></li>)}
        </ul>
      )}
      {allowed.length > 0 && (
        <form onSubmit={event => void submit(event, false)} className="space-y-3 rounded-xl border border-slate-200 p-3">
          <label className="block space-y-1 text-sm font-semibold">
            <span>New delivery status</span>
            <select className={field} value={nextStatus} onChange={event => setNextStatus(event.target.value)} required disabled={busy}>
              <option value="">Select status</option>
              {allowed.map(status => <option key={status} value={status}>{status.toLowerCase().replaceAll('_', ' ')}</option>)}
            </select>
          </label>
          {needsReason && <label className="block space-y-1 text-sm font-semibold"><span>Reason</span><textarea className={field} rows={2} required value={reason} onChange={event => setReason(event.target.value)} /></label>}
          <button type="submit" className={button} disabled={busy || preparing || !nextStatus || (needsReason && !reason.trim())}>Save status</button>
        </form>
      )}
      {order.deliveryStatus === 'IN_TRANSIT' && (
        <form onSubmit={event => void submit(event, true)} className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
          <h3 className="text-sm font-black text-emerald-950">Complete delivery</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm font-semibold"><span>Parcel arrival date and time</span><input className={field} type="datetime-local" required value={arrival} onChange={event => setArrival(event.target.value)} disabled={busy} /></label>
            <label className="block space-y-1 text-sm font-semibold"><span>Received by (optional)</span><input className={field} value={recipient} onChange={event => setRecipient(event.target.value)} disabled={busy} /></label>
          </div>
          <ReportPhotoPicker label="Proof of delivery photo (required)" photos={photos} onChange={setPhotos} onProcessing={setPreparing} maxPhotos={1} disabled={busy} />
          <button className={button} type="submit" disabled={busy || preparing || !arrival || !photos[0]}>Submit proof and complete delivery</button>
        </form>
      )}
      {order.proofOfDelivery && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
        <p>Parcel arrived {new Date(order.proofOfDelivery.deliveredAt).toLocaleString()}</p>
        {order.proofOfDelivery.recipientName && <p>Received by {order.proofOfDelivery.recipientName}</p>}
        <a href={order.proofOfDelivery.imageUrl} className="mt-2 inline-block font-bold underline">View proof photo</a>
      </div>}
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`text-sm font-semibold ${feedback.error ? 'text-red-700' : 'text-emerald-800'}`}>{feedback.message}</p>}
    </div>
  )
}
