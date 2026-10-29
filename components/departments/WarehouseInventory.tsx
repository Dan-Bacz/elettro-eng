'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import InventoryModal from '../admin/InventoryModal'
import type { InventoryItemObj } from '../admin/types'

type StockStatus = 'IN' | 'LOW' | 'OUT'
type SortKey = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc' | 'sales-quantity' | 'sales-revenue'
type SalesPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM'

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
  { value: 'sales-quantity', label: 'Sales Qty High-Low' },
  { value: 'sales-revenue', label: 'Sales Revenue High-Low' },
]

type SalesMetric = { units: number; orders: number; revenue: number }

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateDaysAgo(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return dateInputValue(date)
}

function money(value: number | null | undefined, decimals = 2) {
  const n = Number(value ?? 0)
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export default function WarehouseInventory() {
  const [items, setItems] = useState<InventoryItemObj[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [stockFilter, setStockFilter] = useState<StockStatus | 'ALL'>('ALL')
  const [sort, setSort] = useState<SortKey>('newest')
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('DAY')
  const [salesFrom, setSalesFrom] = useState(dateInputValue(new Date()))
  const [salesTo, setSalesTo] = useState(dateInputValue(new Date()))
  const [sales, setSales] = useState<Record<string, SalesMetric>>({})
  const [salesSummary, setSalesSummary] = useState({ orders: 0, units: 0, revenue: 0 })
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesError, setSalesError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItemObj | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory')
      if (!res.ok) throw new Error('Failed to load inventory')
      setItems(await res.json())
      setLoadError('')
    } catch (e: any) {
      setLoadError(e.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const loadSales = useCallback(async (from: string, to: string) => {
    setSalesLoading(true)
    try {
      const response = await fetch(`/api/warehouse-sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load sales summary')
      setSales(Object.fromEntries((data.sales || []).map((item: SalesMetric & { inventoryItemId: string }) => [item.inventoryItemId, item])))
      setSalesSummary(data.summary || { orders: 0, units: 0, revenue: 0 })
      setSalesError('')
    } catch (e: any) {
      setSalesError(e.message || 'Could not load sales summary')
    } finally {
      setSalesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (salesPeriod === 'DAY') {
      const today = dateInputValue(new Date())
      setSalesFrom(today)
      setSalesTo(today)
    } else if (salesPeriod === 'WEEK') {
      setSalesFrom(dateDaysAgo(6))
      setSalesTo(dateInputValue(new Date()))
    } else if (salesPeriod === 'MONTH') {
      setSalesFrom(dateDaysAgo(29))
      setSalesTo(dateInputValue(new Date()))
    }
  }, [salesPeriod])

  useEffect(() => {
    if (salesFrom && salesTo) void loadSales(salesFrom, salesTo)
  }, [loadSales, salesFrom, salesTo])

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
      case 'sales-quantity':
        sorted.sort((a, b) => (sales[b.id]?.units || 0) - (sales[a.id]?.units || 0))
        break
      case 'sales-revenue':
        sorted.sort((a, b) => (sales[b.id]?.revenue || 0) - (sales[a.id]?.revenue || 0))
        break
      default:
        sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    }
    return sorted
  }, [items, query, category, stockFilter, sort, sales])

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
    { label: 'Sales Orders', value: salesSummary.orders, icon: 'cart', className: 'text-blue-600 bg-blue-100' },
    { label: 'Units Sold', value: salesSummary.units, icon: 'sales', className: 'text-emerald-600 bg-emerald-100' },
    { label: 'Sales Revenue', value: money(salesSummary.revenue), icon: 'money', className: 'text-violet-600 bg-violet-100' },
  ]

  async function handleSubmitItem(data: Record<string, any>) {
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Failed to create item')
      setModalOpen(false)
      setEditingItem(null)
      await load()
    } catch (e: any) {
      setSubmitError(e.message || 'Failed to create item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Inventory & Stock</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">Manage electrical products, materials, equipment, and current stock levels.</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null)
            setModalOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-black text-black shadow-sm transition-colors hover:bg-yellow-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card) => (
          <div key={card.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
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
              {(card.icon === 'cart' || card.icon === 'sales' || card.icon === 'money') && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2.4 11.2a2 2 0 002 1.6h7.8a2 2 0 002-1.6L21 7H6m3 13h.01M17 20h.01M9 11h8" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black leading-none text-slate-900">{card.value}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales period */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">Sales performance</h2>
            <p className="mt-0.5 text-xs text-slate-500">Customer sales only; internal warehouse requests are excluded.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Period
              <select value={salesPeriod} onChange={(e) => setSalesPeriod(e.target.value as SalesPeriod)} className={`${selectClass} mt-1 block`}>
                <option value="DAY">Today</option>
                <option value="WEEK">Last 7 days</option>
                <option value="MONTH">Last 30 days</option>
                <option value="CUSTOM">Custom dates</option>
              </select>
            </label>
            <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">From
              <input type="date" value={salesFrom} onChange={(e) => { setSalesPeriod('CUSTOM'); setSalesFrom(e.target.value) }} className={`${selectClass} mt-1 block`} />
            </label>
            <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">To
              <input type="date" value={salesTo} onChange={(e) => { setSalesPeriod('CUSTOM'); setSalesTo(e.target.value) }} className={`${selectClass} mt-1 block`} />
            </label>
          </div>
        </div>
        {salesError && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{salesError}</div>}
        {salesLoading && <div className="mt-3 text-xs font-semibold text-blue-700">Updating sales totals…</div>}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 text-4xl">📦</div>
            <h3 className="text-sm font-bold text-slate-900">No inventory items yet</h3>
            <p className="mt-1 text-xs text-slate-500">Add your first item to get started.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-black">#</th>
                <th className="px-3 py-3 font-black">Product</th>
                <th className="px-3 py-3 font-black">Manufacturer / Brand</th>
                <th className="px-3 py-3 font-black">Model / SKU</th>
                <th className="px-3 py-3 font-black">Category</th>
                <th className="px-3 py-3 text-right font-black">Buy Price</th>
                <th className="px-3 py-3 text-right font-black">Sell Price</th>
                <th className="px-3 py-3 text-center font-black">Sold</th>
                <th className="px-3 py-3 text-right font-black">Sales</th>
                <th className="px-3 py-3 text-center font-black">Stock</th>
                <th className="px-3 py-3 text-center font-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item, idx) => {
                const status = statusBadge[stockOf(item)]
                const q = Number(item.quantity) || 0
                const itemSales = sales[item.id] || { units: 0, orders: 0, revenue: 0 }
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
                    <td className="px-3 py-2.5 text-center"><div className="text-xs font-black text-blue-700">{itemSales.units}</div><div className="text-[9px] text-slate-400">{itemSales.orders} orders</div></td>
                    <td className="px-3 py-2.5 text-right text-xs font-black text-emerald-700">{money(itemSales.revenue)}</td>
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
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 text-4xl">📦</div>
            <h3 className="text-sm font-bold text-slate-900">No inventory items yet</h3>
            <p className="mt-1 text-xs text-slate-500">Add your first item to get started.</p>
          </div>
        ) : (
          visible.map((item) => {
            const status = statusBadge[stockOf(item)]
            const q = Number(item.quantity) || 0
            const itemSales = sales[item.id] || { units: 0, orders: 0, revenue: 0 }
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
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
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Sold</div>
                    <div className="text-xs font-black text-blue-700">{itemSales.units}</div>
                  </div>
                </div>
                <div className="mt-2 text-right text-[11px] font-bold text-emerald-700">Sales: {money(itemSales.revenue)} · {itemSales.orders} order(s)</div>

              </div>
            )
          })
        )}
      </div>

      {/* Inventory Modal */}
      <InventoryModal
        open={modalOpen}
        initial={editingItem}
        categories={categories}
        submitting={submitting}
        error={submitError}
        onSubmit={handleSubmitItem}
        onClose={() => {
          setModalOpen(false)
          setEditingItem(null)
          setSubmitError('')
        }}
      />
    </div>
  )
}
