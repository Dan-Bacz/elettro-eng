'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const searchRef = useRef<HTMLInputElement>(null)

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
  const total = cartDetails.reduce((sum, line) => sum + Number(line.item?.sellPrice || 0) * line.quantity, 0)
  const totalUnits = cart.reduce((sum, line) => sum + line.quantity, 0)
  const filtered = stock.filter((item) => {
    if (category !== 'ALL' && item.category !== category) return false
    const searchable = `${item.name} ${item.sku || ''} ${item.category || ''}`.toLowerCase()
    return !query.trim() || searchable.includes(query.trim().toLowerCase())
  })

  function add(item: SalesStockItem) {
    if (!item.availableQuantity || item.sellPrice == null) return
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

  function clearCart() {
    if (!cart.length || window.confirm('Clear all items from this sale?')) {
      setCart([])
      setNotice('')
      setError('')
    }
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    const exact = stock.find((item) => item.sku?.toLowerCase() === query.trim().toLowerCase() || item.name.toLowerCase() === query.trim().toLowerCase())
    if (exact) {
      add(exact)
      setQuery('')
    }
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
      searchRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create sale.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ready to sell</div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">New Sale</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Scan, search, or select products to add to the cart.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sales/stock" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm hover:bg-slate-50">View stock</Link>
          <button type="button" onClick={clearCart} disabled={!cart.length} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-40">Clear cart</button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</div>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1"><SearchIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input ref={searchRef} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Search product, SKU, model, or scan barcode…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-xs font-bold text-slate-800 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-100" /></div>
            <span className="text-[11px] font-bold text-slate-400">{filtered.length} products</span>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-black transition ${category === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{item === 'ALL' ? 'All' : item}</button>)}</div>
          {loading ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-56 animate-pulse rounded-xl bg-slate-100" />)}</div> : filtered.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-10 text-center"><PackageIcon className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-2 text-sm font-black text-slate-600">No matching Sales stock</p><Link href="/sales/requests" className="mt-2 inline-block text-xs font-black text-yellow-700 hover:underline">Request products from Warehouse →</Link></div> : <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => { const inStock = item.availableQuantity > 0; const lowStock = inStock && item.availableQuantity <= 5; return <article key={item.id} className="group rounded-xl border border-slate-200 bg-white p-3 transition hover:border-yellow-400 hover:shadow-md"><div className="relative flex h-28 items-center justify-center overflow-hidden rounded-lg bg-slate-50 p-2">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full max-w-full object-contain transition group-hover:scale-105" /> : <PackageIcon className="h-10 w-10 text-slate-300" />}<span className={`absolute right-2 top-2 rounded-md px-2 py-1 text-[9px] font-black ${!inStock ? 'bg-red-100 text-red-700' : lowStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{!inStock ? 'Out of stock' : lowStock ? 'Low stock' : 'In stock'}</span></div><div className="mt-3"><h2 className="truncate text-xs font-black text-slate-900">{item.name}</h2><p className="mt-1 truncate font-mono text-[10px] text-slate-400">{item.sku || 'No SKU'}</p><div className="mt-2 flex items-end justify-between gap-2"><div><div className="text-[9px] font-bold uppercase text-slate-400">Available</div><div className="text-xs font-black text-slate-700">{item.availableQuantity} {item.unit || 'pcs'}</div></div><div className="text-right text-xs font-black text-yellow-700">{item.sellPrice != null ? money(Number(item.sellPrice)) : 'No price'}</div></div><button type="button" onClick={() => add(item)} disabled={!inStock || item.sellPrice == null} className="mt-3 flex w-full items-center justify-center rounded-lg bg-yellow-400 py-2 text-[11px] font-black text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">{!inStock ? 'Unavailable' : '＋ Add to cart'}</button></div></article> })}</div>}
        </section>

        <form onSubmit={submit} className="sticky top-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
          <div className="flex items-center justify-between bg-yellow-400 px-4 py-3.5 text-slate-900"><div className="flex items-center gap-2"><span className="text-xl">🛒</span><div><h2 className="text-sm font-black">Current Sale</h2><p className="text-[10px] font-bold text-slate-700">Checkout summary</p></div></div><span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black text-white">{totalUnits} units</span></div>
          <div className="max-h-[min(46vh,420px)] min-h-[150px] space-y-3 overflow-y-auto p-4">{cartDetails.length === 0 ? <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center"><div className="text-2xl">🛒</div><p className="mt-2 text-xs font-black text-slate-700">Cart is empty</p><p className="mt-1 text-[10px] text-slate-400">Select products to start a sale.</p></div> : cartDetails.map(({ item, inventoryItemId, quantity }) => <div key={inventoryItemId} className="flex gap-2 border-b border-slate-100 pb-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">{item?.imageUrl ? <img src={item.imageUrl} alt="" className="h-7 w-7 object-contain" /> : <PackageIcon className="h-4 w-4 text-slate-300" />}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{item?.name}</div><div className="mt-0.5 text-[10px] text-slate-500">{item?.sku || 'No SKU'} · {money(Number(item?.sellPrice || 0))}</div><div className="mt-1.5 flex items-center gap-1"><button type="button" aria-label={`Decrease ${item?.name}`} onClick={() => update(inventoryItemId, quantity - 1)} className="h-6 w-6 rounded-md bg-slate-100 text-xs font-black hover:bg-slate-200">−</button><span className="w-6 text-center text-xs font-black">{quantity}</span><button type="button" aria-label={`Increase ${item?.name}`} onClick={() => update(inventoryItemId, quantity + 1)} className="h-6 w-6 rounded-md bg-slate-100 text-xs font-black hover:bg-slate-200">+</button><button type="button" onClick={() => update(inventoryItemId, 0)} className="ml-2 text-[10px] font-bold text-red-500 hover:underline">Remove</button></div></div><div className="text-right text-xs font-black text-slate-900">{money(Number(item?.sellPrice || 0) * quantity)}</div></div>)}</div>
          <div className="space-y-3 border-t border-slate-100 bg-slate-50 p-4"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name (optional)" maxLength={200} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-yellow-400" /><input value={customerContact} onChange={(event) => setCustomerContact(event.target.value)} placeholder="Customer contact (optional)" maxLength={100} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-yellow-400" /></div><div className="flex items-center justify-between border-t border-slate-200 pt-3"><span className="text-xs font-bold text-slate-500">Total due</span><span className="text-2xl font-black text-slate-900">{money(total)}</span></div><button disabled={saving || !cart.length} className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black text-slate-900 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Completing sale…' : 'Complete Sale'}</button><p className="text-center text-[10px] font-medium text-slate-400">Available stock is checked again securely at checkout.</p></div>
        </form>
      </div>
    </div>
  )
}
