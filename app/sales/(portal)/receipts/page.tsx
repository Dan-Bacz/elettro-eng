'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import EmptyState from '../../../../components/admin/EmptyState'
import { DocumentIcon } from '../../../../components/admin/icons'

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
  const [handoverTarget, setHandoverTarget] = useState<Release | null>(null)
  const [handoverNotes, setHandoverNotes] = useState('')
  const [acknowledging, setAcknowledging] = useState(false)
  const [acknowledgeError, setAcknowledgeError] = useState('')

  // Receipt modal state
  const [viewingRelease, setViewingRelease] = useState<Release | null>(null)

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
    void load()
  }, [load])

  async function handleAcknowledge() {
    if (!handoverTarget) return
    setAcknowledging(true)
    setAcknowledgeError('')
    try {
      const res = await fetch('/api/warehouse-releases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseId: handoverTarget.id,
          notes: handoverNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to acknowledge receipt')
      setHandoverTarget(null)
      setHandoverNotes('')
      await load()
    } catch (err: any) {
      setAcknowledgeError(err.message || 'Failed to acknowledge physical handover')
    } finally {
      setAcknowledging(false)
    }
  }

  const filteredReleases = releases.filter((r) => {
    if (filter === 'PENDING' && r.receivedBySalesId) return false
    if (filter === 'ACKNOWLEDGED' && !r.receivedBySalesId) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.receiptNumber.toLowerCase().includes(q) ||
      r.request.reference.toLowerCase().includes(q) ||
      (r.request.order?.clientName || '').toLowerCase().includes(q) ||
      (r.request.customerReference || '').toLowerCase().includes(q) ||
      r.releasedBy.name.toLowerCase().includes(q) ||
      (r.salesRecipient?.name || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Materials Received & Warehouse Receipts</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            View warehouse releases, verify physically released quantities, and acknowledge physical handover.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
            {releases.length} Releases
          </span>
          <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
            {releases.filter((r) => !r.receivedBySalesId).length} Pending Handover
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {/* Filters and search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-slate-200/70 p-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Releases ({releases.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'PENDING' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Handover ({releases.filter((r) => !r.receivedBySalesId).length})
          </button>
          <button
            onClick={() => setFilter('ACKNOWLEDGED')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              filter === 'ACKNOWLEDGED' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Received / Acknowledged ({releases.filter((r) => r.receivedBySalesId).length})
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search receipt, request, client…"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 sm:w-64"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : filteredReleases.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon className="h-6 w-6" />}
          title={releases.length === 0 ? 'No releases yet' : 'No releases match your filter'}
          message={
            releases.length === 0
              ? 'When the Warehouse department verifies and releases materials for sales requests, the release records and receipts will appear here.'
              : 'Try clearing the search or changing the filter tab.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredReleases.map((release) => {
            const isHandedOver = Boolean(release.receivedBySalesId)
            const totalItemsReleased = release.items.reduce((s, it) => s + Number(it.quantity || 0), 0)

            return (
              <div
                key={release.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-900">{release.receiptNumber}</span>
                    <span className="rounded-lg bg-yellow-400/20 px-2 py-0.5 text-[10px] font-black text-yellow-900">
                      Req: {release.request.reference}
                    </span>
                    {release.request.order && (
                      <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        Client: {release.request.order.clientName}
                      </span>
                    )}
                    {release.request.customerReference && (
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Ref: {release.request.customerReference}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isHandedOver ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Handover Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Awaiting Sales Handover
                      </span>
                    )}
                  </div>
                </div>

                {/* Body info */}
                <div className="p-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Release Details</div>
                      <div className="mt-1 text-xs font-semibold text-slate-800">
                        Released by: <span className="font-bold">{release.releasedBy.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">Date: {formatDate(release.createdAt)}</div>
                      {release.notes && (
                        <div className="mt-1 text-[11px] italic text-slate-600">Note: {release.notes}</div>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Sales Physical Handover
                      </div>
                      {isHandedOver ? (
                        <div className="mt-1 space-y-0.5">
                          <div className="text-xs font-semibold text-emerald-900">
                            Received by: <span className="font-bold">{release.salesRecipient?.name || 'Sales Officer'}</span>
                          </div>
                          <div className="text-[11px] text-emerald-700">At: {formatDate(release.receivedBySalesAt)}</div>
                          {release.salesReceivedNotes && (
                            <div className="text-[11px] italic text-emerald-600">
                              Remarks: {release.salesReceivedNotes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1">
                          <p className="text-[11px] text-amber-800 font-medium">
                            Physical items released by Warehouse. Sales must confirm physical custody upon receiving goods.
                          </p>
                          <button
                            onClick={() => {
                              setHandoverTarget(release)
                              setHandoverNotes('')
                              setAcknowledgeError('')
                            }}
                            className="mt-2 rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-black shadow-sm transition hover:bg-yellow-300"
                          >
                            Acknowledge Physical Handover
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between items-start md:items-end">
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Summary</div>
                        <div className="mt-1 text-sm font-black text-slate-900">
                          {release.items.length} materials · {totalItemsReleased} total units
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setViewingRelease(release)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          View Official Receipt
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Items released table */}
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/50">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-2 px-3">Item / Material</th>
                          <th className="py-2 px-3 text-center">Requested</th>
                          <th className="py-2 px-3 text-center">Released Now</th>
                          <th className="py-2 px-3 text-center">Unavailable / Shortage</th>
                          <th className="py-2 px-3">Discrepancy Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {release.items.map((it) => (
                          <tr key={it.id} className="text-slate-700">
                            <td className="py-2 px-3 font-semibold">
                              <div>{it.requestItem.inventoryItem.name}</div>
                              {it.requestItem.inventoryItem.sku && (
                                <div className="font-mono text-[10px] text-slate-400">{it.requestItem.inventoryItem.sku}</div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-bold">
                              {it.requestItem.requestedQuantity} {it.requestItem.unit || 'pcs'}
                            </td>
                            <td className="py-2 px-3 text-center font-black text-emerald-700">
                              {it.quantity} {it.requestItem.unit || 'pcs'}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-amber-700">
                              {it.unavailableQuantity > 0 ? `${it.unavailableQuantity} ${it.requestItem.unit || 'pcs'}` : '0'}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-500">
                              {it.discrepancyNotes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Acknowledge Handover Modal */}
      {handoverTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">Acknowledge Physical Handover</h2>
            <p className="mt-1 text-xs text-slate-500">
              Confirm that the physical goods for release{' '}
              <span className="font-mono font-bold text-slate-800">{handoverTarget.receiptNumber}</span> have been received
              in good condition by Sales.
            </p>

            {acknowledgeError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                {acknowledgeError}
              </div>
            )}

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs">
              <div className="font-semibold text-slate-700">Items being received:</div>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-600">
                {handoverTarget.items.map((it) => (
                  <li key={it.id}>
                    {it.quantity} {it.requestItem.unit || 'pcs'} — {it.requestItem.inventoryItem.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700">
                Handover Notes / Verification Remarks (Optional)
              </label>
              <textarea
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="e.g. Received at sales dispatch desk, cartons inspected and intact..."
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHandoverTarget(null)}
                disabled={acknowledging}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={acknowledging}
                className="rounded-xl bg-yellow-400 px-5 py-2 text-xs font-black text-black shadow-sm transition hover:bg-yellow-300 disabled:opacity-50"
              >
                {acknowledging ? 'Confirming...' : 'Confirm Custody Received'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {viewingRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600">
                  ELETTRO ENGINEERING ENTERPRISES
                </div>
                <h2 className="text-xl font-black text-slate-900">WAREHOUSE MATERIAL RELEASE RECEIPT</h2>
                <div className="mt-1 font-mono text-xs font-bold text-slate-500">
                  Receipt Ref: {viewingRelease.receipt?.reference || viewingRelease.receiptNumber}
                </div>
              </div>
              <button
                onClick={() => setViewingRelease(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Card */}
            <div id="printable-receipt" className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-xs sm:grid-cols-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Request Ref</span>
                  <span className="font-bold text-slate-800">{viewingRelease.request.reference}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Request Source</span>
                  <span className="font-bold text-slate-800">{viewingRelease.request.source}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Release Date</span>
                  <span className="font-bold text-slate-800">{formatDate(viewingRelease.createdAt)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Warehouse Officer</span>
                  <span className="font-bold text-slate-800">{viewingRelease.releasedBy.name}</span>
                </div>
              </div>

              {/* Items Released Breakdown */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
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
              <div className="mt-8 grid grid-cols-1 gap-6 pt-6 sm:grid-cols-3">
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
                  <div className="h-10 text-xs font-semibold text-slate-400">ELETTRO AUTH SIG</div>
                  <div className="border-t border-slate-300 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Authorized Verification
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={() => window.print()}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800"
              >
                Print Hard Copy
              </button>
              <button
                onClick={() => setViewingRelease(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
