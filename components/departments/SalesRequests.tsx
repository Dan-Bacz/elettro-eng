'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CartIcon, PackageIcon, SearchIcon } from '../admin/icons'

type InventoryItem = { id: string; name: string; sku: string | null; unit: string | null; quantity: number; category?: string | null; imageUrl?: string | null }
type RequestItem = { id: string; requestedQuantity: number; releasedQuantity: number; unit: string | null; inventoryItem: { name: string; sku: string | null; imageUrl?: string | null } }
type Request = { id: string; reference: string; status: string; customerReference: string | null; createdAt: string; items: RequestItem[]; releases: { receipt: { reference: string } | null }[] }
type Line = { inventoryItemId: string; quantity: string }

const MAX_REQUEST_LINES = 100
const MAX_QUANTITY = 1_000_000

function validQuantity(value: string) {
  const quantity = Number(value)
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY
}

const isFulfilled = (request: Request) => ['FULFILLED', 'REJECTED', 'CANCELLED'].includes(request.status)

function statusStyle(status: string) {
  if (status === 'FULFILLED') return 'bg-emerald-100 text-emerald-700'
  if (status === 'PARTIALLY_FULFILLED') return 'bg-blue-100 text-blue-700'
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-red-100 text-red-700'
  if (status === 'CANCELLATION_REQUESTED') return 'bg-orange-100 text-orange-700'
  if (status === 'UNDER_REVIEW') return 'bg-violet-100 text-violet-700'
  return 'bg-amber-100 text-amber-700'
}

