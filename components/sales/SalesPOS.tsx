'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PackageIcon, SearchIcon } from '../admin/icons'
import type { SalesStockItem } from './SalesStock'

type CartLine = { inventoryItemId: string; quantity: number }

const money = (value: number) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function SalesPOS() {
  const [stock, setStock] = useState<SalesStockItem[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sales-sales')
      if (!response.ok) throw new Error('Could not load Sales stock.')
      const data = await response.json()
      setStock(data.stock || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Sales stock.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const categories = useMemo(() => ['ALL', ...Array.from(new Set(stock.map((item) => item.category).filter(Boolean) as string[]))], [stock])
  const stockById = useMemo(() => new Map(stock.map((item) => [item.id, item])), [stock])
  const cartDetails = cart.map((line) => ({ ...line, item: stockById.get(line.inventoryItemId) })).filter((line) => line.item)
  const totalUnits = cart.reduce((sum, line) => sum + line.quantity, 0)
  const total = cartDetails.reduce((sum, line) => sum + Number(line.item?.sellPrice || 0) * line.quantity, 0)
  const filtered = stock.filter((item) => {
    if (category !== 'ALL' && item.category !== category) return false
    const text = `${item.name} ${item.sku || ''} ${item.category || ''}`.toLowerCase()
    return !query.trim() || text.includes(query.toLowerCase())
  })

  function add(item: SalesStockItem) {
    setError('')
    setNotice('')
    setCart((current) => {
      const existing = current.find((line) => line.inventoryItemId === item.id)
      if (existing) return current.map((line) => line.inventoryItemId === item.id ? { ...line, quantity: Math.min(item.availableQuantity, line.quantity + 1) } : line)
      return [...current, { inventoryItemId: item.id, quantity: 1 }]
    })
  }

  function update(id: string, quantity: number) {
    const max = stockById.get(id)?.availableQuantity || 0
    if (quantity <= 0) setCart((current) => current.filter((line) => line.inventoryItemId !== id))
    else setCart((current) => current.map((line) => line.inventoryItemId === id ? { ...line, quantity: Math.min(max, quantity) } : line))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!cart.length) { setError('Add products to the sale first.'); return }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/sales-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, customerName, customerContact }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not create sale.')
      setNotice(`Sale ${data.sale.reference} completed successfully.`)
      setCart([])
      setCustomerName('')
      setCustomerContact('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create sale.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-[#111820] px-5 py-5 text-white shadow-xl shadow-slate-300/30 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Sales counter open</div>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Create Sale</h1>
            <p className="mt-1 text-xs font-medium text-slate-300">Choose from stock received by Sales, build the customer&apos;s basket, and complete the sale.</p>
          </div>
          <Link href="/sales/stock" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-center text-xs font-black text-white transition hover:bg-white/15">View Sales stock →</Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 px-4 py-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Products ready</div><div className="mt-1 text-xl font-black">{stock.filter((item) => item.availableQuantity > 0).length}</div></div><div className="rounded-2xl bg-white/10 px-4 py-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Basket items</div><div className="mt-1 text-xl font-black">{totalUnits}</div></div><div className="col-span-2 rounded-2xl bg-yellow-400 px-4 py-3 text-slate-900 sm:col-span-1"><div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Current total</div><div className="mt-1 text-xl font-black">{money(total)}</div></div></div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-base font-black text-slate-900">Products &amp; materials</h2><p className="mt-0.5 text-xs text-slate-500">Tap a product to add it to the customer basket.</p></div>
            <div className="relative w-full lg:w-72"><SearchIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-yellow-400 focus:bg-white" /></div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-black transition ${category === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{item === 'ALL' ? 'All products' : item}</button>)}</div>
          {loading ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl bg-slate-100" />)}</div> : filtered.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-10 text-center"><PackageIcon className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-600">No Sales stock matches this search.</p><Link href="/sales/requests" className="mt-2 inline-block text-xs font-black text-yellow-700 hover:underline">Request materials from Warehouse →</Link></div> : <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <article key={item.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-yellow-400 hover:shadow-lg"><div className="relative flex h-32 items-center justify-center bg-slate-50 p-3">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full max-w-full object-contain transition group-hover:scale-105" /> : <PackageIcon className="h-10 w-10 text-slate-300" />}<span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[9px] font-black ${item.availableQuantity ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{item.availableQuantity} {item.unit || 'pcs'}</span></div><div className="p-3"><div className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">{item.category || 'Material'}</div><h3 className="mt-1 truncate text-sm font-black text-slate-900">{item.name}</h3><div className="mt-2 flex items-center justify-between"><span className="font-mono text-[10px] text-slate-400">{item.sku || 'No SKU'}</span><span className="text-xs font-black text-yellow-700">{item.sellPrice != null ? money(Number(item.sellPrice)) : 'No price'}</span></div><button type="button" onClick={() => add(item)} disabled={!item.availableQuantity || item.sellPrice == null} className="mt-3 w-full rounded-xl bg-yellow-400 py-2.5 text-[11px] font-black text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">Add to basket</button></div></article>)}</div>}
        </section>

        <form onSubmit={submit} className="sticky top-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white"><div><h2 className="text-base font-black">Customer basket</h2><p className="mt-0.5 text-[11px] text-slate-400">Receipt preview</p></div><span className="rounded-full bg-yellow-400 px-2.5 py-1 text-[10px] font-black text-slate-900">{cart.length} lines</span></div>
          <div className="max-h-[360px] space-y-3 overflow-y-auto p-5">{cartDetails.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center"><div className="text-3xl">🛒</div><p className="mt-2 text-xs font-black text-slate-700">Basket is empty</p><p className="mt-1 text-[11px] text-slate-400">Add a product to start this sale.</p></div> : cartDetails.map(({ item, inventoryItemId, quantity }) => <div key={inventoryItemId} className="flex gap-3 border-b border-slate-100 pb-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">{item?.imageUrl ? <img src={item.imageUrl} alt="" className="h-8 w-8 object-contain" /> : <PackageIcon className="h-5 w-5 text-slate-300" />}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{item?.name}</div><div className="mt-0.5 text-[11px] text-slate-500">{money(Number(item?.sellPrice || 0))} each</div><div className="mt-2 flex items-center gap-1"><button type="button" onClick={() => update(inventoryItemId, quantity - 1)} className="h-6 w-6 rounded-md bg-slate-100 text-xs font-black hover:bg-slate-200">−</button><span className="w-7 text-center text-xs font-black">{quantity}</span><button type="button" onClick={() => update(inventoryItemId, quantity + 1)} className="h-6 w-6 rounded-md bg-slate-100 text-xs font-black hover:bg-slate-200">+</button><button type="button" onClick={() => update(inventoryItemId, 0)} className="ml-2 text-[10px] font-bold text-red-500 hover:underline">Remove</button></div></div><div className="text-right text-xs font-black text-slate-900">{money(Number(item?.sellPrice || 0) * quantity)}</div></div>)}</div>
          <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 p-5"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name (optional)" maxLength={200} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-yellow-400" /><input value={customerContact} onChange={(event) => setCustomerContact(event.target.value)} placeholder="Contact number (optional)" maxLength={100} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-yellow-400" /></div><div className="flex items-center justify-between border-t border-slate-200 pt-3"><span className="text-xs font-bold text-slate-500">Total due</span><span className="text-2xl font-black text-slate-900">{money(total)}</span></div><button disabled={saving || !cart.length} className="w-full rounded-2xl bg-yellow-400 px-4 py-3.5 text-xs font-black text-slate-900 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Completing sale…' : 'Complete sale'}</button><p className="text-center text-[10px] font-medium text-slate-400">Stock is checked again securely when the sale is saved.</p></div>
        </form>
      </div>
    </div>
  )
}
