'use client'

import { isPendingAdminApproval, PENDING_ADMIN_APPROVAL_MESSAGE } from '../../lib/warehouse-request-approval'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type RequestItem = {
  id: string
  requestedQuantity: number
  releasedQuantity: number
  unavailableQuantity: number
  unit: string | null
  inventoryItem: { id: string; name: string; sku: string | null; unit: string | null; quantity: number }
}

type WarehouseRequest = {
  id: string
  reference: string
  source: string
  status: string
  customerReference: string | null
  projectReference: string | null
  notes: string | null
  createdAt: string
  requester: { name: string; email: string; role: string }
  order: { id: string; status: string; fulfillmentMethod: string; paymentMethod: string; paymentStatus: string; clientName?: string } | null
  booking: { id: string; title: string; status: string; client?: { name: string; phone: string } } | null
  materialRequest?: { id: string; material: string; priority: string; reason: string; status: string } | null
  items: RequestItem[]
  releases: { receipt: { reference: string } | null }[]
}

type Verification = { quantity: string; unavailableQuantity: string; discrepancyNotes: string; verified: boolean }

type SourceTab = 'ALL' | 'SALES' | 'TECHNICIAN'
type StatusTab = 'ALL' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLATION_REQUESTED' | 'REJECTED' | 'CANCELLED'

