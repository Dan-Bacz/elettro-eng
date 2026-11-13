'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PackageIcon, SearchIcon } from '../admin/icons'

export type SalesStockItem = {
  id: string
  name: string
  sku: string | null
  unit: string | null
  sellPrice: number | null
  imageUrl: string | null
  category: string | null
  releasedQuantity: number
  soldQuantity: number
  availableQuantity: number
}

const money = (value: number) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function SalesStock() {
  const [stock, setStock] = useState<SalesStockItem[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
  const filteredStock = useMemo(() => stock.filter((item) => {
    const matchesCategory = category === 'ALL' || item.category === category
    const searchText = `${item.name} ${item.sku || ''} ${item.category || ''}`.toLowerCase()
    return matchesCategory && searchText.includes(query.trim().toLowerCase())
  }), [category, query, stock])
  const totalUnits = stock.reduce((total, item) => total + item.availableQuantity, 0)
  const totalValue = stock.reduce((total, item) => total + item.availableQuantity * Number(item.sellPrice || 0), 0)

  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8"><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl" /><div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" /><div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Counter inventory</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Sales stock</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Materials received and accepted by Sales are ready for your counter and POS transactions.</p></div><Link href="/sales/pos" className="inline-flex items-center justify-center rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black text-slate-900 shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300">Open Point of Sale <span className="ml-2 text-base">→</span></Link></div></section>

    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Available products</div><div className="mt-2 text-2xl font-black text-slate-900">{stock.length}</div><div className="mt-1 text-xs font-semibold text-slate-500">Ready for sale</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Available units</div><div className="mt-2 text-2xl font-black text-emerald-600">{totalUnits.toLocaleString()}</div><div className="mt-1 text-xs font-semibold text-slate-500">Across received stock</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Stock value</div><div className="mt-2 text-2xl font-black text-yellow-700">{money(totalValue)}</div><div className="mt-1 text-xs font-semibold text-slate-500">At current selling prices</div></div></section>

    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

    <section className="space-y-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-700">Ready to sell</p><h2 className="mt-1 text-xl font-black text-slate-900">Received materials</h2><p className="mt-1 text-sm text-slate-500">Search by product, SKU, or category.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stock" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold shadow-sm outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 sm:w-64" /></div><div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-[10px] font-black transition ${category === item ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{item === 'ALL' ? 'All' : item}</button>)}</div></div></div>

      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl bg-slate-200" />)}</div> : filteredStock.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100"><PackageIcon className="h-8 w-8 text-slate-300" /></div><h3 className="mt-4 text-base font-black text-slate-800">{stock.length ? 'No matching stock' : 'No Sales stock yet'}</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{stock.length ? 'Try another search or category.' : 'Materials will appear here after Sales receives and accepts a Warehouse release.'}</p>{!stock.length && <Link href="/sales/receipts" className="mt-5 inline-flex rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-slate-900 hover:bg-yellow-300">View materials received</Link>}</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredStock.map((item) => <article key={item.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-yellow-300 hover:shadow-xl"><div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 p-5"><span className="absolute left-3 top-3 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">In stock</span>{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full max-w-full object-contain transition duration-500 group-hover:scale-110" /> : <PackageIcon className="h-14 w-14 text-slate-300" />}</div><div className="space-y-3 p-4"><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.category || 'Material'}</div><h3 className="mt-1 truncate text-base font-black text-slate-900">{item.name}</h3><p className="mt-1 font-mono text-[10px] text-slate-400">{item.sku || 'No SKU'}</p></div><div className="flex items-end justify-between border-t border-slate-100 pt-3"><div><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Available</div><div className="mt-1 text-xl font-black text-emerald-700">{item.availableQuantity.toLocaleString()} <span className="text-xs font-bold text-slate-500">{item.unit || 'pcs'}</span></div></div><div className="text-right"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Selling price</div><div className="mt-1 text-sm font-black text-yellow-700">{item.sellPrice != null ? money(Number(item.sellPrice)) : 'Not set'}</div></div></div></div></article>)}</div>}
    </section>
  </div>
}

