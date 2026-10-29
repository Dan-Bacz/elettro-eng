'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { SalesStockItem } from './SalesStock'

type CartLine = { inventoryItemId: string; quantity: number }

export default function SalesPOS() {
  const [stock, setStock] = useState<SalesStockItem[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try { const response = await fetch('/api/sales-sales'); if (!response.ok) throw new Error('Could not load Sales stock.'); const data = await response.json(); setStock(data.stock || []) } catch (err) { setError(err instanceof Error ? err.message : 'Could not load Sales stock.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const stockById = useMemo(() => new Map(stock.map((item) => [item.id, item])), [stock])
  const total = cart.reduce((sum, line) => sum + (Number(stockById.get(line.inventoryItemId)?.sellPrice || 0) * line.quantity), 0)
  const filtered = stock.filter((item) => !query.trim() || `${item.name} ${item.sku || ''} ${item.category || ''}`.toLowerCase().includes(query.toLowerCase()))

  function add(item: SalesStockItem) {
    setError(''); setNotice('')
    setCart((current) => { const existing = current.find((line) => line.inventoryItemId === item.id); if (existing) return current.map((line) => line.inventoryItemId === item.id ? { ...line, quantity: Math.min(item.availableQuantity, line.quantity + 1) } : line); return [...current, { inventoryItemId: item.id, quantity: 1 }] })
  }

  function update(id: string, quantity: number) {
    const max = stockById.get(id)?.availableQuantity || 0
    if (quantity <= 0) setCart((current) => current.filter((line) => line.inventoryItemId !== id))
    else setCart((current) => current.map((line) => line.inventoryItemId === id ? { ...line, quantity: Math.min(max, quantity) } : line))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!cart.length) { setError('Add products from Sales stock first.'); return }
    setSaving(true); setError(''); setNotice('')
    try { const response = await fetch('/api/sales-sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart, customerName, customerContact }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not create sale.'); setNotice(`Sale ${data.sale.reference} created successfully.`); setCart([]); setCustomerName(''); setCustomerContact(''); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Could not create sale.') } finally { setSaving(false) }
  }

  return <div className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-700">Point of sale</p><h1 className="mt-1 text-2xl font-black text-slate-900">Create Sale</h1><p className="mt-1 text-sm text-slate-500">Sell only from stock physically received and acknowledged by Sales.</p></div><Link href="/sales/stock" className="text-xs font-black text-slate-600 hover:underline">View Sales stock →</Link></div>{error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}{notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}<div className="grid gap-6 xl:grid-cols-[1fr_360px]"><section className="space-y-4"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Sales stock…" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm focus:border-yellow-400 focus:outline-none" />{loading ? <div className="p-6 text-sm text-slate-500">Loading Sales stock…</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="h-24 rounded-xl bg-slate-50 p-2 text-center">{item.imageUrl ? <img src={item.imageUrl} alt="" className="mx-auto h-full max-w-full object-contain" /> : <div className="pt-5 text-xs font-bold text-slate-300">NO IMAGE</div>}</div><h2 className="mt-3 truncate text-sm font-black text-slate-900">{item.name}</h2><p className="mt-1 text-xs text-emerald-700">{item.availableQuantity} {item.unit || 'pcs'} available</p><button type="button" onClick={() => add(item)} disabled={!item.availableQuantity} className="mt-3 w-full rounded-xl bg-yellow-400 px-3 py-2 text-xs font-black text-slate-900 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">Add to sale</button></article>)}</div>}</section><form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-black text-slate-900">Current sale</h2><div className="space-y-2">{cart.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">Add available stock to begin.</p> : cart.map((line) => { const item = stockById.get(line.inventoryItemId)!; return <div key={line.inventoryItemId} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3"><div className="min-w-0"><div className="truncate text-xs font-black text-slate-800">{item.name}</div><div className="text-[11px] text-slate-500">₱{Number(item.sellPrice || 0).toLocaleString()} each</div></div><input type="number" min={1} max={item.availableQuantity} value={line.quantity} onChange={(e) => update(line.inventoryItemId, Number(e.target.value))} className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold" /></div>})}</div><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name (optional)" maxLength={200} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} placeholder="Customer contact (optional)" maxLength={100} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" /><div className="flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs font-bold text-slate-500">Total</span><span className="text-xl font-black text-slate-900">₱{total.toLocaleString()}</span></div><button disabled={saving || !cart.length} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-40">{saving ? 'Saving sale…' : 'Complete sale'}</button></form></div></div>
}