export default function SalesRequests() {
  const router = useRouter()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cartNotice, setCartNotice] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const historyRef = useRef<HTMLDialogElement>(null)
  const historyTitleRef = useRef<HTMLHeadingElement>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'closed'>('all')
  const submissionKey = useRef<string | null>(null)

  const inventoryById = useMemo(() => new Map(inventory.map((item) => [item.id, item])), [inventory])

  const cartById = useMemo(() => new Map(lines.map((line) => [line.inventoryItemId, line])), [lines])
  const canSubmit = lines.length > 0 && lines.every((line) => inventoryById.has(line.inventoryItemId) && validQuantity(line.quantity))

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [inventoryResponse, requestResponse] = await Promise.all([fetch('/api/inventory'), fetch('/api/warehouse-requests')])
      if (inventoryResponse.status === 401 || requestResponse.status === 401) { router.push('/sales/login'); return }
      if (!inventoryResponse.ok || !requestResponse.ok) throw new Error('Could not load products or requests.')
      const [inventoryData, requestData] = await Promise.all([inventoryResponse.json(), requestResponse.json()])
      setInventory(inventoryData)
      setRequests(requestData.requests || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load sales data.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  function addProduct(item: InventoryItem) {
    submissionKey.current = null
    setLines((current) => {
      const existing = current.find((line) => line.inventoryItemId === item.id)
      if (existing) {
        const quantity = Math.min(MAX_QUANTITY, (Number(existing.quantity) || 0) + 1)
        return current.map((line) => line === existing ? { ...line, quantity: String(quantity) } : line)
      }
      if (current.length >= MAX_REQUEST_LINES) return current
      return [...current, { inventoryItemId: item.id, quantity: '1' }]
    })
    setCartNotice(`${item.name} added to your request cart.`)
  }

  function openCart() {
    setReviewing(false)
    setSubmitError('')
    dialogRef.current?.showModal()
  }

  function updateQuantity(id: string, quantity: string) {
    submissionKey.current = null
    setSubmitError('')
    setLines((current) => current.map((line) => line.inventoryItemId === id ? { ...line, quantity } : line))
  }

  function removeLine(id: string) {
    submissionKey.current = null
    setSubmitError('')
    setLines((current) => current.filter((line) => line.inventoryItemId !== id))
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reviewing || !canSubmit || saving || loading) return

    setSaving(true)
    setSubmitError('')
    setError('')
    setNotice('')
    try {
      submissionKey.current ??= window.crypto.randomUUID()
      const items = lines.map((line) => ({ inventoryItemId: line.inventoryItemId, quantity: Number(line.quantity) }))
      const response = await fetch('/api/warehouse-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, idempotencyKey: submissionKey.current }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not submit the warehouse request.')
      submissionKey.current = null
      setLines([])
      setCartNotice('')
      dialogRef.current?.close()
      setNotice(`Request ${data.request.reference} was sent to Warehouse.`)
      await load()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit the warehouse request.')
    } finally {
      setSaving(false)
    }
  }

  async function requestCancellation(request: Request) {
    if (!window.confirm(`Send a cancellation request for ${request.reference}? Warehouse must approve it.`)) return
    setCancellingId(request.id); setError(''); setNotice('')
    try {
      const response = await fetch('/api/warehouse-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: request.id, status: 'CANCELLATION_REQUESTED' }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not request cancellation.')
      setNotice(`Cancellation requested for ${request.reference}. Warehouse approval is required.`)
      await load()
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Could not request cancellation.')
    } finally {
      setCancellingId(null)
    }
  }

  const visibleInventory = inventory.filter((item) => !search.trim() || `${item.name} ${item.sku || ''} ${item.category || ''}`.toLowerCase().includes(search.toLowerCase()))
  const pendingRequests = requests.filter((request) => !isFulfilled(request))
  const fulfilledRequests = requests.filter(isFulfilled)
  const totalRequested = requests.reduce((total, request) => total + request.items.length, 0)

  const selectedRequest = requests.find((request) => request.id === selectedRequestId)

  useEffect(() => {
    if (historyRef.current?.open) historyTitleRef.current?.focus()
  }, [selectedRequestId])

  const visibleRequests = historyFilter === 'pending'
    ? pendingRequests
    : historyFilter === 'closed' ? fulfilledRequests : requests

  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8"><div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl" /><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300"><span className="h-1.5 w-1.5 rounded-full bg-yellow-300" /> Sales supply desk</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Warehouse requests</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Request the materials your counter needs, then track every handoff from warehouse release to fulfillment.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><div className="text-2xl font-black text-yellow-300">{pendingRequests.length}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Pending</div></div><div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><div className="text-2xl font-black text-emerald-300">{fulfilledRequests.length}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Closed</div></div><div className="hidden rounded-2xl bg-white/10 px-4 py-3 backdrop-blur sm:block"><div className="text-2xl font-black text-white">{totalRequested}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Line items</div></div></div></div></section>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}

    <section className="space-y-4">
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Request cart</p>
          <p role="status" className="mt-0.5 text-xs text-slate-600">{cartNotice || `Add up to ${MAX_REQUEST_LINES} different materials per request.`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openCart} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
            <CartIcon className="h-4 w-4" /> View cart ({lines.length})
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              setSelectedRequestId(null)
              historyRef.current?.showModal()
            }}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            Materials Requests
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-700">Build a request</p><h2 className="mt-1 text-xl font-black text-slate-900">Warehouse materials</h2><p className="mt-1 text-sm text-slate-500">Browse available products and add them to your next request.</p></div><div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search materials or SKU" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold shadow-sm outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 sm:w-72" /></div></div>{loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-slate-200" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{visibleInventory.map((item) => <article key={item.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg"><div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} width={160} height={160} className="h-full w-full object-contain transition duration-300 group-hover:scale-110" /> : <PackageIcon className="h-10 w-10 text-slate-300" />}</div><div className="px-1 pt-3"><div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">{item.category || 'Material'}</span><span className={`shrink-0 text-[10px] font-black ${item.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{item.quantity > 0 ? 'In stock' : 'Out'}</span></div><h3 className="mt-1 truncate text-sm font-black text-slate-900">{item.name}</h3><p className="mt-1 truncate font-mono text-[10px] text-slate-400">{item.sku || 'No SKU'} · {item.quantity} {item.unit || 'pcs'}</p><button type="button" onClick={() => addProduct(item)} disabled={item.quantity < 1 || (!cartById.has(item.id) && lines.length >= MAX_REQUEST_LINES) || Number(cartById.get(item.id)?.quantity) >= MAX_QUANTITY} className="mt-3 w-full rounded-xl bg-yellow-400 px-2 py-2.5 text-[11px] font-black text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">Add to request{cartById.has(item.id) && ` ? ${cartById.get(item.id)?.quantity || 0} in cart`}</button></div></article>)}</div>}{!loading && !visibleInventory.length && <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">No warehouse materials match your search.</div>}</section>

    <dialog
      ref={dialogRef}
      aria-labelledby="request-cart-title"
      onCancel={(event) => { if (saving) event.preventDefault() }}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/60"
    >
      <form onSubmit={submitRequest} className="flex max-h-[90dvh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="request-cart-title" className="text-xl font-black text-slate-900">{reviewing ? 'Review warehouse request' : 'Request cart'}</h2>
            <p className="mt-1 text-sm text-slate-600">{reviewing ? 'Confirm the quantity and unit for each material before sending.' : 'Check your selected materials, then continue to confirm quantities.'}</p>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Close</button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
          {lines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">Your request cart is empty.</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
              {lines.map((line) => {
                const item = inventoryById.get(line.inventoryItemId)
                const label = item?.name || 'Unavailable material'
                const unit = item?.unit || 'pcs'
                return (
                  <li key={line.inventoryItemId} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {item?.imageUrl ? <Image src={item.imageUrl} alt="" width={48} height={48} className="h-full w-full object-contain" /> : <PackageIcon className="h-5 w-5 text-slate-400" />}
                    </div>
                    <div className="min-w-28 flex-1">
                      <p className="break-words text-sm font-bold text-slate-900">{label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item ? [item.sku, `${item.quantity} ${unit} in Warehouse`].filter(Boolean).join(' ? ') : 'Remove this material to continue.'}</p>
                    </div>
                    {reviewing ? (
                      <label className="text-xs font-semibold text-slate-600">
                        Quantity ({unit})
                        <input
                          type="number"
                          min={1}
                          max={MAX_QUANTITY}
                          step={1}
                          required
                          disabled={saving}
                          value={line.quantity}
                          onChange={(event) => updateQuantity(line.inventoryItemId, event.target.value)}
                          aria-label={`Quantity for ${label} (${unit})`}
                          aria-invalid={!validQuantity(line.quantity)}
                          className="mt-1 block w-24 rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:border-yellow-500 aria-[invalid=true]:border-red-500"
                        />
                      </label>
                    ) : <span className="text-sm font-bold text-slate-700">{validQuantity(line.quantity) ? `${line.quantity} ${unit}` : 'Quantity required'}</span>}
                    <button type="button" aria-label={`Remove ${label}`} disabled={saving} onClick={() => removeLine(line.inventoryItemId)} className="rounded-lg px-2 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Remove</button>
                  </li>
                )
              })}
            </ul>
          )}
          {reviewing && lines.some((line) => !validQuantity(line.quantity)) && (
            <p className="mt-3 text-sm text-red-700">Enter a whole-number quantity from 1 to {MAX_QUANTITY.toLocaleString()} for each material.</p>
          )}
          {submitError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{submitError}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <span className="text-sm font-semibold text-slate-600">{lines.length} {lines.length === 1 ? 'material' : 'materials'} selected</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => reviewing ? setReviewing(false) : dialogRef.current?.close()} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">{reviewing ? 'Back to cart' : 'Keep browsing'}</button>
            {reviewing ? (
              <button key="submit" type="submit" disabled={saving || loading || !canSubmit} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50">{saving ? 'Submitting?' : 'Submit request'}</button>
            ) : (
              <button key="continue" type="button" disabled={!lines.length} onClick={() => setReviewing(true)} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50">Continue request</button>
            )}
          </div>
        </div>
      </form>
    </dialog>

    <dialog
      ref={historyRef}
      aria-labelledby="request-history-title"
      className="m-auto w-[calc(100%_-_2rem)] max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/60"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950 px-5 py-5 text-white sm:px-6">
          <div className="min-w-0">
            {selectedRequest && (
              <button type="button" onClick={() => setSelectedRequestId(null)} className="mb-2 text-xs font-semibold text-yellow-300 hover:underline">
                Back to requests
              </button>
            )}
            <h2 ref={historyTitleRef} tabIndex={-1} id="request-history-title" className="text-xl font-black">
              {selectedRequest ? `Request ${selectedRequest.reference}` : 'Materials Requests'}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {selectedRequest ? new Date(selectedRequest.createdAt).toLocaleString() : 'Track submitted requests and Warehouse releases.'}
            </p>
          </div>
          <button type="button" onClick={() => historyRef.current?.close()} className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">Close</button>
        </div>

        {error && <p role="alert" className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mx-5 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}

        {selectedRequest ? (
          <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Requested materials ({selectedRequest.items.length})</h3>
              <RequestStatus status={selectedRequest.status} />
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="bg-slate-100 text-xs font-bold text-slate-700">
                  <tr>
                    <th scope="col" className="px-4 py-3">Material</th>
                    <th scope="col" className="px-4 py-3">Unit</th>
                    <th scope="col" className="px-4 py-3 text-right">Requested</th>
                    <th scope="col" className="px-4 py-3 text-right">Released</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedRequest.items.map((item) => (
                    <tr key={item.id} className="even:bg-slate-50">
                      <th scope="row" className="px-4 py-3 font-semibold text-slate-900">
                        {item.inventoryItem.name}
                        {item.inventoryItem.sku && <span className="mt-1 block font-mono text-xs font-normal text-slate-500">{item.inventoryItem.sku}</span>}
                      </th>
                      <td className="px-4 py-3 text-slate-700">{item.unit || 'pcs'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.requestedQuantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.releasedQuantity.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {selectedRequest.releases.map(({ receipt }) => receipt && (
                <a key={receipt.reference} href={`/sales/receipts?reference=${encodeURIComponent(receipt.reference)}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-slate-50">
                  Receipt {receipt.reference}
                </a>
              ))}
              {['PENDING', 'UNDER_REVIEW'].includes(selectedRequest.status) && selectedRequest.releases.length === 0 && (
                <button
                  type="button"
                  onClick={() => void requestCancellation(selectedRequest)}
                  disabled={cancellingId === selectedRequest.id}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancellingId === selectedRequest.id ? 'Requesting...' : 'Request cancellation'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-4 sm:px-6">
              <label className="text-xs font-semibold text-slate-700">
                Request status
                <select value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value as typeof historyFilter)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
                  <option value="all">All requests ({requests.length})</option>
                  <option value="pending">Open ({pendingRequests.length})</option>
                  <option value="closed">Closed ({fulfilledRequests.length})</option>
                </select>
              </label>
              <a href="/sales/receipts" className="text-sm font-bold text-blue-700 hover:underline">Warehouse receipts</a>
            </div>

            <div className="min-h-0 overflow-auto border-t border-slate-200" aria-busy={loading}>
              <table className="w-full min-w-[380px] border-separate border-spacing-0 text-left text-sm">
                <caption className="sr-only">Submitted materials requests</caption>
                <thead className="sticky top-0 bg-slate-100 text-xs font-bold text-slate-700">
                  <tr>
                    <th scope="col" className="px-4 py-3 sm:pl-6">Request</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right sm:pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRequests.map((request) => (
                    <tr key={request.id} className="even:bg-slate-50 hover:bg-yellow-50/60">
                      <th scope="row" className="border-t border-slate-100 px-4 py-3 sm:pl-6">
                        <span className="whitespace-nowrap font-mono text-xs font-bold text-slate-950">{request.reference}</span>
                        <time dateTime={request.createdAt} className="mt-1 block text-xs font-normal text-slate-600">{new Date(request.createdAt).toLocaleString()}</time>
                      </th>
                      <td className="border-t border-slate-100 px-4 py-3"><RequestStatus status={request.status} /></td>
                      <td className="border-t border-slate-100 px-4 py-3 text-right sm:pr-6">
                        <button type="button" aria-label={`View details for ${request.reference}`} onClick={() => setSelectedRequestId(request.id)} className="whitespace-nowrap rounded-lg bg-yellow-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-yellow-400">
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibleRequests.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-slate-600">
                        {loading ? 'Loading requests...' : historyFilter === 'all' ? 'No materials requests have been submitted yet.' : 'No requests match this status.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </dialog>
  </div>
}

function RequestStatus({ status }: { status: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyle(status)}`}>{status.toLowerCase().replace(/_/g, ' ')}</span>
}
