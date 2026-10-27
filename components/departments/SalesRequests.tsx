'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type InventoryItem = { id: string; name: string; sku: string | null; unit: string | null; quantity: number; sellPrice: number | null }
type RequestItem = { id: string; requestedQuantity: number; releasedQuantity: number; unavailableQuantity: number; unit: string | null; inventoryItem: { name: string; sku: string | null } }
type Request = {
  id: string
  reference: string
  status: string
  customerReference: string | null
  projectReference: string | null
  notes: string | null
  createdAt: string
  items: RequestItem[]
  releases: { receipt: { reference: string } | null }[]
}

export default function SalesRequests() {
  const router = useRouter()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [lines, setLines] = useState<{ inventoryItemId: string; quantity: number }[]>([])
  const [customerReference, setCustomerReference] = useState('')
  const [projectReference, setProjectReference] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const inventoryById = useMemo(() => new Map(inventory.map((item) => [item.id, item])), [inventory])

  const load = useCallback(async () => {
    try {
      const [inventoryResponse, requestResponse] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/warehouse-requests'),
      ])
      if (inventoryResponse.status === 401 || requestResponse.status === 401) {
        router.push('/admin/login')
        return
      }
      if (!inventoryResponse.ok || !requestResponse.ok) throw new Error('Could not load products or requests.')
      const [inventoryData, requestData] = await Promise.all([inventoryResponse.json(), requestResponse.json()])
      setInventory(inventoryData)
      setRequests(requestData.requests)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load sales data.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  function addLine() {
    const item = inventoryById.get(selectedId)
    const amount = Number(quantity)
    if (!item || !Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
      setError('Select a product and enter a whole-number quantity greater than zero.')
      return
    }
    if (lines.some((line) => line.inventoryItemId === item.id)) {
      setError('That product is already in this request.')
      return
    }
    setError('')
    setLines((current) => [...current, { inventoryItemId: item.id, quantity: amount }])
    setQuantity('1')
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lines.length) {
      setError('Add at least one product to the request.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/warehouse-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines,
          customerReference,
          projectReference,
          notes,
          idempotencyKey: window.crypto.randomUUID(),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not submit the warehouse request.')
      setLines([])
      setCustomerReference('')
      setProjectReference('')
      setNotes('')
      setNotice(`Request ${data.request.reference} was sent to warehouse.`)
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit the warehouse request.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Warehouse Requests</h1>
        <p className="mt-1 text-sm text-slate-500">Submit material requests and track warehouse verification, releases, and receipts.</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}

      <form onSubmit={submitRequest} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-black text-slate-900">New Request</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Customer / job reference
            <input value={customerReference} onChange={(event) => setCustomerReference(event.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Project reference
            <input value={projectReference} onChange={(event) => setProjectReference(event.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select a product…</option>
            {inventory.map((item) => <option key={item.id} value={item.id}>{item.name}{item.sku ? ` · ${item.sku}` : ''} · stock ${item.quantity}</option>)}
          </select>
          <input type="number" min={1} max={1_000_000} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label="Requested quantity" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-36" />
          <button type="button" onClick={addLine} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold hover:bg-slate-50">Add item</button>
        </div>
        {lines.length > 0 && (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {lines.map((line) => {
              const item = inventoryById.get(line.inventoryItemId)
              return <div key={line.inventoryItemId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-700">{item?.name} · {line.quantity} {item?.unit || 'pcs'}</span>
                <button type="button" onClick={() => setLines((current) => current.filter((entry) => entry.inventoryItemId !== line.inventoryItemId))} className="text-xs font-bold text-red-600">Remove</button>
              </div>
            })}
          </div>
        )}
        <label className="block text-xs font-bold text-slate-600">Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <button disabled={saving || loading} className="rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-black text-black hover:bg-yellow-500 disabled:opacity-50">
          {saving ? 'Submitting…' : 'Send to warehouse'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-base font-black text-slate-900">My Requests</h2>
        {loading ? <p className="text-sm text-slate-500">Loading requests…</p> : requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No warehouse requests yet.</div>
        ) : requests.map((request) => (
          <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="font-black text-slate-800">{request.reference}</h3><p className="text-xs text-slate-500">{request.customerReference || 'No customer reference'} · {new Date(request.createdAt).toLocaleString()}</p></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{request.status.replace(/_/g, ' ')}</span>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {request.items.map((item) => <li key={item.id}>{item.inventoryItem.name}: {item.releasedQuantity}/{item.requestedQuantity} {item.unit || 'pcs'} released</li>)}
            </ul>
            {request.releases.map((release) => release.receipt && (
              <a key={release.receipt.reference} href={`/sales/receipts?reference=${encodeURIComponent(release.receipt.reference)}`} className="mt-3 inline-block text-xs font-bold text-blue-700 underline">
                Receipt {release.receipt.reference}
              </a>
            ))}
          </article>
        ))}
      </section>
    </div>
  )
}
