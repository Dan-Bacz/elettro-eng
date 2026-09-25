'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmDialog from '../../../../components/admin/ConfirmDialog'
import EmptyState from '../../../../components/admin/EmptyState'
import InventoryModal from '../../../../components/admin/InventoryModal'
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
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
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

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItemObj | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [showDelete, setShowDelete] = useState<InventoryItemObj | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 4000)
  }, [])

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

  function openAdd() {
    setEditingItem(null)
    setSaveError('')
    setModalOpen(true)
  }

  function openEdit(item: InventoryItemObj) {
    setEditingItem(item)
    setSaveError('')
    setModalOpen(true)
  }

  async function handleSave(data: Record<string, any>) {
    setSubmitting(true)
    setSaveError('')
    try {
      const method = editingItem ? 'PUT' : 'POST'
      const res = await fetch('/api/inventory', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem ? { id: editingItem.id, ...data } : data),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to save item')
      }
      setModalOpen(false)
      setEditingItem(null)
      showToast('success', editingItem ? 'Item updated successfully' : 'Item added to inventory')
      await load()
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save item')
    } finally {
      setSubmitting(false)
    }
  }

  async function adjustQuantity(id: string, delta: number) {
    const item = items.find((i) => i.id === id)
    if (!item) return
    if (delta < 0 && Number(item.quantity) <= 0) return
    setBusyId(id)
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity: Math.max(0, Number(item.quantity) + delta) }),
      })
      if (!res.ok) throw new Error('Failed to update quantity')
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, Number(i.quantity) + delta) } : i)))
    } catch {
      showToast('error', 'Failed to update quantity')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    if (!showDelete) return
    setBusyId(showDelete.id)
    try {
      const res = await fetch('/api/inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: showDelete.id }),
      })
      if (!res.ok) throw new Error('Failed to delete item')
      setItems((prev) => prev.filter((i) => i.id !== showDelete.id))
      setShowDelete(null)
      showToast('success', 'Item deleted')
    } catch (e: any) {
      showToast('error', e.message || 'Failed to delete item')
    } finally {
      setBusyId(null)
    }
  }

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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Inventory</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">Manage electrical products, materials, equipment, and stock levels.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-black text-black transition-colors hover:bg-yellow-500"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          + Add Item
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black leading-none text-slate-900">{card.value}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{card.label}</div>
            </div>
          </div>
        ))}
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
          <EmptyState
            icon="📦"
            title={items.length === 0 ? 'No inventory items yet' : 'No items match your filters'}
            message={items.length === 0 ? 'Add your first product to start tracking stock.' : 'Try adjusting the search or filters.'}
            action={items.length === 0 ? (
              <button
                type="button"
                onClick={openAdd}
                className="rounded-lg bg-yellow-400 px-4 py-2 text-xs font-black text-black transition-colors hover:bg-yellow-500"
              >
                + Add Item
              </button>
            ) : undefined}
          />
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
                <th className="px-3 py-3 text-center font-black">Stock</th>
                <th className="px-3 py-3 text-center font-black">Status</th>
                <th className="px-4 py-3 text-right font-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item, idx) => {
                const status = statusBadge[stockOf(item)]
                const q = Number(item.quantity) || 0
                const busy = busyId === item.id
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
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustQuantity(item.id, -1)}
                          disabled={busy || q <= 0}
                          aria-label="Decrease stock"
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-xs font-black text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>
                        <div className="w-16 text-center">
                          <div className="text-xs font-black text-slate-800">{q}</div>
                          <div className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{item.unit || 'pcs'}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustQuantity(item.id, 1)}
                          disabled={busy}
                          aria-label="Increase stock"
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-xs font-black text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDelete(item)}
                          className="rounded-md border border-red-100 px-2.5 py-1.5 text-[10px] font-bold text-red-500 transition-colors hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
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
            message={items.length === 0 ? 'Add your first product to start tracking stock.' : 'Try adjusting the search or filters.'}
            action={items.length === 0 ? (
              <button
                type="button"
                onClick={openAdd}
                className="rounded-lg bg-yellow-400 px-4 py-2 text-xs font-black text-black transition-colors hover:bg-yellow-500"
              >
                + Add Item
              </button>
            ) : undefined}
          />
        ) : (
          visible.map((item) => {
            const status = statusBadge[stockOf(item)]
            const q = Number(item.quantity) || 0
            const busy = busyId === item.id
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
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustQuantity(item.id, -1)}
                      disabled={busy || q <= 0}
                      aria-label="Decrease stock"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-sm font-black text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustQuantity(item.id, 1)}
                      disabled={busy}
                      aria-label="Increase stock"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-sm font-black text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDelete(item)}
                      className="rounded-md border border-red-100 px-3 py-1.5 text-[10px] font-bold text-red-500 transition-colors hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add / Edit modal */}
      <InventoryModal
        open={modalOpen}
        initial={editingItem}
        categories={categories}
        submitting={submitting}
        error={saveError}
        onSubmit={handleSave}
        onClose={() => !submitting && setModalOpen(false)}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!showDelete}
        title="Delete Product?"
        message={
          showDelete
            ? `This will permanently remove "${showDelete.name}" from your inventory. This action cannot be undone.`
            : 'This will permanently remove this inventory item.'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        busy={busyId != null}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(null)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[60]">
          <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold shadow-lg ${
              toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            )}
            {toast.text}
          </div>
        </div>
      )}
    </div>
  )
}