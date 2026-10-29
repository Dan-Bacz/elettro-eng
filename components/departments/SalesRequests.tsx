'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { PackageIcon } from '../admin/icons'

type InventoryItem = { id: string; name: string; sku: string | null; unit: string | null; quantity: number; category?: string | null; imageUrl?: string | null }
type RequestItem = { id: string; requestedQuantity: number; releasedQuantity: number; unit: string | null; inventoryItem: { name: string; sku: string | null } }
type Request = { id: string; reference: string; status: string; customerReference: string | null; createdAt: string; items: RequestItem[]; releases: { receipt: { reference: string } | null }[] }
type Line = { inventoryItemId: string; quantity: number }

export default function SalesRequests() {
  const router = useRouter()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [search, setSearch] = useState('')
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
      const response = await fetch('/api/warehouse-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lines, customerReference, projectReference, notes, idempotencyKey: window.crypto.randomUUID() }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not submit the warehouse request.')
      setLines([]); setCustomerReference(''); setProjectReference(''); setNotes(''); setNotice(`Request ${data.request.reference} was sent to warehouse.`); await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit the warehouse request.')
    } finally {
      setSaving(false)
    }
  }

  const visibleInventory = inventory.filter((item) => !search.trim() || `${item.name} ${item.sku || ''} ${item.category || ''}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-7">
      <div><h1 className="text-2xl font-black text-slate-900">Warehouse Requests</h1><p className="mt-1 text-sm text-slate-500">Select the materials you need from Warehouse, then continue the request below.</p></div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-base font-black text-slate-900">Warehouse materials</h2><p className="mt-1 text-xs text-slate-500">Browse product images and add what Sales needs.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search materials or SKU..." className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm outline-none focus:border-yellow-400 sm:w-64" /></div>
        {loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-56 animate-pulse rounded-xl bg-slate-200" />)}</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{visibleInventory.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-yellow-400 hover:shadow-md"><div className="flex h-32 items-center justify-center rounded-lg bg-slate-50">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} width={140} height={140} className="h-full w-full object-contain" /> : <PackageIcon className="h-10 w-10 text-slate-300" />}</div><div className="mt-3"><div className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">{item.category || 'Material'}</div><h3 className="mt-1 truncate text-xs font-black text-slate-800">{item.name}</h3><p className="mt-1 text-[10px] text-slate-500">{item.sku || 'No SKU'} · Warehouse stock: {item.quantity} {item.unit || 'pcs'}</p><button type="button" onClick={() => addProduct(item)} className="mt-3 w-full rounded-lg bg-yellow-400 px-2 py-2.5 text-[11px] font-black text-slate-900 hover:bg-yellow-300">Add to request</button></div></article>)}</div>}
        {!loading && !visibleInventory.length && <div className="border-y border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">No warehouse materials match your search.</div>}
      </section>

      <form onSubmit={submitRequest} className="space-y-5 border-t border-slate-200 pt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-black text-slate-900">Your request</h2><p className="text-xs text-slate-500">Review the selected materials, add details, then continue.</p></div><span className="text-xs font-black text-slate-400">{lines.length} material{lines.length === 1 ? '' : 's'} selected</span></div>
        {lines.length ? <div className="divide-y divide-slate-100 border-y border-slate-200 bg-white">{lines.map((line) => { const item = inventoryById.get(line.inventoryItemId); return <div key={line.inventoryItemId} className="flex items-center gap-3 px-2 py-3 sm:px-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-50">{item?.imageUrl ? <Image src={item.imageUrl} alt="" width={48} height={48} className="h-full w-full object-contain" /> : <PackageIcon className="h-5 w-5 text-slate-300" />}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{item?.name}</div><div className="text-[10px] text-slate-500">{item?.sku || 'No SKU'} · {item?.unit || 'pcs'}</div></div><input type="number" min={1} max={1_000_000} value={line.quantity} onChange={(event) => updateQuantity(line.inventoryItemId, Number(event.target.value))} aria-label={`Quantity for ${item?.name}`} className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-center text-xs font-black" /><button type="button" onClick={() => setLines((current) => current.filter((entry) => entry.inventoryItemId !== line.inventoryItemId))} className="text-xs font-bold text-red-600 hover:underline">Remove</button></div>})}</div> : <div className="border-y border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">No materials selected yet. Add products above to begin.</div>}
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Customer / job reference<input value={customerReference} onChange={(event) => setCustomerReference(event.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-slate-600">Project reference<input value={projectReference} onChange={(event) => setProjectReference(event.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label></div>
        <label className="block text-xs font-bold text-slate-600">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
        <button disabled={saving || loading || !lines.length} className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black text-black shadow-sm hover:bg-yellow-500 disabled:opacity-50">{saving ? 'Submitting...' : 'Continue request'}</button>
      </form>

      <section className="space-y-3 border-t border-slate-200 pt-6"><h2 className="text-base font-black text-slate-900">My Requests</h2>{loading ? <p className="text-sm text-slate-500">Loading requests...</p> : requests.length === 0 ? <div className="border-y border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">No warehouse requests yet.</div> : requests.map((request) => <article key={request.id} className="border-b border-slate-200 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black text-slate-800">{request.reference}</h3><p className="text-xs text-slate-500">{request.customerReference || 'No customer reference'} · {new Date(request.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{request.status.replace(/_/g, ' ')}</span></div><ul className="mt-3 space-y-1 text-sm text-slate-700">{request.items.map((item) => <li key={item.id}>{item.inventoryItem.name}: {item.releasedQuantity}/{item.requestedQuantity} {item.unit || 'pcs'} released</li>)}</ul>{request.releases.map((release) => release.receipt && <a key={release.receipt.reference} href={`/sales/receipts?reference=${encodeURIComponent(release.receipt.reference)}`} className="mt-3 inline-block text-xs font-bold text-blue-700 underline">Receipt {release.receipt.reference}</a>)}</article>)}</section>
    </div>
  )
}
