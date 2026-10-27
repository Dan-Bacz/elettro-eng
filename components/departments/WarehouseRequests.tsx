'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type RequestItem = {
  id: string
  requestedQuantity: number
  releasedQuantity: number
  unavailableQuantity: number
  unit: string | null
  inventoryItem: { name: string; sku: string | null; unit: string | null; quantity: number }
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
  order: { id: string; status: string; fulfillmentMethod: string; paymentMethod: string; paymentStatus: string } | null
  items: RequestItem[]
  releases: { receipt: { reference: string } | null }[]
}
type Verification = { quantity: string; unavailableQuantity: string; discrepancyNotes: string; verified: boolean }

export default function WarehouseRequests() {
  const router = useRouter()
  const [requests, setRequests] = useState<WarehouseRequest[]>([])
  const [verification, setVerification] = useState<Record<string, Verification>>({})
  const [releaseNotes, setReleaseNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/warehouse-requests')
      if (response.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load warehouse requests.')
      setRequests(data.requests)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load warehouse requests.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  async function changeStatus(request: WarehouseRequest, status: 'UNDER_REVIEW' | 'REJECTED') {
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
      setNotice(`${request.reference} ${status === 'UNDER_REVIEW' ? 'accepted for review' : 'rejected'}.`)
      await load()
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Could not update request status.')
    } finally {
      setBusyId(null)
    }
  }

  function getVerification(item: RequestItem): Verification {
    return verification[item.id] ?? {
      quantity: String(Math.min(item.requestedQuantity - item.releasedQuantity, item.inventoryItem.quantity)),
      unavailableQuantity: '0',
      discrepancyNotes: '',
      verified: false,
    }
  }

  async function release(request: WarehouseRequest) {
    const items = request.items.map((item) => {
      const value = getVerification(item)
      return {
        requestItemId: item.id,
        quantity: Number(value.quantity),
        unavailableQuantity: Number(value.unavailableQuantity),
        discrepancyNotes: value.discrepancyNotes,
        verified: value.verified,
      }
    }).filter((item) => item.verified)

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
      setNotice(`Release ${data.release.receiptNumber} was saved. The stock movement and receipt were recorded.`)
      await load()
    } catch (releaseError) {
      setError(releaseError instanceof Error ? releaseError.message : 'Could not complete warehouse release.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Warehouse Requests</h1>
        <p className="mt-1 text-sm text-slate-500">Review each request, physically verify products, and record audited releases.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
      {loading ? <p className="text-sm text-slate-500">Loading requests…</p> : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">There are no warehouse requests to review.</div>
      ) : requests.map((request) => (
        <article key={request.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-black text-slate-900">{request.reference}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{request.status.replace(/_/g, ' ')}</span>
                {request.source === 'CLIENT_ORDER' && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">Client Order</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500">Submitted by {request.requester.name} · {request.customerReference || 'No customer reference'} · {new Date(request.createdAt).toLocaleString()}</p>
              {request.projectReference && <p className="mt-1 text-xs text-slate-500">Project: {request.projectReference}</p>}
              {request.notes && <p className="mt-2 text-sm text-slate-700">{request.notes}</p>}
            </div>
            {request.status === 'PENDING' && (
              <div className="flex gap-2">
                <button disabled={busyId === request.id} onClick={() => void changeStatus(request, 'UNDER_REVIEW')} className="rounded-lg bg-yellow-400 px-3 py-2 text-xs font-black text-black disabled:opacity-50">Accept for review</button>
                <button disabled={busyId === request.id} onClick={() => void changeStatus(request, 'REJECTED')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50">Reject</button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Requested</th><th className="px-3 py-2">Released</th><th className="px-3 py-2">Available stock</th><th className="px-3 py-2">Release now</th><th className="px-3 py-2">Unavailable</th><th className="px-3 py-2">Verify / discrepancy</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {request.items.map((item) => {
                  const value = getVerification(item)
                  const canRelease = ['UNDER_REVIEW', 'PARTIALLY_FULFILLED'].includes(request.status)
                  return <tr key={item.id}>
                    <td className="px-3 py-2 font-bold text-slate-800">{item.inventoryItem.name}<span className="block font-normal text-slate-400">{item.inventoryItem.sku || 'No SKU'}</span></td>
                    <td className="px-3 py-2">{item.requestedQuantity} {item.unit || 'pcs'}</td>
                    <td className="px-3 py-2">{item.releasedQuantity} {item.unit || 'pcs'}</td>
                    <td className="px-3 py-2">{item.inventoryItem.quantity} {item.inventoryItem.unit || 'pcs'}</td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} max={item.requestedQuantity - item.releasedQuantity} step={1} value={value.quantity} disabled={!canRelease} onChange={(event) => setVerification((state) => ({ ...state, [item.id]: { ...value, quantity: event.target.value } }))} aria-label={`Release quantity for ${item.inventoryItem.name}`} className="w-24 rounded-md border border-slate-300 px-2 py-1 disabled:bg-slate-100" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} max={item.requestedQuantity - item.releasedQuantity} step={1} value={value.unavailableQuantity} disabled={!canRelease} onChange={(event) => setVerification((state) => ({ ...state, [item.id]: { ...value, unavailableQuantity: event.target.value } }))} aria-label={`Unavailable quantity for ${item.inventoryItem.name}`} className="w-24 rounded-md border border-slate-300 px-2 py-1 disabled:bg-slate-100" />
                    </td>
                    <td className="px-3 py-2">
                      <label className="flex items-center gap-2 font-bold text-slate-700">
                        <input type="checkbox" checked={value.verified} disabled={!canRelease} onChange={(event) => setVerification((state) => ({ ...state, [item.id]: { ...value, verified: event.target.checked } }))} />
                        Physically verified
                      </label>
                      <input value={value.discrepancyNotes} disabled={!canRelease} onChange={(event) => setVerification((state) => ({ ...state, [item.id]: { ...value, discrepancyNotes: event.target.value } }))} maxLength={1000} placeholder="Required for shortage / partial release" className="mt-1 w-full min-w-48 rounded-md border border-slate-300 px-2 py-1 disabled:bg-slate-100" />
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
          {request.order && !['APPROVED', 'PROCESSING'].includes(request.order.status) && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Client order release is enabled after admin approval. Current order status: {request.order.status.replace(/_/g, ' ')}.</p>
          )}
          {request.order?.paymentMethod === 'GCASH' && request.order.paymentStatus !== 'PAID' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Verify the GCash payment before releasing this order.</p>
          )}
          {request.status === 'UNDER_REVIEW' || request.status === 'PARTIALLY_FULFILLED' ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={releaseNotes[request.id] || ''} onChange={(event) => setReleaseNotes((current) => ({ ...current, [request.id]: event.target.value }))} maxLength={1000} placeholder="Release notes (optional)" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button onClick={() => void release(request)} disabled={busyId === request.id || (request.order !== null && (!['APPROVED', 'PROCESSING'].includes(request.order.status) || (request.order.paymentMethod === 'GCASH' && request.order.paymentStatus !== 'PAID')))} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">
                {busyId === request.id ? 'Saving release…' : 'Verify & release'}
              </button>
            </div>
          ) : null}
          {request.releases.map((release) => release.receipt && (
            <a key={release.receipt.reference} href={`/warehouse/receipts?reference=${encodeURIComponent(release.receipt.reference)}`} className="inline-block text-xs font-bold text-blue-700 underline">Receipt {release.receipt.reference}</a>
          ))}
        </article>
      ))}
    </div>
  )
}
