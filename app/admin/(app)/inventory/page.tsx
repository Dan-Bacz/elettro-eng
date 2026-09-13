'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import SearchBar from '../../../../components/admin/SearchBar'
import FilterBar from '../../../../components/admin/FilterBar'
import EmptyState from '../../../../components/admin/EmptyState'
import ConfirmDialog from '../../../../components/admin/ConfirmDialog'
import type { InventoryItemObj } from '../../../../components/admin/types'

type Filter = 'ALL' | 'LOW'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'LOW', label: 'Low Stock' },
]

const CATEGORIES = ['Electrical', 'Plumbing', 'Renovation', 'General', 'Consumables']

export default function AdminInventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<InventoryItemObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [category, setCategory] = useState('ALL')
  const [showDelete, setShowDelete] = useState<InventoryItemObj | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/inventory')
      if (!res.ok) {
        if (res.status === 401) { router.push('/admin/login'); return }
        throw new Error('Failed to load inventory')
      }
      setItems(await res.json())
    } catch (e: any) {
      setError(e.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [router])

  async function adjustQuantity(id: string, delta: number) {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const res = await fetch('/api/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, quantity: Number(item.quantity) + delta }),
    })
    if (res.ok) {
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: Math.max(0, Number(i.quantity) + delta) } : i))
    } else {
      setError('Failed to update quantity')
    }
  }

  async function handleDelete() {
    if (!showDelete) return
    setBusy(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: showDelete.id }),
      })
      if (!res.ok) throw new Error('Failed to delete item')
      setItems((prev) => prev.filter((i) => i.id !== showDelete.id))
      setShowDelete(null)
    } catch (e: any) {
      setError(e.message || 'Failed to delete item')
    } finally {
      setBusy(false)
    }
  }

  function isLow(item: InventoryItemObj) {
    return Number(item.quantity) <= (item.reorderLevel ?? 10)
  }

  const visible = items.filter((i) => {
    const matchesFilter = filter === 'ALL' || (filter === 'LOW' && isLow(i))
    const matchesCategory = category === 'ALL' || i.category === category
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || (i.name || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q)
    return matchesFilter && matchesCategory && matchesQuery
  })

  return (
    <div className="space-y-6">
      <PageHeader
        icon="📦"
        title="Inventory"
        subtitle={`${items.length} items · ${items.filter(isLow).length} low on stock`}
        actions={
          <Link href="/admin/inventory/new" className="rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-bold text-black hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-400/20">
            + Add Item
          </Link>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by name, SKU, brand…" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <FilterBar options={FILTERS} value={filter} onChange={(v) => setFilter(v)} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="📦"
          title={items.length === 0 ? 'No inventory items yet' : 'No items match your filters'}
          message={items.length === 0 ? 'Add your first inventory item to start tracking stock.' : 'Try adjusting the search or filters.'}
          action={items.length === 0 ? <Link href="/admin/inventory/new" className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black">+ Add Item</Link> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5 font-bold">Item</th>
                <th className="px-4 py-3.5 font-bold">Category / Brand</th>
                <th className="px-4 py-3.5 font-bold text-right">Buy</th>
                <th className="px-4 py-3.5 font-bold text-right">Sell</th>
                <th className="px-4 py-3.5 font-bold text-center">Stock</th>
                <th className="px-4 py-3.5 font-bold text-right">Qty Adjust</th>
                <th className="px-5 py-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => {
                const low = isLow(i)
                return (
                  <tr key={i.id} className="border-t border-slate-100 hover:bg-yellow-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {i.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.imageUrl} alt={i.name} className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg">📦</div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-slate-800">{i.name}</div>
                          <div className="text-[10px] text-slate-400">{i.sku || i.model || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">
                      {i.category || '—'}{i.brand ? ` · ${i.brand}` : ''}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-slate-700">{i.buyPrice != null ? `$${Number(i.buyPrice).toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-slate-700">{i.sellPrice != null ? `$${Number(i.sellPrice).toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex min-w-9 items-center justify-center rounded-lg px-2 py-1 text-xs font-black ${low ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                        {i.quantity}{i.unit ? ` ${i.unit}` : ''}
                      </span>
                      {low && <div className="mt-0.5 text-[9px] font-bold text-red-400">LOW</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => adjustQuantity(i.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-black text-emerald-600 hover:bg-emerald-50">+</button>
                        <button onClick={() => adjustQuantity(i.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-black text-red-600 hover:bg-red-50">−</button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/inventory/${i.id}/edit`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-700 transition-colors">
                          Edit
                        </Link>
                        <button onClick={() => setShowDelete(i)} className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!showDelete}
        title="Delete Inventory Item"
        message={`Are you sure you want to delete "${showDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(null)}
      />
    </div>
  )
}