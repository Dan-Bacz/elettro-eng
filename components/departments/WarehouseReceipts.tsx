'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import SalesLetterhead from '../sales/SalesLetterhead'

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

type ReceiptRegister = {
  preparedBy: { name: string; role: string }
  receipts: {
    id: string
    reference: string
    createdAt: string
    release: { request: { reference: string; source: string } }
  }[]
}

function sourceLabel(source?: string) {
  if (source === 'TECHNICIAN') return 'Technician'
  if (source === 'CLIENT_ORDER') return 'Client Sales Order'
  return 'Sales Department'
}

export default function WarehouseReceipts({ canPrintRegister = false }: { canPrintRegister?: boolean }) {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [managedReceiptId, setManagedReceiptId] = useState<string | null>(null)
  const [register, setRegister] = useState<ReceiptRegister | null>(null)
  const [printingRegister, setPrintingRegister] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const resetRegister = () => setRegister(null)
    window.addEventListener('afterprint', resetRegister)
    return () => window.removeEventListener('afterprint', resetRegister)
  }, [])

  async function printDocument() {
    const page = pageRef.current
    const section = page?.dataset.printMode === 'register' ? '.warehouse-receipt-register' : '.warehouse-receipt-paper'
    const logo = page?.querySelector<HTMLImageElement>(`${section} .sales-letterhead-logo`)
    await logo?.decode().catch(() => {})
    window.print()
  }

  async function printRegister() {
    setPrintingRegister(true)
    setRegisterError('')
    try {
      const response = await fetch('/api/warehouse-receipts?register=1', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load the receipt register.')
      flushSync(() => setRegister(data))
      await printDocument()
    } catch (error) {
      setRegister(null)
      setRegisterError(error instanceof Error ? error.message : 'Could not print the receipt register.')
    } finally {
      setPrintingRegister(false)
    }
  }

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
    <div ref={pageRef} data-print-mode={register ? 'register' : managedReceiptId ? 'receipt' : undefined} className="warehouse-receipts-page space-y-6">
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
          {canPrintRegister && (
            <button
              type="button"
              onClick={() => void printRegister()}
              disabled={printingRegister}
              className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-slate-900 shadow-sm hover:bg-yellow-300 disabled:opacity-50"
            >
              {printingRegister ? 'Preparing register...' : 'Print all receipts'}
            </button>
          )}
        </div>
      </div>

      {registerError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 print:hidden">{registerError}</p>}
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
        <div className="warehouse-receipt-list space-y-8">
          {filteredReceipts.map((receipt) => {
            const snap = receipt.snapshot
            const isTech = snap.requestSource === 'TECHNICIAN'
            const formattedDate = snap.releaseDate ? new Date(snap.releaseDate).toLocaleString() : new Date(receipt.createdAt).toLocaleString()

            return (
              <article
                key={receipt.id}
                className={`receipt-card ${managedReceiptId === receipt.id ? 'receipt-open' : ''} rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-mono text-base font-black text-slate-900">{snap.requestReference || receipt.reference}</h2>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">Released</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${isTech ? 'bg-purple-100 text-purple-800' : snap.requestSource === 'CLIENT_ORDER' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        From: {isTech ? 'Technician' : snap.requestSource === 'CLIENT_ORDER' ? 'Sales / Client Order' : 'Sales Department'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Release receipt {snap.receiptNumber || receipt.reference} · {formattedDate}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManagedReceiptId((current) => current === receipt.id ? null : receipt.id)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-700 print:hidden"
                  >
                    {managedReceiptId === receipt.id ? 'Close' : 'View'}
                  </button>
                </div>

                {managedReceiptId === receipt.id && (
                  <div role="dialog" aria-modal="true" aria-labelledby="warehouse-receipt-title" className="warehouse-receipt-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4">
                    <div className="warehouse-receipt-paper mx-auto my-6 max-w-6xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
                      <div className="mb-4 flex justify-end gap-2 print:hidden">
                        <button type="button" onClick={() => void printDocument()} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-slate-900 hover:bg-yellow-300">Print / Save PDF</button>
                        <button type="button" onClick={() => setManagedReceiptId(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Close</button>
                      </div>
                <div className="warehouse-receipt-heading">
                  <SalesLetterhead />
                  <h2 id="warehouse-receipt-title" className="elettro-document-title mt-4 text-xl font-black text-slate-900">Warehouse Material Release Receipt</h2>

                  {/* Metadata Grid */}
                  <div className="warehouse-receipt-meta mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-4">
                    <div>
                      <span className="block font-bold text-slate-600">Receipt reference</span>
                      <span className="font-bold text-slate-900">{snap.receiptNumber || receipt.reference}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-600">Release date</span>
                      <span className="font-bold text-slate-900">{formattedDate}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 uppercase text-[9px]">Warehouse Request</span>
                      <span className="font-bold text-slate-800">{snap.requestReference || '—'}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 uppercase text-[9px]">Request Source</span>
                      <span className="font-bold text-slate-800">
                        {sourceLabel(snap.requestSource)}
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
                <div className="warehouse-receipt-table mt-5 overflow-x-auto">
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
                <div className="warehouse-receipt-signatures mt-10 grid grid-cols-3 gap-8 border-t border-slate-200 pt-8 text-xs">
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
                  </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {register && (
        <section className="warehouse-receipt-register hidden">
          <header className="warehouse-receipt-heading">
            <SalesLetterhead />
            <h2 className="elettro-document-title">Warehouse Receipt Register</h2>
            <div className="warehouse-receipt-meta">
              <div><strong>{register.preparedBy.role === 'WAREHOUSE' ? 'Warehouse Department Officer' : 'Prepared by'}</strong><div>{register.preparedBy.name}</div></div>
              <div><strong>Receipts on record</strong><div>{register.receipts.length.toLocaleString()}</div></div>
            </div>
          </header>
          <div className="warehouse-receipt-table mt-5">
            <table className="w-full text-left">
              <thead><tr><th scope="col">Receipt reference</th><th scope="col">Warehouse request</th><th scope="col">Request source</th><th scope="col">Issued on</th></tr></thead>
              <tbody>
                {register.receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <th scope="row">{receipt.reference}</th>
                    <td>{receipt.release.request.reference}</td>
                    <td>{sourceLabel(receipt.release.request.source)}</td>
                    <td>{new Date(receipt.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {register.receipts.length === 0 && <tr><td colSpan={4}>No receipts on record.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <style jsx global>{`
        @media print {
          html:has(.warehouse-receipts-page[data-print-mode]),
          body:has(.warehouse-receipts-page[data-print-mode]) { height: auto; overflow: visible; background: white; }
          div:has(> div > main > .warehouse-receipts-page[data-print-mode]) { background: white !important; min-height: 0; }
          div:has(> div > main > .warehouse-receipts-page[data-print-mode]) > :not(div:has(> main)),
          div:has(> main > .warehouse-receipts-page[data-print-mode]) > :is(header, footer),
          .warehouse-receipts-page[data-print-mode="register"] .warehouse-receipt-list,
          .warehouse-receipts-page[data-print-mode="receipt"] .receipt-card:not(.receipt-open) { display: none !important; }
          div:has(> main > .warehouse-receipts-page[data-print-mode]) { display: block; margin: 0 !important; min-height: 0; }
          main:has(> .warehouse-receipts-page[data-print-mode]) { padding: 0; }
          .warehouse-receipts-page[data-print-mode] { color: #111; font: 10pt/1.4 Arial, sans-serif; }
          .warehouse-receipts-page[data-print-mode] > * { margin: 0 !important; }
          .warehouse-receipts-page[data-print-mode="register"] .warehouse-receipt-register { display: block; }
          .warehouse-receipts-page .receipt-open,
          .warehouse-receipt-overlay,
          .warehouse-receipt-paper {
            position: static; max-width: none; max-height: none; overflow: visible;
            margin: 0; padding: 0; border: 0; border-radius: 0; background: white; box-shadow: none;
          }
          .warehouse-receipt-heading, .warehouse-receipt-signatures { break-inside: avoid; }
          .warehouse-receipt-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 5mm; margin: 0; padding: 0; background: white; }
          .warehouse-receipt-meta > div { overflow-wrap: anywhere; }
          .warehouse-receipt-meta > div > :first-child { display: block; color: #111; font-size: 8pt; font-weight: 700; }
          .warehouse-receipt-meta > div > :nth-child(2) { color: #111; font-size: 10pt; font-weight: normal; }
          .warehouse-receipt-table { overflow: visible; }
          .warehouse-receipt-table table { min-width: 0; table-layout: fixed; border-collapse: collapse; }
          .warehouse-receipt-table thead { display: table-header-group; background: white; }
          .warehouse-receipt-table tr { break-inside: avoid; }
          .warehouse-receipt-table :is(th, td) { padding: 2mm 1mm; color: #111; background: white; font-size: 8pt; white-space: normal; overflow-wrap: anywhere; }
          .warehouse-receipt-table thead th { border-block: 1px solid #555; }
          .warehouse-receipt-table tbody :is(th, td) { border-bottom: 1px solid #bbb; }
          .warehouse-receipt-table td span { color: inherit; background: none; padding: 0; }
          .warehouse-receipt-paper thead th:first-child { width: 17%; }
          .warehouse-receipt-paper thead th:last-child { width: 18%; }
        }
      `}</style>
    </div>
  )
}