export default function WarehouseRequests() {
  const router = useRouter()
  const [requests, setRequests] = useState<WarehouseRequest[]>([])
  const [verification, setVerification] = useState<Record<string, Verification>>({})
  const [releaseNotes, setReleaseNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const requestDialog = useRef<HTMLDialogElement>(null)
  const [managedRequestId, setManagedRequestId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceTab, setSourceTab] = useState<SourceTab>('ALL')
  const [statusTab, setStatusTab] = useState<StatusTab>('ALL')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/warehouse-requests')
      if (response.status === 401) {
        router.push('/warehouse')
        return
      }
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load warehouse requests.')
      setRequests(data.requests || [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load warehouse requests.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const dialog = requestDialog.current
    if (managedRequestId && dialog && !dialog.open) dialog.showModal()
  }, [managedRequestId])

  async function changeStatus(request: WarehouseRequest, status: 'UNDER_REVIEW' | 'REJECTED' | 'CANCELLED') {
    setBusyId(request.id)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/warehouse-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, status }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not update request status.')
      setNotice(`${request.reference} ${status === 'UNDER_REVIEW' ? 'accepted for review' : status === 'REJECTED' ? 'rejected' : 'cancellation approved'}.`)
      await load()
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Could not update request status.')
    } finally {
      setBusyId(null)
    }
  }

  function getVerification(item: RequestItem): Verification {
    const remaining = item.requestedQuantity - item.releasedQuantity
    return (
      verification[item.id] ?? {
        quantity: String(Math.max(0, Math.min(remaining, item.inventoryItem.quantity))),
        unavailableQuantity: '0',
        discrepancyNotes: '',
        verified: false,
      }
    )
  }

  async function release(request: WarehouseRequest) {
    const items = request.items
      .map((item) => {
        const val = getVerification(item)
        return {
          requestItemId: item.id,
          quantity: Number(val.quantity),
          unavailableQuantity: Number(val.unavailableQuantity),
          discrepancyNotes: val.discrepancyNotes,
          verified: val.verified,
        }
      })
      .filter((item) => item.verified)

    if (items.length === 0) {
      setError('Please check at least one product as physically verified before releasing.')
      return
    }

    setBusyId(request.id)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/warehouse-releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': window.crypto.randomUUID() },
        body: JSON.stringify({ requestId: request.id, items, notes: releaseNotes[request.id] || '' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not complete warehouse release.')
      setNotice(`Release ${data.release.receiptNumber} recorded successfully. Inventory updated atomically.`)
      setManagedRequestId(null)
      await load()
      router.push(`/warehouse/receipts?reference=${encodeURIComponent(data.receipt?.reference || data.release.receiptNumber)}`)
    } catch (releaseError) {
      setError(releaseError instanceof Error ? releaseError.message : 'Could not complete warehouse release.')
    } finally {
      setBusyId(null)
    }
  }

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    // Source filter
    if (sourceTab === 'SALES' && req.source === 'TECHNICIAN') return false
    if (sourceTab === 'TECHNICIAN' && req.source !== 'TECHNICIAN') return false

    // Status filter
    if (statusTab !== 'ALL' && req.status !== statusTab) return false

    // Query search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchRef = req.reference.toLowerCase().includes(q)
      const matchCustomer = (req.customerReference || '').toLowerCase().includes(q)
      const matchProject = (req.projectReference || '').toLowerCase().includes(q)
      const matchRequester = (req.requester?.name || '').toLowerCase().includes(q)
      const matchItem = req.items.some((it) => it.inventoryItem.name.toLowerCase().includes(q))
      return matchRef || matchCustomer || matchProject || matchRequester || matchItem
    }

    return true
  })

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Incoming Material Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review material requests from Sales and Technicians, verify physical stock, and release materials.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}

      {/* Tabs and Filters */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Source Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
            {(['ALL', 'SALES', 'TECHNICIAN'] as SourceTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSourceTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  sourceTab === tab
                    ? 'bg-yellow-400 text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All Requests' : tab === 'SALES' ? 'Sales Requests' : 'Technician Requests'}
                <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
                  {tab === 'ALL'
                    ? requests.length
                    : tab === 'SALES'
                    ? requests.filter((r) => r.source !== 'TECHNICIAN').length
                    : requests.filter((r) => r.source === 'TECHNICIAN').length}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by request #, project, client, product…"
            className="w-full sm:w-72 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium focus:border-yellow-400 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-2 text-xs">
          {(['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLATION_REQUESTED', 'REJECTED', 'CANCELLED'] as StatusTab[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusTab(status)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                  statusTab === status
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          No material requests match the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 lg:grid lg:grid-cols-[minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto] lg:items-center lg:gap-4">
            <span>Request</span>
            <span>Requester</span>
            <span>Created</span>
            <span className="text-right">Action</span>
          </div>
          {filteredRequests.map((request) => {
            const isTechnician = request.source === 'TECHNICIAN'
            const isClientOrder = request.source === 'CLIENT_ORDER'
            const pendingAdminApproval = isPendingAdminApproval(request)
            const canReview = request.status === 'PENDING' && !pendingAdminApproval
            const canRelease = ['APPROVED', 'PARTIALLY_FULFILLED'].includes(request.status)

            return (
              <article key={request.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                {/* Header Info */}
                <div className="grid gap-3 border-b border-slate-100 bg-white p-4 lg:grid-cols-[minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto] lg:items-center lg:gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-slate-900">{request.reference}</h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          request.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : request.status === 'UNDER_REVIEW'
                            ? 'bg-blue-100 text-blue-800'
                            : request.status === 'FULFILLED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : request.status === 'PARTIALLY_FULFILLED'
                            ? 'bg-indigo-100 text-indigo-800'
                            : request.status === 'CANCELLATION_REQUESTED'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {pendingAdminApproval ? 'Pending admin approval' : request.status.replace(/_/g, ' ')}
                      </span>

                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        isTechnician ? 'bg-purple-100 text-purple-800' : isClientOrder ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        From: {isTechnician ? 'Technician' : isClientOrder ? 'Sales / Client Order' : 'Sales Department'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Requested by {request.requester.name} · {new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="hidden min-w-0 lg:block">
                    <p className="truncate text-sm font-bold text-slate-800">{request.requester.name}</p>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-slate-400">{request.requester.role}</p>
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-bold text-slate-800">{new Date(request.createdAt).toLocaleDateString()}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => {
                      setError('')
                      setNotice('')
                      setManagedRequestId(request.id)
                    }}
                    className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-cyan-800 lg:w-auto"
                  >
                    View request
                  </button>
                </div>

                {managedRequestId === request.id && (
                  <dialog
                    ref={requestDialog}
                    aria-labelledby="warehouse-request-title"
                    onClose={() => setManagedRequestId(null)}
                    onCancel={(event) => { if (busyId === request.id) event.preventDefault() }}
                    className="m-auto w-[calc(100%_-_1rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/65 sm:w-[calc(100%_-_3rem)]"
                  >
                    <div className="flex max-h-[90dvh] flex-col">
                      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 bg-slate-950 px-5 py-5 text-white sm:px-7">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-300">Warehouse material request</p>
                          <h2 id="warehouse-request-title" className="mt-1 break-words text-xl font-black tracking-tight sm:text-2xl">{request.reference}</h2>
                          <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${pendingAdminApproval ? 'bg-amber-100 text-amber-900' : 'bg-white/10 capitalize text-slate-100'}`}>
                            {pendingAdminApproval ? 'Pending admin approval' : request.status.toLowerCase().replace(/_/g, ' ')}
                          </p>
                        </div>
                        <button type="button" disabled={busyId === request.id} onClick={() => requestDialog.current?.close()} className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold hover:bg-white/10 disabled:opacity-50">Close</button>
                      </header>
                      <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
                        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
                        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
                        <dl className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          <div className="min-w-0">
                            <dt className="text-xs font-semibold text-slate-600">Requested by</dt>
                            <dd className="mt-1 break-words font-bold text-slate-900">{request.requester.name}</dd>
                            <dd className="text-xs text-slate-600">{isTechnician ? 'Technician' : isClientOrder ? 'Client order' : 'Sales Department'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold text-slate-600">Submitted</dt>
                            <dd className="mt-1 font-semibold text-slate-900"><time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleString()}</time></dd>
                          </div>
                          {request.projectReference && <div className="min-w-0"><dt className="text-xs font-semibold text-slate-600">Project</dt><dd className="mt-1 break-words font-semibold text-slate-900">{request.projectReference}</dd></div>}
                          {request.customerReference && <div className="min-w-0"><dt className="text-xs font-semibold text-slate-600">Customer</dt><dd className="mt-1 break-words font-semibold text-slate-900">{request.customerReference}</dd></div>}
                          {request.notes && <div className="min-w-0 sm:col-span-2 lg:col-span-3"><dt className="text-xs font-semibold text-slate-600">Request notes</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-800">{request.notes}</dd></div>}
                        </dl>

                        {pendingAdminApproval && (
                          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                            {PENDING_ADMIN_APPROVAL_MESSAGE}
                          </p>
                        )}

                        {/* Actions for Pending */}
                        {canReview && (
                          <div className="flex gap-2">
                            <button
                              disabled={busyId === request.id}
                              onClick={() => void changeStatus(request, 'UNDER_REVIEW')}
                              className="rounded-xl bg-yellow-400 px-3.5 py-2 text-xs font-black text-slate-900 hover:bg-yellow-300 disabled:opacity-50"
                            >
                              Accept for review
                            </button>
                            <button
                              disabled={busyId === request.id}
                              onClick={() => void changeStatus(request, 'REJECTED')}
                              className="rounded-xl border border-red-200 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {request.status === 'CANCELLATION_REQUESTED' && (
                          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                            <p className="flex-1 text-xs font-semibold text-orange-900">Sales requested cancellation. Approve it only after confirming that no materials were released.</p>
                            <button disabled={busyId === request.id} onClick={() => void changeStatus(request, 'CANCELLED')} className="rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-black text-white hover:bg-orange-600 disabled:opacity-50">{busyId === request.id ? 'Approving...' : 'Approve cancellation'}</button>
                          </div>
                        )}

                        <section aria-labelledby="warehouse-request-materials">
                          <h3 id="warehouse-request-materials" className="text-base font-bold text-slate-950">Requested materials ({request.items.length})</h3>
                          {canRelease && <p className="mt-1 text-xs text-slate-600">Verify each material and record any shortages before release.</p>}
                        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                          <table className={`w-full text-left text-xs ${canRelease ? 'min-w-[790px]' : 'min-w-[420px]'}`}>
                            <thead className="bg-slate-100 text-[11px] font-bold text-slate-700">
                              <tr>
                                <th scope="col" className="px-3 py-2.5">Material / SKU</th>
                                <th scope="col" className="px-3 py-2.5">Requested</th>
                                <th scope="col" className="px-3 py-2.5">Released</th>
                                <th scope="col" className="px-3 py-2.5">Available Stock</th>
                                {canRelease && <>
                                  <th scope="col" className="px-3 py-2.5">Release quantity</th>
                                  <th scope="col" className="px-3 py-2.5">Shortage</th>
                                  <th scope="col" className="px-3 py-2.5">Physical verification</th>
                                </>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {request.items.map((item) => {
                                const val = getVerification(item)
                                const remaining = item.requestedQuantity - item.releasedQuantity
                                const stock = item.inventoryItem.quantity
                                const hasEnoughStock = stock >= remaining

                                return (
                                  <tr key={item.id} className={canRelease && val.verified ? 'bg-emerald-50/60' : 'even:bg-slate-50/70'}>
                                    <td className="px-3 py-2.5">
                                      <span className="font-bold text-slate-900">{item.inventoryItem.name}</span>
                                      <span className="block text-[10px] text-slate-400">{item.inventoryItem.sku || 'No SKU'}</span>
                                    </td>
                                    <td className="px-3 py-2.5 font-semibold text-slate-700">
                                      {item.requestedQuantity} {item.unit || item.inventoryItem.unit || 'pcs'}
                                    </td>
                                    <td className="px-3 py-2.5 font-semibold text-slate-700">
                                      {item.releasedQuantity} {item.unit || item.inventoryItem.unit || 'pcs'}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className={`font-black ${hasEnoughStock ? 'text-emerald-700' : 'text-amber-700'}`}>
                                        {stock} {item.inventoryItem.unit || 'pcs'}
                                      </span>
                                    </td>
                                    {canRelease && <>
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="number"
                                        min={0}
                                        max={remaining}
                                        step={1}
                                        value={val.quantity}
                                        disabled={busyId === request.id}
                                        onChange={(e) =>
                                          setVerification((state) => ({
                                            ...state,
                                            [item.id]: { ...val, quantity: e.target.value },
                                          }))
                                        }
                                        aria-label={`Release quantity for ${item.inventoryItem.name}`}
                                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold disabled:bg-slate-100 focus:outline-none focus:border-yellow-400"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="number"
                                        min={0}
                                        max={remaining}
                                        step={1}
                                        value={val.unavailableQuantity}
                                        disabled={busyId === request.id}
                                        onChange={(e) =>
                                          setVerification((state) => ({
                                            ...state,
                                            [item.id]: { ...val, unavailableQuantity: e.target.value },
                                          }))
                                        }
                                        aria-label={`Unavailable quantity for ${item.inventoryItem.name}`}
                                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold disabled:bg-slate-100 focus:outline-none focus:border-yellow-400"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <label className="flex items-center gap-2 font-bold text-slate-800">
                                        <input
                                          type="checkbox"
                                          checked={val.verified}
                                          disabled={busyId === request.id}
                                          onChange={(e) =>
                                            setVerification((state) => ({
                                              ...state,
                                              [item.id]: { ...val, verified: e.target.checked },
                                            }))
                                          }
                                          className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-400"
                                        />
                                        Physically checked
                                      </label>
                                      <input
                                        value={val.discrepancyNotes}
                                        disabled={busyId === request.id}
                                        onChange={(e) =>
                                          setVerification((state) => ({
                                            ...state,
                                            [item.id]: { ...val, discrepancyNotes: e.target.value },
                                          }))
                                        }
                                        maxLength={500}
                                        aria-label={`Discrepancy note for ${item.inventoryItem.name}`}
                                        placeholder="Required for shortage or partial release"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] disabled:bg-slate-100 focus:outline-none focus:border-yellow-400"
                                      />
                                    </td>
                                    </>}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        </section>

                        {/* Release Receipts History */}
                        {request.releases.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
                            <span className="font-bold text-slate-500">Generated Receipts:</span>
                            {request.releases.map(
                              (rel) =>
                                rel.receipt && (
                                  <Link
                                    key={rel.receipt.reference}
                                    href={`/warehouse/receipts?reference=${encodeURIComponent(rel.receipt.reference)}`}
                                    className="rounded-lg bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-800 hover:underline border border-yellow-200"
                                  >
                                    Receipt {rel.receipt.reference}
                                  </Link>
                                )
                            )}
                          </div>
                        )}
                      </div>
                      {canRelease && (
                        <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-end sm:px-7">
                          <label className="min-w-0 flex-1 text-xs font-semibold text-slate-700">
                            Release notes (optional)
                            <input
                              value={releaseNotes[request.id] || ''}
                              onChange={(event) => setReleaseNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                              maxLength={500}
                              disabled={busyId === request.id}
                              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-yellow-400 focus:outline-none"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => void release(request)}
                            disabled={busyId === request.id}
                            className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50"
                          >
                            {busyId === request.id ? 'Recording release...' : 'Verify & release materials'}
                          </button>
                        </footer>
                      )}
                    </div>
                  </dialog>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
