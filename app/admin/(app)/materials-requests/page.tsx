'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type RequestRow = {
  id: string
  reference: string
  source: string
  status: string
  projectReference: string | null
  createdAt: string
  requester: { name: string; role: string }
  items: { requestedQuantity: number; unit: string | null; inventoryItem: { name: string; sku: string | null; unit: string | null } }[]
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pending approval',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved for release',
  PARTIALLY_FULFILLED: 'Partially released',
  FULFILLED: 'Released',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

function statusTone(status: string) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-800'
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-rose-100 text-rose-800'
  if (status === 'FULFILLED' || status === 'PARTIALLY_FULFILLED') return 'bg-blue-100 text-blue-800'
  return 'bg-amber-100 text-amber-800'
}

export default function AdminMaterialsRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('ALL')
  const [status, setStatus] = useState('ALL')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/warehouse-requests')
      if (response.status === 401) { router.push('/admin/login'); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load material requests.')
      setRequests(data.requests || [])
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load material requests.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  async function decide(request: RequestRow, nextStatus: 'APPROVED' | 'REJECTED') {
    setBusyId(request.id)
    setError('')
    try {
      const response = await fetch('/api/warehouse-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, status: nextStatus }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not update request.')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update request.')
    } finally {
      setBusyId(null)
    }
  }

  const visible = useMemo(() => requests.filter((request) => {
    const text = `${request.reference} ${request.requester?.name || ''} ${request.projectReference || ''} ${request.items.map((item) => item.inventoryItem.name).join(' ')}`.toLowerCase()
    const matchesSource = source === 'ALL' || (source === 'SALES' ? request.source !== 'TECHNICIAN' : request.source === 'TECHNICIAN')
    return matchesSource && (status === 'ALL' || request.status === status) && (!query.trim() || text.includes(query.trim().toLowerCase()))
  }), [requests, query, source, status])

  const pendingCount = requests.filter((request) => ['PENDING', 'UNDER_REVIEW'].includes(request.status)).length

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#172c3c] to-[#08727f] p-6 text-white shadow-[0_28px_60px_-30px_rgba(15,23,42,.85)] sm:p-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><span className="inline-flex rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-yellow-200">Approval center</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Materials Requests</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Review requests from Sales and Technicians before Warehouse staff can verify and release materials.</p></div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-300">Awaiting decision</p><p className="mt-1 text-3xl font-black text-yellow-300">{pendingCount}</p><p className="mt-1 text-xs text-slate-300">Requests blocked from release</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference, requester, project, or material..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:bg-white lg:max-w-xl" /><div className="flex flex-wrap gap-2"><select value={source} onChange={(event) => setSource(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700"><option value="ALL">All departments</option><option value="SALES">Sales</option><option value="TECHNICIAN">Technicians</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700"><option value="ALL">All statuses</option><option value="PENDING">Pending approval</option><option value="UNDER_REVIEW">Under review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="FULFILLED">Released</option></select><button type="button" onClick={() => void load()} className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-cyan-800">Refresh</button></div></div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-black text-slate-900">Request register</h2><p className="mt-1 text-xs text-slate-500">{loading ? 'Loading requests...' : `${visible.length} request${visible.length === 1 ? '' : 's'} shown`}</p></div><span className="rounded-full bg-cyan-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-cyan-700">Admin controlled</span></div>{loading ? <div className="space-y-2 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : visible.length === 0 ? <p className="p-12 text-center text-sm text-slate-500">No material requests match the selected filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-950 text-[10px] uppercase tracking-wider text-slate-300"><tr><th className="px-5 py-3">Request</th><th className="px-4 py-3">Department / requester</th><th className="px-4 py-3">Materials</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Decision</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((request) => { const waiting = ['PENDING', 'UNDER_REVIEW'].includes(request.status); return <tr key={request.id} className="transition hover:bg-cyan-50/30"><td className="px-5 py-4"><p className="font-mono text-xs font-black text-slate-900">{request.reference}</p><p className="mt-1 text-[11px] text-slate-500">{request.projectReference || 'Warehouse material request'}</p></td><td className="px-4 py-4"><p className="font-bold text-slate-800">{request.requester?.name || 'Unknown requester'}</p><span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600">{request.source === 'TECHNICIAN' ? 'Technician' : 'Sales'}</span></td><td className="max-w-[260px] px-4 py-4 text-xs text-slate-600">{request.items.map((item) => `${item.requestedQuantity} ${item.unit || item.inventoryItem.unit || 'pcs'} × ${item.inventoryItem.name}`).join(' · ')}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{new Date(request.createdAt).toLocaleDateString()}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${statusTone(request.status)}`}>{statusLabels[request.status] || request.status.replace(/_/g, ' ')}</span></td><td className="px-5 py-4 text-right">{waiting ? <div className="flex justify-end gap-2"><button type="button" disabled={busyId === request.id} onClick={() => void decide(request, 'REJECTED')} className="rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-black text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button><button type="button" disabled={busyId === request.id} onClick={() => void decide(request, 'APPROVED')} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black text-white hover:bg-emerald-700 disabled:opacity-50">Approve release</button></div> : <span className="text-[10px] font-bold text-slate-400">No action</span>}</td></tr> })}</tbody></table></div>}</section>
    </div>
  )
}
