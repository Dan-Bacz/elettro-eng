'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '../../../../components/admin/PageHeader'
import { BarChartIcon } from '../../../../components/admin/icons'

type Movement = {
  id: string
  type: 'STOCK_RECEIVED' | 'STOCK_RELEASED' | 'ADJUSTMENT' | 'RETURN'
  quantity: number
  stockBefore: number
  stockAfter: number
  reason: string | null
  createdAt: string
  inventoryItem: { id: string; name: string; sku: string | null }
  worker: { name: string; role: string }
  request: { reference: string } | null
  release: { receiptNumber: string } | null
}

export default function StockMovementsPage() {
  const router = useRouter()
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/warehouse-stock')
      if (response.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load stock movement history.')
      setMovements(data.movements)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load stock movement history.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase()
    return movements.filter((movement) => {
      const typeMatch = filter === 'ALL' || movement.type === filter
      const searchMatch = !search ||
        movement.inventoryItem.name.toLowerCase().includes(search) ||
        (movement.inventoryItem.sku || '').toLowerCase().includes(search) ||
        movement.worker.name.toLowerCase().includes(search) ||
        (movement.reason || '').toLowerCase().includes(search) ||
        (movement.request?.reference || '').toLowerCase().includes(search) ||
        (movement.release?.receiptNumber || '').toLowerCase().includes(search)
      return typeMatch && searchMatch
    })
  }, [movements, filter, query])

  return (
    <div className="space-y-5">
      <PageHeader icon={<BarChartIcon className="h-5 w-5" />} title="Stock Movements" subtitle="Auditable record of warehouse receipts, adjustments, releases, and legacy returns." />
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, worker, reference, or reason" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="ALL">All movement types</option>
          <option value="STOCK_RECEIVED">Stock received</option>
          <option value="STOCK_RELEASED">Stock released</option>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="RETURN">Return</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <p className="p-5 text-sm text-slate-500">Loading movements…</p> : visible.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No stock movements match the selected filters.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Reference / reason</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{visible.map((movement) => <tr key={movement.id}>
                <td className="px-4 py-3 text-slate-500">{new Date(movement.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-slate-800">{movement.inventoryItem.name}<span className="block font-normal text-slate-400">{movement.inventoryItem.sku || 'No SKU'}</span></td>
                <td className="px-4 py-3">{movement.type.replace(/_/g, ' ')}</td>
                <td className={`px-4 py-3 font-black ${movement.quantity < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</td>
                <td className="px-4 py-3">{movement.stockBefore} → {movement.stockAfter}</td>
                <td className="px-4 py-3">{movement.worker.name}<span className="block text-slate-400">{movement.worker.role}</span></td>
                <td className="px-4 py-3">{movement.release?.receiptNumber || movement.request?.reference || '—'}<span className="block text-slate-500">{movement.reason || '—'}</span></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
