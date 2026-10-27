'use client'

import { useCallback, useEffect, useState } from 'react'

type Receipt = {
  id: string
  reference: string
  snapshot: {
    title?: string
    receiptNumber?: string
    requestReference?: string
    salesRequester?: string
    warehouseWorker?: string
    customerReference?: string
    projectReference?: string
    releaseDate?: string
    notes?: string
    items?: {
      name: string
      sku?: string
      requestedQuantity: number
      previouslyReleased: number
      releasedQuantity: number
      totalReleased: number
      outstandingQuantity: number
      unavailableQuantity: number
      unit: string
      verified: boolean
      stockBefore: number
      stockAfter: number
      remarks: string
    }[]
  }
}

export default function WarehouseReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const reference = new URLSearchParams(window.location.search).get('reference')
      const response = await fetch(`/api/warehouse-receipts${reference ? `?reference=${encodeURIComponent(reference)}` : ''}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load release receipts.')
      setReceipts(data.receipts)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load release receipts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900">Release Receipts</h1><p className="mt-1 text-sm text-slate-500">Saved receipt snapshots are immutable and can be printed for filing.</p></div>
        <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 print:hidden">Print</button>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? <p className="text-sm text-slate-500">Loading receipts…</p> : receipts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No release receipts found.</div>
      ) : receipts.map((receipt) => {
        const snapshot = receipt.snapshot
        return <article key={receipt.id} className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">{snapshot.title || 'Warehouse Material Release Receipt'}</h2>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <p><strong>Receipt:</strong> {snapshot.receiptNumber || receipt.reference}</p>
            <p><strong>Request:</strong> {snapshot.requestReference || '—'}</p>
            <p><strong>Sales requester:</strong> {snapshot.salesRequester || '—'}</p>
            <p><strong>Warehouse worker:</strong> {snapshot.warehouseWorker || '—'}</p>
            <p><strong>Customer:</strong> {snapshot.customerReference || '—'}</p>
            <p><strong>Project:</strong> {snapshot.projectReference || '—'}</p>
            <p><strong>Release date:</strong> {snapshot.releaseDate ? new Date(snapshot.releaseDate).toLocaleString() : '—'}</p>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Requested</th><th className="px-3 py-2">Previously released</th><th className="px-3 py-2">This release</th><th className="px-3 py-2">Outstanding</th><th className="px-3 py-2">Stock before → after</th><th className="px-3 py-2">Remarks</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{(snapshot.items || []).map((item, index) => <tr key={`${item.name}-${index}`}>
                <td className="px-3 py-2 font-bold">{item.name}{item.sku ? <span className="block font-normal text-slate-400">{item.sku}</span> : null}</td>
                <td className="px-3 py-2">{item.requestedQuantity} {item.unit}</td><td className="px-3 py-2">{item.previouslyReleased}</td><td className="px-3 py-2">{item.releasedQuantity}</td><td className="px-3 py-2">{item.outstandingQuantity}</td><td className="px-3 py-2">{item.stockBefore} → {item.stockAfter}</td><td className="px-3 py-2">{item.remarks || '—'}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {snapshot.notes && <p className="mt-3 text-sm text-slate-700"><strong>Notes:</strong> {snapshot.notes}</p>}
        </article>
      })}
      <style jsx global>{`@media print { body { background: white !important; } header, nav, footer, button { display: none !important; } main { max-width: none !important; padding: 0 !important; } article { box-shadow: none !important; border: 1px solid #bbb !important; margin-bottom: 1rem; } }`}</style>
    </div>
  )
}
