'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { PackageIcon } from '../admin/icons'

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

export default function SalesStock() {
  const [stock, setStock] = useState<SalesStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-700">Sales stock</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Available for Sales</h1>
          <p className="mt-1 text-sm text-slate-500">Only materials acknowledged by Sales from Warehouse appear here.</p>
        </div>
        <Link href="/sales/pos" className="rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-slate-900 shadow-sm hover:bg-yellow-300">Create POS Sale</Link>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((n) => <div key={n} className="h-64 animate-pulse rounded-2xl bg-slate-200" />)}</div> : stock.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><PackageIcon className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-black text-slate-800">No Sales stock yet</h2><p className="mt-1 text-sm text-slate-500">Request products from Warehouse, then acknowledge the release in Materials Received.</p><Link href="/sales/requests" className="mt-4 inline-block text-xs font-black text-yellow-700 hover:underline">Request materials →</Link></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stock.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex h-36 items-center justify-center bg-slate-50 p-4">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full max-w-full object-contain" /> : <PackageIcon className="h-12 w-12 text-slate-300" />}</div>
              <div className="space-y-2 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.category || 'Material'}</div><h2 className="truncate text-sm font-black text-slate-900">{item.name}</h2><p className="font-mono text-[11px] text-slate-400">{item.sku || 'No SKU'}</p><div className="flex items-end justify-between border-t border-slate-100 pt-3"><div><div className="text-[10px] font-bold uppercase text-slate-400">Available</div><div className="text-xl font-black text-emerald-700">{item.availableQuantity} <span className="text-xs font-bold text-slate-500">{item.unit || 'pcs'}</span></div></div><div className="text-right text-xs font-black text-yellow-700">{item.sellPrice != null ? `₱${Number(item.sellPrice).toLocaleString()}` : 'No price'}</div></div></div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
