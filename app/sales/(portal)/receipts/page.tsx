'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import EmptyState from '../../../../components/admin/EmptyState'
import { DocumentIcon } from '../../../../components/admin/icons'
import SalesLetterhead from '../../../../components/sales/SalesLetterhead'

type ReleaseItem = {
  id: string
  quantity: number
  unavailableQuantity: number
  discrepancyNotes: string | null
  requestItem: {
    id: string
    requestedQuantity: number
    releasedQuantity: number
    unavailableQuantity: number
    unit: string | null
    inventoryItem: { id: string; name: string; sku: string | null; unit: string | null }
  }
}

type Release = {
  id: string
  receiptNumber: string
  createdAt: string
  notes: string | null
  receivedBySalesId: string | null
  receivedBySalesAt: string | null
  salesReceivedNotes: string | null
  releasedBy: { id: string; name: string; email: string }
  salesRecipient?: { id: string; name: string; email: string } | null
  receipt?: { id: string; reference: string; createdAt: string; snapshot: any } | null
  request: {
    id: string
    reference: string
    source: string
    status: string
    customerReference: string | null
    projectReference: string | null
    createdAt: string
    requester?: { id: string; name: string; role: string } | null
    order?: { id: string; status: string; total: number; clientName: string } | null
  }
  items: ReleaseItem[]
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SalesReceiptsPage() {
  const router = useRouter()
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACKNOWLEDGED'>('ALL')
  const [search, setSearch] = useState('')

  // Handover confirmation modal state
  const [confirmingHandover, setConfirmingHandover] = useState(false)
  const [handoverNotes, setHandoverNotes] = useState('')
  const [acknowledging, setAcknowledging] = useState(false)
  const [acknowledgeError, setAcknowledgeError] = useState('')

  // Receipt modal state
  const [viewingReleaseId, setViewingReleaseId] = useState<string | null>(null)
  const viewingRelease = releases.find((release) => release.id === viewingReleaseId)

  function closeReceipt() {
    if (acknowledging) return
    setViewingReleaseId(null)
    setConfirmingHandover(false)
    setHandoverNotes('')
    setAcknowledgeError('')
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/warehouse-releases')
      if (res.status === 401) {
        router.push('/sales/login')
        return
      }
      if (!res.ok) throw new Error('Failed to load release receipts')
      const data = await res.json()
      setReleases(data.releases || [])
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to load releases')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    setSearch(new URLSearchParams(window.location.search).get('reference') || '')
    void load()
  }, [load])

  async function handleAcknowledge() {
    if (!viewingRelease || viewingRelease.receivedBySalesId || acknowledging) return
    setAcknowledging(true)
    setAcknowledgeError('')
    try {
      const res = await fetch('/api/warehouse-releases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseId: viewingRelease.id,
          notes: handoverNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to acknowledge receipt')
      await load()
      setConfirmingHandover(false)
      setHandoverNotes('')
    } catch (err: any) {
      setAcknowledgeError(err.message || 'Failed to acknowledge physical handover')
    } finally {
      setAcknowledging(false)
    }
  }

  const pendingCount = releases.filter((release) => !release.receivedBySalesId).length
  const filters = [
    { value: 'ALL', label: 'All', count: releases.length },
    { value: 'PENDING', label: 'Awaiting handover', count: pendingCount },
    { value: 'ACKNOWLEDGED', label: 'Received', count: releases.length - pendingCount },
  ] as const

  const filteredReleases = releases.filter((r) => {
    if (filter === 'PENDING' && r.receivedBySalesId) return false
    if (filter === 'ACKNOWLEDGED' && !r.receivedBySalesId) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      r.receiptNumber.toLowerCase().includes(q) ||
      (r.receipt?.reference || '').toLowerCase().includes(q) ||
      r.request.reference.toLowerCase().includes(q) ||
      (r.request.order?.clientName || '').toLowerCase().includes(q) ||
      (r.request.customerReference || '').toLowerCase().includes(q) ||
      r.releasedBy.name.toLowerCase().includes(q) ||
      (r.salesRecipient?.name || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="sales-receipts-page space-y-6">
      <style jsx global>{`
        @media print {
          html:has(.sales-receipt-print), body:has(.sales-receipt-print) { height: auto; overflow: visible; background: white; }
          div:has(> div > main > .sales-receipts-page .sales-receipt-print) { background: white; min-height: 0; }
          div:has(> div > main > .sales-receipts-page .sales-receipt-print) > aside,
          div:has(> main > .sales-receipts-page .sales-receipt-print) > :is(header, footer),
          .sales-receipts-page:has(.sales-receipt-print) .sales-receipt-screen-only { display: none !important; }
          div:has(> main > .sales-receipts-page .sales-receipt-print) { display: block; margin: 0 !important; min-height: 0; }
          main:has(> .sales-receipts-page .sales-receipt-print) { padding: 0; }
          .sales-receipt-print { position: static; display: block; padding: 0; margin: 0 !important; background: white; backdrop-filter: none; }
          .sales-receipt-paper { display: block; max-height: none; max-width: none; overflow: visible; padding: 0; border: 0; box-shadow: none; color: #111; font: 10pt/1.4 Arial, sans-serif; }
          .sales-receipt-header { display: block; padding: 0; border: 0; background: white; color: #111; break-inside: avoid; }
          .sales-receipt-body { padding: 0; overflow: visible; }
          .sales-receipt-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 5mm; padding: 0; border: 0; background: white; break-inside: avoid; }
          .sales-receipt-meta dt { color: #111; font-size: 8pt; font-weight: 700; }
          .sales-receipt-meta dd { color: #111; font-size: 10pt; overflow-wrap: anywhere; }
          .sales-receipt-notes { padding: 2mm 0; border: 0; border-block: 1px solid #aaa; font-size: 9pt; }
          .sales-receipt-signatures { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); break-inside: avoid; }
          .sales-receipt-signatures > div { border: 0; padding: 0; }
          .sales-receipt-signatures > div > div { color: #111; }
          .sales-receipt-signatures > div > div:first-child { height: auto; min-height: 10mm; }
          .sales-receipt-paper .sales-receipt-items { overflow: visible; border: 0; border-radius: 0; }
          .sales-receipt-items table { min-width: 0; table-layout: fixed; border-collapse: collapse; }
          .sales-receipt-items :is(th, td) { padding: 2mm 1.5mm; color: #111; font-size: 8.5pt; overflow-wrap: anywhere; }
          .sales-receipt-items th { border-block: 1px solid #555; }
          .sales-receipt-items th:first-child { width: 29%; }
          .sales-receipt-items th:last-child { width: 25%; }
          .sales-receipt-items td { border-bottom: 1px solid #bbb; }
          .sales-receipt-items thead { display: table-header-group; background: white; }
          .sales-receipt-items tr { break-inside: avoid; overflow-wrap: anywhere; }
        }
      `}</style>

      <header className="sales-receipt-screen-only rounded-3xl bg-slate-950 px-5 py-6 text-white sm:px-7">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Warehouse Receipts</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">Review Warehouse releases and acknowledge handover after receiving the materials.</p>
      </header>

      {error && (
        <p role="alert" className="sales-receipt-screen-only rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      <section className="sales-receipt-screen-only overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Warehouse receipts" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" aria-label="Filter by handover status">
            {filters.map(({ value, label, count }) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search receipts"
            placeholder="Search receipt, request, or client"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-yellow-500 sm:w-64"
          />
        </div>

        {loading ? (
          <p role="status" className="px-5 py-10 text-center text-sm text-slate-600">Loading receipts...</p>
        ) : filteredReleases.length === 0 ? (
          <EmptyState
            icon={<DocumentIcon className="h-6 w-6" />}
            title={releases.length === 0 ? 'No receipts yet' : 'No receipts match your filters'}
            message={releases.length === 0 ? 'Warehouse releases will appear here.' : 'Change the status filter or search for another reference.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">Warehouse release receipts</caption>
              <thead className="bg-slate-100 text-xs font-bold text-slate-700">
                <tr>
                  <th scope="col" className="px-4 py-3">Receipt</th>
                  <th scope="col" className="px-4 py-3">Request</th>
                  <th scope="col" className="px-4 py-3">Handover status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReleases.map((release) => {
                  const reference = release.receipt?.reference || release.receiptNumber
                  const customer = release.request.order?.clientName || release.request.customerReference
                  const received = Boolean(release.receivedBySalesId)
                  return (
                    <tr key={release.id} className="even:bg-slate-50 hover:bg-yellow-50/60">
                      <th scope="row" className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-950">{reference}</span>
                        <time dateTime={release.createdAt} className="mt-1 block text-xs font-normal text-slate-600">{formatDate(release.createdAt)}</time>
                      </th>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-slate-800">{release.request.reference}</span>
                        {customer && <span className="mt-1 block text-xs text-slate-600">{customer}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${received ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                          {received ? 'Received' : 'Awaiting handover'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setViewingReleaseId(release.id)} aria-label={`View details for ${reference}`} className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:border-yellow-400 hover:bg-yellow-50">
                          View details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Official Receipt Modal */}
      {viewingRelease && (
        <div role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="sales-receipt-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="sales-receipt-paper flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <header className="sales-receipt-header shrink-0 bg-slate-950 px-5 py-5 text-white sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <SalesLetterhead />
                <button type="button" onClick={closeReceipt} disabled={acknowledging} className="sales-receipt-screen-only rounded-lg border border-white/25 px-3 py-2 text-xs font-bold hover:bg-white/10 disabled:opacity-50">
                  Close
                </button>
              </div>
              <h2 id="receipt-title" className="elettro-document-title mt-4 text-xl font-black tracking-tight sm:text-2xl">Warehouse Material Release Receipt</h2>
            </header>

            <div className="sales-receipt-body min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
              <dl className="sales-receipt-meta grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
                {[
                  ['Receipt reference', viewingRelease.receipt?.reference || viewingRelease.receiptNumber],
                  ['Request reference', viewingRelease.request.reference],
                  ['Request source', viewingRelease.request.source.toLowerCase().replace(/_/g, ' ')],
                  ['Released on', formatDate(viewingRelease.createdAt)],
                  ['Warehouse Officer', viewingRelease.releasedBy.name],
                  ['Sales Department Officer', viewingRelease.salesRecipient?.name || 'Awaiting handover'],
                  ['Handover status', viewingRelease.receivedBySalesId ? `Received on ${formatDate(viewingRelease.receivedBySalesAt)}` : 'Awaiting handover'],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs font-semibold text-slate-600">{label}</dt>
                    <dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>

              {(viewingRelease.notes || viewingRelease.salesReceivedNotes) && (
                <div className="sales-receipt-notes space-y-2 rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  {viewingRelease.notes && <p className="break-words"><strong>Warehouse notes </strong> {viewingRelease.notes}</p>}
                  {viewingRelease.salesReceivedNotes && <p className="break-words"><strong>Handover remarks </strong> {viewingRelease.salesReceivedNotes}</p>}
                </div>
              )}

              <div className="sales-receipt-items overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Material / Code</th>
                      <th className="py-2.5 px-4 text-center">Requested</th>
                      <th className="py-2.5 px-4 text-center">Released</th>
                      <th className="py-2.5 px-4 text-center">Shortage</th>
                      <th className="py-2.5 px-4">Discrepancy Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingRelease.items.map((item) => (
                      <tr key={item.id} className="text-slate-800">
                        <td className="py-2.5 px-4 font-semibold">
                          <div>{item.requestItem.inventoryItem.name}</div>
                          {item.requestItem.inventoryItem.sku && (
                            <div className="font-mono text-[10px] text-slate-400">{item.requestItem.inventoryItem.sku}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {item.requestItem.requestedQuantity} {item.requestItem.unit || 'pcs'}
                        </td>
                        <td className="py-2.5 px-4 text-center font-black text-emerald-700">
                          {item.quantity} {item.requestItem.unit || 'pcs'}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-amber-700">
                          {item.unavailableQuantity} {item.requestItem.unit || 'pcs'}
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-slate-500">{item.discrepancyNotes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures block */}
              <div className="sales-receipt-signatures mt-6 grid grid-cols-1 gap-5 pt-2 sm:grid-cols-3">
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                  <div className="h-10 text-xs font-semibold text-slate-800">{viewingRelease.releasedBy.name}</div>
                  <div className="border-t border-slate-300 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Released By (Warehouse)
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                  <div className="h-10 text-xs font-semibold text-slate-800">
                    {viewingRelease.salesRecipient?.name || 'Awaiting Handover'}
                  </div>
                  <div className="border-t border-slate-300 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Received By (Sales Officer)
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                  <div className="h-10 text-xs font-semibold text-slate-400"></div>
                  <div className="border-t border-slate-300 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Authorized Verification
                  </div>
                </div>
              </div>

              {confirmingHandover && !viewingRelease.receivedBySalesId && (
                <form
                  className="sales-receipt-screen-only mt-6 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
                  onSubmit={(event) => { event.preventDefault(); void handleAcknowledge() }}
                >
                  <h3 className="text-sm font-bold text-slate-900">Confirm physical handover</h3>
                  <p className="text-xs text-slate-700">Verify the released quantities above against the materials Sales received.</p>
                  {acknowledgeError && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{acknowledgeError}</p>}
                  <label className="block text-xs font-semibold text-slate-700">
                    Handover notes (optional)
                    <textarea
                      value={handoverNotes}
                      onChange={(event) => setHandoverNotes(event.target.value)}
                      disabled={acknowledging}
                      rows={3}
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
                    />
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => setConfirmingHandover(false)} disabled={acknowledging} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-100">Cancel</button>
                    <button type="submit" disabled={acknowledging} className="rounded-lg bg-yellow-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50">
                      {acknowledging ? 'Confirming...' : 'Confirm receipt'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <footer className="sales-receipt-screen-only flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
              {!viewingRelease.receivedBySalesId && !confirmingHandover && (
                <button
                  type="button"
                  onClick={() => {
                    setAcknowledgeError('')
                    setConfirmingHandover(true)
                  }}
                  className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-yellow-300"
                >
                  Acknowledge handover
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800"
              >
                Print receipt
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
