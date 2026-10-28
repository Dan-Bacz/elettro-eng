'use client'

import { useCallback, useEffect, useState } from 'react'

type Receipt = {
  id: string
  reference: string
  createdAt: string
  snapshot: {
    title?: string
    receiptNumber?: string
    requestReference?: string
    requestSource?: string
    requestingDepartment?: string
    salesRequester?: string
    requestingUser?: string
    warehouseWorker?: string
    warehouseOfficer?: string
    customerReference?: string
    projectReference?: string
    releaseDate?: string
    notes?: string
    signatures?: {
      releasedBy?: string
      receivedBy?: string
      authorizedBy?: string
    }
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
  const [searchFilter, setSearchFilter] = useState('')

  const load = useCallback(async () => {
    try {
      const reference = new URLSearchParams(window.location.search).get('reference')
      const response = await fetch(`/api/warehouse-receipts${reference ? `?reference=${encodeURIComponent(reference)}` : ''}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load release receipts.')
      setReceipts(data.receipts || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load release receipts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredReceipts = receipts.filter((r) => {
    if (!searchFilter.trim()) return true
    const q = searchFilter.toLowerCase().trim()
    const snap = r.snapshot
    return (
      r.reference.toLowerCase().includes(q) ||
      (snap.requestReference || '').toLowerCase().includes(q) ||
      (snap.customerReference || '').toLowerCase().includes(q) ||
      (snap.projectReference || '').toLowerCase().includes(q) ||
      (snap.warehouseWorker || '').toLowerCase().includes(q) ||
      (snap.requestingUser || snap.salesRequester || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Warehouse Release Receipts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Immutable release receipts generated from database transactions. Hard copies can be printed or saved.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search receipt #, request #, user…"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:border-yellow-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-slate-900 hover:bg-yellow-300 shadow-sm transition-colors"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 print:hidden">{error}</div>}

      {loading ? (
        <div className="space-y-4 print:hidden">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 print:hidden">
          No warehouse release receipts found.
        </div>
      ) : (
        <div className="space-y-8">
          {filteredReceipts.map((receipt) => {
            const snap = receipt.snapshot
            const isTech = snap.requestSource === 'TECHNICIAN'
            const formattedDate = snap.releaseDate ? new Date(snap.releaseDate).toLocaleString() : new Date(receipt.createdAt).toLocaleString()

            return (
              <article
                key={receipt.id}
                className="receipt-card break-inside-avoid rounded-2xl border border-slate-300 bg-white p-6 shadow-sm sm:p-8"
              >
                {/* Official Receipt Header */}
                <div className="border-b-2 border-slate-900 pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-xl font-black tracking-wide text-slate-900">
                        ELETTRO ENGINEERING ENTERPRISES
                      </div>
                      <div className="text-xs font-black uppercase tracking-widest text-yellow-600">
                        Warehouse Material Release Receipt
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-base font-black text-slate-900">
                        {snap.receiptNumber || receipt.reference}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">Release Date: {formattedDate}</div>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-4">
                    <div>
                      <span className="block font-bold text-slate-400 uppercase text-[9px]">Warehouse Request</span>
                      <span className="font-bold text-slate-800">{snap.requestReference || '—'}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 uppercase text-[9px]">Request Source</span>
                      <span className="font-bold text-slate-800">
                        {isTech ? 'Technician Account' : snap.requestSource === 'CLIENT_ORDER' ? 'Client Sales Order' : 'Sales Department'}
                      </span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 uppercase text-[9px]">Requesting Party</span>
                      <span className="font-bold text-slate-800">{snap.requestingUser || snap.salesRequester || '—'}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 uppercase text-[9px]">Warehouse Officer</span>
                      <span className="font-bold text-slate-800">{snap.warehouseOfficer || snap.warehouseWorker || '—'}</span>
                    </div>
                    {snap.projectReference && (
                      <div className="col-span-2">
                        <span className="block font-bold text-slate-400 uppercase text-[9px]">Project Reference</span>
                        <span className="font-bold text-slate-800">{snap.projectReference}</span>
                      </div>
                    )}
                    {snap.customerReference && (
                      <div className="col-span-2">
                        <span className="block font-bold text-slate-400 uppercase text-[9px]">Customer Reference</span>
                        <span className="font-bold text-slate-800">{snap.customerReference}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-100/70 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Item / Description</th>
                        <th className="px-3 py-2.5">Code / SKU</th>
                        <th className="px-3 py-2.5 text-right">Requested</th>
                        <th className="px-3 py-2.5 text-right">Prev. Released</th>
                        <th className="px-3 py-2.5 text-right font-black text-slate-900">Actual Released</th>
                        <th className="px-3 py-2.5 text-right">Outstanding</th>
                        <th className="px-3 py-2.5 text-center">Verification</th>
                        <th className="px-3 py-2.5">Remarks / Shortage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(snap.items || []).map((item, idx) => (
                        <tr key={`${item.name}-${idx}`} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-bold text-slate-900">{item.name}</td>
                          <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">{item.sku || '—'}</td>
                          <td className="px-3 py-2.5 text-right">
                            {item.requestedQuantity} {item.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-500">
                            {item.previouslyReleased} {item.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right font-black text-emerald-700 bg-emerald-50/50">
                            {item.releasedQuantity} {item.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-500">
                            {item.outstandingQuantity} {item.unit}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-800">
                              VERIFIED
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-[11px]">{item.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {snap.notes && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <strong>Release Remarks:</strong> {snap.notes}
                  </div>
                )}

                {/* Formal Signature Blocks */}
                <div className="mt-10 grid grid-cols-3 gap-8 border-t border-slate-200 pt-8 text-xs">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-6">Released By:</div>
                    <div className="border-b border-slate-400 pb-1 font-bold text-slate-800">
                      {snap.warehouseOfficer || snap.warehouseWorker || 'Warehouse Officer'}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">Warehouse Department</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-6">Received By:</div>
                    <div className="border-b border-slate-400 pb-1 font-bold text-slate-800">
                      {snap.requestingUser || snap.salesRequester || 'Authorized Receiver'}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">Department Representative</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-6">Authorized By:</div>
                    <div className="border-b border-slate-400 pb-1 font-bold text-slate-800">
                      Operations / Engineering Lead
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">ELETTRO Engineering Enterprises</div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Print CSS styling */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header,
          aside,
          nav,
          footer,
          button,
          input {
            display: none !important;
          }
          main {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .receipt-card {
            box-shadow: none !important;
            border: 1px solid #111 !important;
            page-break-after: always;
            padding: 24px !important;
            margin: 0 0 20px 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
