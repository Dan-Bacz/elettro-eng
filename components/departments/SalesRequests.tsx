'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { PackageIcon, SearchIcon } from '../admin/icons'

type InventoryItem = { id: string; name: string; sku: string | null; unit: string | null; quantity: number; category?: string | null; imageUrl?: string | null }
type RequestItem = { id: string; requestedQuantity: number; releasedQuantity: number; unit: string | null; inventoryItem: { name: string; sku: string | null; imageUrl?: string | null } }
type Request = { id: string; reference: string; status: string; customerReference: string | null; createdAt: string; items: RequestItem[]; releases: { receipt: { reference: string } | null }[] }
type Line = { inventoryItemId: string; quantity: number }

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

  const inventoryById = useMemo(() => new Map(inventory.map((item) => [item.id, item])), [inventory])

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
    setError('')
    setLines((current) => {
      const existing = current.find((line) => line.inventoryItemId === item.id)
      if (existing) return current.map((line) => line.inventoryItemId === item.id ? { ...line, quantity: Math.min(1_000_000, line.quantity + 1) } : line)
      return [...current, { inventoryItemId: item.id, quantity: 1 }]
    })
  }

  function updateQuantity(id: string, quantity: number) {
    const next = Math.max(1, Math.min(1_000_000, Number(quantity) || 1))
    setLines((current) => current.map((line) => line.inventoryItemId === id ? { ...line, quantity: next } : line))
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lines.length) { setError('Add at least one product to the request.'); return }
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/warehouse-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lines, idempotencyKey: window.crypto.randomUUID() }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not submit the warehouse request.')
      setLines([]); setNotice(`Request ${data.request.reference} was sent to warehouse.`); await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit the warehouse request.')
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

  function requestCard(request: Request) {
    const releasedCount = request.items.reduce((total, item) => total + item.releasedQuantity, 0)
    const requestedCount = request.items.reduce((total, item) => total + item.requestedQuantity, 0)
    const progress = requestedCount ? Math.min(100, Math.round((releasedCount / requestedCount) * 100)) : 0

    return <article key={request.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-300 hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div><div className="flex items-center gap-2"><span className="font-mono text-xs font-black text-slate-900">{request.reference}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusStyle(request.status)}`}>{request.status.replace(/_/g, ' ')}</span></div><p className="mt-1 text-xs text-slate-400">Requested {new Date(request.createdAt).toLocaleString()}</p></div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-right"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Fulfillment</div><div className="text-sm font-black text-slate-800">{releasedCount}/{requestedCount} units</div></div>
      </div>
      <div className="space-y-4 px-5 py-4">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-yellow-400'}`} style={{ width: `${progress}%` }} /></div>
        <div className="grid gap-2 sm:grid-cols-2">
          {request.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-100">{item.inventoryItem.imageUrl ? <Image src={item.inventoryItem.imageUrl} alt={item.inventoryItem.name} width={44} height={44} className="h-full w-full object-contain" /> : <PackageIcon className="h-5 w-5 text-slate-300" />}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{item.inventoryItem.name}</div><div className="mt-0.5 text-[10px] font-semibold text-slate-500">{item.releasedQuantity}/{item.requestedQuantity} {item.unit || 'pcs'} released</div></div></div>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">{request.releases.map((release) => release.receipt && <a key={release.receipt.reference} href={`/sales/receipts?reference=${encodeURIComponent(release.receipt.reference)}`} className="inline-flex items-center text-xs font-black text-blue-700 hover:underline">View warehouse receipt {release.receipt.reference} →</a>)}{['PENDING', 'UNDER_REVIEW'].includes(request.status) && request.releases.length === 0 && <button type="button" onClick={() => void requestCancellation(request)} disabled={cancellingId === request.id} className="rounded-lg border border-red-200 px-3 py-2 text-[11px] font-black text-red-600 transition hover:bg-red-50 disabled:opacity-50">{cancellingId === request.id ? 'Requesting...' : 'Request cancellation'}</button>}</div>
      </div>
    </article>
  }

  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8"><div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl" /><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300"><span className="h-1.5 w-1.5 rounded-full bg-yellow-300" /> Sales supply desk</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Warehouse requests</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Request the materials your counter needs, then track every handoff from warehouse release to fulfillment.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><div className="text-2xl font-black text-yellow-300">{pendingRequests.length}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Pending</div></div><div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><div className="text-2xl font-black text-emerald-300">{fulfilledRequests.length}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Fulfilled</div></div><div className="hidden rounded-2xl bg-white/10 px-4 py-3 backdrop-blur sm:block"><div className="text-2xl font-black text-white">{totalRequested}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Line items</div></div></div></div></section>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}

    <section className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-700">Build a request</p><h2 className="mt-1 text-xl font-black text-slate-900">Warehouse materials</h2><p className="mt-1 text-sm text-slate-500">Browse available products and add them to your next request.</p></div><div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search materials or SKU" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold shadow-sm outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 sm:w-72" /></div></div>{loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-slate-200" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{visibleInventory.map((item) => <article key={item.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg"><div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} width={160} height={160} className="h-full w-full object-contain transition duration-300 group-hover:scale-110" /> : <PackageIcon className="h-10 w-10 text-slate-300" />}</div><div className="px-1 pt-3"><div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">{item.category || 'Material'}</span><span className={`shrink-0 text-[10px] font-black ${item.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{item.quantity > 0 ? 'In stock' : 'Out'}</span></div><h3 className="mt-1 truncate text-sm font-black text-slate-900">{item.name}</h3><p className="mt-1 truncate font-mono text-[10px] text-slate-400">{item.sku || 'No SKU'} · {item.quantity} {item.unit || 'pcs'}</p><button type="button" onClick={() => addProduct(item)} disabled={item.quantity < 1} className="mt-3 w-full rounded-xl bg-yellow-400 px-2 py-2.5 text-[11px] font-black text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">Add to request</button></div></article>)}</div>}{!loading && !visibleInventory.length && <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">No warehouse materials match your search.</div>}</section>

    <form onSubmit={submitRequest} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-700">Ready to send</p><h2 className="mt-1 text-xl font-black text-slate-900">Your request</h2><p className="mt-1 text-xs text-slate-500">Review quantities before sending the request to Warehouse.</p></div><span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-black text-white">{lines.length} material{lines.length === 1 ? '' : 's'} selected</span></div><div className="p-5 sm:p-6">{lines.length ? <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">{lines.map((line) => { const item = inventoryById.get(line.inventoryItemId); return <div key={line.inventoryItemId} className="flex items-center gap-3 p-3 sm:gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50">{item?.imageUrl ? <Image src={item.imageUrl} alt="" width={48} height={48} className="h-full w-full object-contain" /> : <PackageIcon className="h-5 w-5 text-slate-300" />}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{item?.name}</div><div className="mt-1 text-[10px] text-slate-500">{item?.sku || 'No SKU'} · {item?.unit || 'pcs'}</div></div><input type="number" min={1} max={1_000_000} value={line.quantity} onChange={(event) => updateQuantity(line.inventoryItemId, Number(event.target.value))} aria-label={`Quantity for ${item?.name}`} className="w-20 rounded-xl border border-slate-200 px-2 py-2.5 text-center text-xs font-black outline-none focus:border-yellow-400" /><button type="button" onClick={() => setLines((current) => current.filter((entry) => entry.inventoryItemId !== line.inventoryItemId))} className="rounded-lg px-2 py-2 text-xs font-bold text-red-500 hover:bg-red-50">Remove</button></div>})}</div> : <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">No materials selected yet. Add products above to begin.</div>}<div className="mt-5 flex justify-end"><button disabled={saving || loading || !lines.length} className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black text-slate-900 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Submitting...' : 'Continue request'}</button></div></div></form>

    <section className="space-y-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Request history</p><h2 className="mt-1 text-xl font-black text-slate-900">Track your materials</h2><p className="mt-1 text-sm text-slate-500">Pending requests stay visible until Warehouse completes them.</p></div><a href="/sales/receipts" className="text-xs font-black text-blue-700 hover:underline">Open warehouse receipts →</a></div>{loading ? <div className="h-48 animate-pulse rounded-2xl bg-slate-200" /> : requests.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">No requests yet. Your submitted requests will appear here.</div> : <div className="space-y-8"><div><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><span className="h-2 w-2 rounded-full bg-amber-400" /> Pending requests</h3><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">{pendingRequests.length}</span></div>{pendingRequests.length ? <div className="grid gap-4 lg:grid-cols-2">{pendingRequests.map(requestCard)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs font-semibold text-slate-500">No pending requests. Everything is up to date.</div>}</div><div><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Fulfilled and closed</h3><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">{fulfilledRequests.length}</span></div>{fulfilledRequests.length ? <div className="grid gap-4 lg:grid-cols-2">{fulfilledRequests.map(requestCard)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs font-semibold text-slate-500">Completed requests will appear here.</div>}</div></div>}</section>
  </div>
}

