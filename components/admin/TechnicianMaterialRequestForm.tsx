'use client'

import { useState, type FormEvent } from 'react'
import StatusBadge from './StatusBadge'

type InventoryItem = { id: string; name: string; sku?: string | null; unit?: string | null; quantity: number }
type MaterialRequest = {
  id: string
  techId: string
  material: string
  quantity: number
  unit?: string | null
  status: string
  reason?: string | null
  warehouseRequest?: {
    reference: string
    items: { id: string; requestedQuantity: number; unit?: string | null; inventoryItem: { name: string } }[]
  } | null
}
type Project = { id: string; title: string; materialRequests?: MaterialRequest[] }
type RequestLine = { item: InventoryItem; quantity: string }

const panel = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5'
const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400'

export default function TechnicianMaterialRequestForm({ bookings, technicianId, inventory, onRefresh }: {
  bookings: Project[]
  technicianId: string
  inventory: InventoryItem[]
  onRefresh: () => Promise<void>
}) {
  const [bookingId, setBookingId] = useState(bookings[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [lines, setLines] = useState<RequestLine[]>([])
  const [priority, setPriority] = useState('NORMAL')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const search = query.trim().toLowerCase()
  const selected = new Set(lines.map(line => line.item.id))
  const matches = inventory.filter(item => `${item.name} ${item.sku || ''}`.toLowerCase().includes(search))
  const history = bookings.flatMap(booking => (booking.materialRequests ?? [])
    .filter(request => request.techId === technicianId)
    .map(request => ({ ...request, project: booking.title })))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !bookingId || !lines.length) return
    setBusy(true)
    setNotice('')
    setError('')
    try {
      const response = await fetch('/api/material-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          reason,
          priority,
          items: lines.map(line => ({ inventoryItemId: line.item.id, quantity: Number(line.quantity) })),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to submit material request.')
      setLines([])
      setReason('')
      setNotice(`Request ${result.warehouseReference} submitted for admin approval.`)
    } catch (error) {
      setError((error as Error).message)
      return
    } finally {
      setBusy(false)
    }
    await onRefresh()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <form onSubmit={submit} className={panel}>
        <h2 className="text-base font-black text-slate-900">New material request</h2>
        <fieldset disabled={busy || !bookings.length} className="mt-4 space-y-4">
          <label className="block space-y-1 text-sm font-semibold">
            <span>Assigned project</span>
            <select className={input} value={bookingId} onChange={event => setBookingId(event.target.value)} required>
              <option value="" disabled>Select a project</option>
              {bookings.map(booking => <option key={booking.id} value={booking.id}>{booking.title}</option>)}
            </select>
          </label>
          <div className="space-y-2">
            <label className="block space-y-1 text-sm font-semibold">
              <span>Warehouse materials</span>
              <input className={input} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name or SKU" />
            </label>
            <ul className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {matches.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.quantity} {item.unit || 'pcs'} in stock{item.sku ? ` · ${item.sku}` : ''}</p>
                  </div>
                  <button type="button" disabled={selected.has(item.id) || lines.length >= 100} onClick={() => setLines(current => [...current, { item, quantity: '1' }])} className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900 disabled:opacity-50">
                    {selected.has(item.id) ? 'Added' : 'Add'}
                  </button>
                </li>
              ))}
              {!matches.length && <li className="p-3 text-sm text-slate-500">No warehouse materials found.</li>}
            </ul>
          </div>
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <h3 className="text-sm font-bold text-slate-900">Request items ({lines.length})</h3>
            {!lines.length && <p className="text-xs text-slate-600">Add materials from the warehouse list and set the quantity for each.</p>}
            {lines.map(({ item, quantity }) => (
              <div key={item.id} className="flex flex-wrap items-end gap-2 rounded-lg bg-white p-2 sm:flex-nowrap">
                <p className="min-w-0 basis-full break-words text-sm font-semibold sm:flex-1">{item.name}</p>
                <label className="w-24 text-xs font-semibold">
                  Qty ({item.unit || 'pcs'})
                  <input aria-label={`Quantity for ${item.name}`} className={input} type="number" min="1" max="1000000" step="1" required value={quantity} onChange={event => setLines(current => current.map(line => line.item.id === item.id ? { ...line, quantity: event.target.value } : line))} />
                </label>
                <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setLines(current => current.filter(line => line.item.id !== item.id))} className="rounded-lg px-2 py-2 text-xs font-bold text-red-700">Remove</button>
              </div>
            ))}
          </div>
          <label className="block space-y-1 text-sm font-semibold">
            <span>Priority</span>
            <select className={input} value={priority} onChange={event => setPriority(event.target.value)}>
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm font-semibold">
            <span>Reason (optional)</span>
            <textarea className={input} rows={2} value={reason} onChange={event => setReason(event.target.value)} />
          </label>
        </fieldset>
        {bookings.length === 0 && <p className="mt-3 text-sm text-slate-600">You need an assigned project to submit a request.</p>}
        <button type="submit" disabled={busy || !bookingId || !lines.length} className="mt-4 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
        {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </form>
      <section className={`${panel} self-start`}>
        <h2 className="text-base font-black text-slate-900">Request history</h2>
        {!history.length && <p className="mt-3 text-sm text-slate-600">No material requests yet.</p>}
        <div className="mt-3 space-y-3">
          {history.map(request => (
            <details key={request.id} className="rounded-xl border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                {request.warehouseRequest?.reference || request.material}
              </summary>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-600">{request.project}</span>
                <StatusBadge status={request.status} />
              </div>
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {request.warehouseRequest?.items.length
                  ? request.warehouseRequest.items.map(item => <li key={item.id} className="flex justify-between gap-2 py-1"><span>{item.inventoryItem.name}</span><span className="shrink-0 font-semibold">{item.requestedQuantity} {item.unit || 'pcs'}</span></li>)
                  : <li className="py-1">{request.material} · {request.quantity} {request.unit || 'pcs'}</li>}
              </ul>
              {request.reason && <p className="mt-2 text-xs text-slate-600">{request.reason}</p>}
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
