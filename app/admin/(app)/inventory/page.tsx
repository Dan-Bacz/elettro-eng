'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import EmptyState from '../../../../components/admin/EmptyState'
import type { InventoryItemObj } from '../../../../components/admin/types'

type StockStatus = 'IN' | 'LOW' | 'OUT'
type SortKey = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc'

const BASE_CATEGORIES = [
  'Lighting',
  'Circuit Breakers',
  'Wires & Cables',
  'Panels & Boards',
  'Switches & Outlets',
  'Conduits & Fittings',
  'Tools & Accessories',
  'Other',
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'stock-asc', label: 'Stock Low-High' },
  { value: 'stock-desc', label: 'Stock High-Low' },
]

function money(value: number | null | undefined, decimals = 2) {
  const n = Number(value ?? 0)
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export default function AdminInventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<InventoryItemObj[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [stockFilter, setStockFilter] = useState<StockStatus | 'ALL'>('ALL')
  const [sort, setSort] = useState<SortKey>('newest')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to load inventory')
      }
      setItems(await res.json())
      setLoadError('')
    } catch (e: any) {
      setLoadError(e.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  function stockOf(item: InventoryItemObj): StockStatus {
    const q = Number(item.quantity) || 0
    if (q === 0) return 'OUT'
    if (q <= Number(item.reorderLevel ?? 10)) return 'LOW'
    return 'IN'
  }

  const categories = useMemo(() => {
    const set = new Set<string>(BASE_CATEGORIES)
    items.forEach((i) => {
      if (i.category) set.add(i.category)
    })
    return Array.from(set).sort((a, b) => {
      const aBase = BASE_CATEGORIES.indexOf(a)
      const bBase = BASE_CATEGORIES.indexOf(b)
      if (aBase !== -1 && bBase !== -1) return aBase - bBase
      if (aBase !== -1) return -1
      if (bBase !== -1) return 1
      return a.localeCompare(b)
    })
  }, [items])

  const summary = useMemo(() => {
    let totalItems = 0
    let lowStock = 0
    let outOfStock = 0
    let inventoryValue = 0
    for (const item of items) {
      const q = Number(item.quantity) || 0
      totalItems += 1
      if (q === 0) outOfStock += 1
      else if (q <= Number(item.reorderLevel ?? 10)) lowStock += 1
      const cost = item.buyPrice != null ? Number(item.buyPrice) : Number(item.sellPrice ?? 0)
      inventoryValue += (Number.isFinite(cost) ? cost : 0) * q
    }
    return { totalItems, lowStock, outOfStock, inventoryValue }
  }, [items])

  const analytics = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    const healthy = Math.max(0, summary.totalItems - summary.lowStock - summary.outOfStock)
    const healthRate = summary.totalItems ? Math.round((healthy / summary.totalItems) * 100) : 0
    const categoryBreakdown = Array.from(
      items.reduce((map, item) => {
        const key = item.category || 'Uncategorized'
        map.set(key, (map.get(key) || 0) + 1)
        return map
      }, new Map<string, number>())
    ).sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { totalUnits, healthy, healthRate, categoryBreakdown }
  }, [items, summary])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = items.filter((i) => {
      const matchesCategory = category === 'ALL' || i.category === category
      const matchesStock = stockFilter === 'ALL' || stockOf(i) === stockFilter
      const matchesQuery =
        !q ||
        (i.name || '').toLowerCase().includes(q) ||
        (i.sku || '').toLowerCase().includes(q) ||
        (i.brand || '').toLowerCase().includes(q) ||
        (i.model || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      return matchesCategory && matchesStock && matchesQuery
    })
    const sorted = [...filtered]
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
        break
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'stock-asc':
        sorted.sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0))
        break
      case 'stock-desc':
        sorted.sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0))
        break
      default:
        sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    }
    return sorted
  }, [items, query, category, stockFilter, sort])

  const statusBadge: Record<StockStatus, { label: string; className: string }> = {
    IN: { label: 'IN STOCK', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    LOW: { label: 'LOW STOCK', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    OUT: { label: 'OUT OF STOCK', className: 'bg-red-50 text-red-600 border-red-200' },
  }

  const selectClass =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400'

  const statCards = [
    { label: 'Total Items', value: summary.totalItems, icon: 'box', className: 'text-slate-700 bg-slate-100' },
    { label: 'Low Stock', value: summary.lowStock, icon: 'alert', className: 'text-amber-600 bg-amber-100' },
    { label: 'Out of Stock', value: summary.outOfStock, icon: 'x', className: 'text-red-600 bg-red-100' },
    { label: 'Inventory Value', value: money(summary.inventoryValue), icon: 'tag', className: 'text-yellow-600 bg-yellow-100' },
  ]

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#122b35] to-[#08727f] p-6 text-white shadow-[0_28px_60px_-30px_rgba(15,23,42,0.8)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">Warehouse visibility</span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Inventory command center</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">Monitor electrical products, materials, equipment, and stock health from one organized warehouse view.</p>
          </div>
          <p className="max-w-xs rounded-2xl border border-white/15 bg-white/10 p-4 text-xs font-semibold leading-5 text-slate-200">Read-only overview for Admin. Stock receipts, adjustments, releases, and warehouse movements remain controlled by Warehouse.</p>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
          {[['Items', summary.totalItems], ['Units', analytics.totalUnits], ['Healthy', `${analytics.healthRate}%`], ['Value', money(summary.inventoryValue, 0)]].map(([label, value]) => <div key={label}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div></div>)}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_35px_-22px_rgba(15,23,42,0.7)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-20px_rgba(15,23,42,0.45)]">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100 transition group-hover:scale-125" />
            <div className="relative flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.className}`}>
              {card.icon === 'box' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
              {card.icon === 'alert' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              )}
              {card.icon === 'x' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {card.icon === 'tag' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black leading-none text-slate-900">{card.value}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{card.label}</div>
            </div>
            </div>
          </div>
        ))}
      </div>

      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_280px]">
        <div>
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Stock intelligence</p><h2 className="mt-1 text-lg font-black text-slate-900">Category distribution</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">{items.length} SKUs</span></div>
          <div className="mt-5 space-y-3">
            {analytics.categoryBreakdown.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No category data available yet.</p> : analytics.categoryBreakdown.map(([name, count]) => {
              const width = Math.round((count / Math.max(summary.totalItems, 1)) * 100)
              return <div key={name}><div className="mb-1 flex justify-between text-xs font-bold text-slate-600"><span>{name}</span><span>{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600" style={{ width: `${width}%` }} /></div></div>
            })}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white shadow-inner">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Stock health</p>
          <div className="mt-5 flex items-end gap-2"><span className="text-4xl font-black">{analytics.healthRate}%</span><span className="pb-1 text-xs text-slate-300">healthy items</span></div>
          <p className="mt-2 text-xs leading-5 text-slate-300">{summary.lowStock} low-stock and {summary.outOfStock} out-of-stock items need attention.</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" style={{ width: `${analytics.healthRate}%` }} /></div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 lg:max-w-md">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, SKU, brand or model..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as StockStatus | 'ALL')} className={selectClass}>
            <option value="ALL">All Stock Status</option>
            <option value="IN">In Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{loadError}</div>}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon="📦"
            title={items.length === 0 ? 'No inventory items yet' : 'No items match your filters'}
            message={items.length === 0 ? 'No inventory items have been created.' : 'Try adjusting the search or filters.'}
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-[#173b44] text-[10px] uppercase tracking-wider text-white/60">
                <th className="px-4 py-3 font-black">#</th>
                <th className="px-3 py-3 font-black">Product</th>
                <th className="px-3 py-3 font-black">Manufacturer / Brand</th>
                <th className="px-3 py-3 font-black">Model / SKU</th>
                <th className="px-3 py-3 font-black">Category</th>
                <th className="px-3 py-3 text-right font-black">Buy Price</th>
                <th className="px-3 py-3 text-right font-black">Sell Price</th>
                <th className="px-3 py-3 text-center font-black">Stock</th>
                <th className="px-3 py-3 text-center font-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item, idx) => {
                const status = statusBadge[stockOf(item)]
                const q = Number(item.quantity) || 0
                return (
                  <tr key={item.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-yellow-50/40">
                    <td className="px-4 py-2.5 text-xs font-bold text-slate-300">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="h-9 w-9 shrink-0 rounded-lg border border-slate-100 object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
                            <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-slate-800">{item.name}</div>
                          <div className="truncate text-[10px] text-slate-400">{item.sku || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-medium text-slate-600">{item.brand || '—'}</td>
                    <td className="px-3 py-2.5 text-xs font-medium text-slate-600">{item.model || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        {item.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">{item.buyPrice != null ? money(item.buyPrice) : '—'}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">{item.sellPrice != null ? money(item.sellPrice) : '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="text-xs font-black text-slate-800">{q}</div>
                      <div className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{item.unit || 'pcs'}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${status.className}`}>{status.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon="📦"
            title={items.length === 0 ? 'No inventory items yet' : 'No items match your filters'}
            message={items.length === 0 ? 'No inventory items have been created.' : 'Try adjusting the search or filters.'}
          />
        ) : (
          visible.map((item) => {
            const status = statusBadge[stockOf(item)]
            const q = Number(item.quantity) || 0
            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_28px_-22px_rgba(15,23,42,0.65)]">
                <div className="flex items-start gap-3">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="h-12 w-12 shrink-0 rounded-lg border border-slate-100 object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
                      <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate text-sm font-bold text-slate-800">{item.name}</div>
                      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${status.className}`}>{status.label}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-400">
                      {[item.brand, item.model, item.category].filter(Boolean).join(' · ') || 'Uncategorized'}
                    </div>
                    {item.sku && <div className="mt-0.5 text-[10px] font-medium text-slate-300">SKU: {item.sku}</div>}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50/70 p-2.5 text-center">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Buy</div>
                    <div className="text-xs font-bold text-slate-700">{item.buyPrice != null ? money(item.buyPrice) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Sell</div>
                    <div className="text-xs font-bold text-slate-700">{item.sellPrice != null ? money(item.sellPrice) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Stock</div>
                    <div className="text-xs font-black text-slate-800">
                      {q} <span className="font-medium text-slate-400">{item.unit || 'pcs'}</span>
                    </div>
                  </div>
                </div>

              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
