'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import SalesLetterhead from '../../../../components/sales/SalesLetterhead'
import { useRouter } from 'next/navigation'

type RequestRow = {
  id: string
  reference: string
  source: string
  status: string
  projectReference: string | null
  customerReference: string | null
  notes: string | null
  createdAt: string
  requester: { name: string; role: string }
  items: { id: string; requestedQuantity: number; releasedQuantity: number; unit: string | null; inventoryItem: { name: string; sku: string | null; unit: string | null } }[]
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pending approval',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved for release',
  PARTIALLY_FULFILLED: 'Partially released',
  FULFILLED: 'Released',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CANCELLATION_REQUESTED: 'Cancellation requested',
}

function statusTone(status: string) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-800'
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-rose-100 text-rose-800'
  if (status === 'FULFILLED' || status === 'PARTIALLY_FULFILLED') return 'bg-blue-100 text-blue-800'
  return 'bg-amber-100 text-amber-800'
}

const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' })
const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const field = 'min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-cyan-600'
const tableHeading = 'px-3 py-3 text-left text-xs font-bold text-slate-700 sm:px-5'
const tableCell = 'break-words px-3 py-3 sm:px-5'

function department(source: string) {
  if (source === 'TECHNICIAN') return 'Technician'
  if (source === 'CLIENT_ORDER') return 'Client order'
  return 'Sales'
}

function statusLabel(status: string) {
  return statusLabels[status] || status.replace(/_/g, ' ')
}

function Status({ status }: { status: string }) {
  return <span className={`inline-block max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(status)}`}>{statusLabel(status)}</span>
}

function RequestDetails({ request }: { request: RequestRow }) {
  const metadata = [
    ['Requested by', request.requester?.name || 'Unknown requester'],
    ['Department', department(request.source)],
    ['Submitted', dateTime.format(new Date(request.createdAt))],
    ['Status', statusLabel(request.status)],
    ...(request.projectReference ? [['Project', request.projectReference]] : []),
    ...(request.customerReference ? [['Customer reference', request.customerReference]] : []),
  ]

  return (
    <div className="space-y-5">
      <dl className="request-detail-meta grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
        {metadata.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs font-semibold text-slate-600">{label}</dt>
            <dd className="mt-1 break-words font-bold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      {request.notes && <div className="rounded-lg border border-slate-200 p-3 text-sm"><h3 className="text-xs font-bold text-slate-600">Request notes</h3><p className="mt-1 whitespace-pre-wrap break-words">{request.notes}</p></div>}
      <section>
        <h3 className="mb-2 text-sm font-bold text-slate-950">Requested materials ({request.items.length})</h3>
        <div className="request-detail-table overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[260px] table-fixed text-sm">
            <colgroup><col className="w-1/2" /><col className="w-1/4" /><col className="w-1/4" /></colgroup>
            <thead className="bg-slate-100"><tr>
              <th scope="col" className={tableHeading}>Material</th>
              <th scope="col" className={tableHeading}>Requested</th>
              <th scope="col" className={tableHeading}>Released</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {request.items.map((item) => {
                const unit = item.unit || item.inventoryItem.unit || 'pcs'
                return (
                  <tr key={item.id} className="even:bg-slate-50">
                    <th scope="row" className={`${tableCell} text-left font-semibold`}>
                      {item.inventoryItem.name}
                      {item.inventoryItem.sku && <span className="mt-1 block font-mono text-xs font-normal text-slate-500">{item.inventoryItem.sku}</span>}
                    </th>
                    <td className={tableCell}>{item.requestedQuantity} {unit}</td>
                    <td className={tableCell}>{item.releasedQuantity} {unit}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [decisionError, setDecisionError] = useState('')
  const [printTarget, setPrintTarget] = useState<'register' | RequestRow | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const printDocument = useRef<HTMLElement>(null)
  const selected = requests.find((request) => request.id === selectedId)

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

  useEffect(() => {
    const reset = () => setPrintTarget(null)
    window.addEventListener('afterprint', reset)
    return () => window.removeEventListener('afterprint', reset)
  }, [])

  async function print(target: 'register' | RequestRow) {
    flushSync(() => setPrintTarget(target))
    await printDocument.current?.querySelector('img')?.decode().catch(() => {})
    window.print()
  }

  async function decide(request: RequestRow, nextStatus: 'APPROVED' | 'REJECTED') {
    setBusyId(request.id)
    setDecisionError('')
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
      setDecisionError(reason instanceof Error ? reason.message : 'Could not update request.')
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
    <div className="admin-material-requests space-y-5">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          html:has(.admin-material-print), body:has(.admin-material-print) { height: auto; overflow: visible; background: white; }
          div:has(> div > main > .admin-material-requests .admin-material-print) { min-height: 0; background: white; }
          div:has(> div > main > .admin-material-requests .admin-material-print) > aside,
          div:has(> main > .admin-material-requests .admin-material-print) > :is(header, footer),
          .admin-material-requests:has(.admin-material-print) > :not(.admin-material-print):not(style) { display: none !important; }
          .admin-material-requests:has(.admin-material-print) dialog::backdrop { display: none; }
          div:has(> main > .admin-material-requests .admin-material-print) { display: block; min-height: 0; margin: 0 !important; }
          main:has(> .admin-material-requests .admin-material-print) { padding: 0; }
          .admin-material-print { display: block; margin: 0 !important; color: #111; font: 10pt/1.4 Arial, sans-serif; }
          .admin-material-print h1 { margin: 5mm 0 2mm; font-size: 20pt; font-weight: 700; }
          .admin-material-print header, .admin-material-print dl { break-inside: avoid; }
          .admin-material-print .request-detail-meta { background: white; border: 0; padding: 0; }
          .admin-material-print .request-detail-table { overflow: visible; border: 0; }
          .admin-material-print table { min-width: 0; width: 100%; table-layout: fixed; border-collapse: collapse; }
          .admin-material-print thead { display: table-header-group; }
          .admin-material-print tr { break-inside: avoid; }
          .admin-material-print :is(th, td) { background: white; border-bottom: 1px solid #aaa; padding: 2mm; font-size: 9pt; overflow-wrap: anywhere; }
          .admin-material-print thead th { border-block: 1px solid #555; }
        }
      `}</style>
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-[#172c3c] to-[#08727f] px-5 py-6 text-white sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Materials Requests</h1>
            <p className="mt-2 text-sm text-slate-200">Review and approve materials before Warehouse releases them.</p>
            {!loading && <p className="mt-3 text-sm font-semibold text-yellow-300">{pendingCount} awaiting approval</p>}
          </div>
          <button type="button" onClick={() => void print('register')} disabled={loading || Boolean(error) || requests.length === 0} className="rounded-xl bg-yellow-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-yellow-200 disabled:opacity-50">
            Print all requests
          </button>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="request-register-heading" aria-busy={loading}>
        <div className="space-y-3 border-b border-slate-200 p-4 sm:p-5">
          <div>
            <h2 id="request-register-heading" className="font-bold text-slate-950">Request register</h2>
            <p className="mt-1 text-xs text-slate-600">{loading ? 'Loading requests...' : `${visible.length} of ${requests.length} requests shown`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="search" aria-label="Search requests" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference, requester, project, or material" className={`${field} w-full lg:w-auto lg:flex-1`} />
            <select aria-label="Filter by department" value={source} onChange={(event) => setSource(event.target.value)} className={field}><option value="ALL">All departments</option><option value="SALES">Sales / client orders</option><option value="TECHNICIAN">Technicians</option></select>
            <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className={field}>
              <option value="ALL">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Refresh</button>
          </div>
        </div>

        {loading || visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-600">{loading ? 'Loading requests...' : 'No material requests match the selected filters.'}</p>
        ) : (
          <table className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">Warehouse materials requests</caption>
            <thead className="bg-slate-100">
              <tr>
                <th scope="col" className={tableHeading}>Request</th>
                <th scope="col" className={`${tableHeading} hidden md:table-cell`}>Requester</th>
                <th scope="col" className={`${tableHeading} hidden lg:table-cell`}>Materials</th>
                <th scope="col" className={`${tableHeading} hidden md:table-cell`}>Status</th>
                <th scope="col" className={`${tableHeading} w-[105px] text-right sm:w-[132px]`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((request) => (
                <tr key={request.id} className="even:bg-slate-50/70 hover:bg-cyan-50/40">
                  <th scope="row" className={`${tableCell} text-left align-top`}>
                    <span className="font-mono text-xs font-bold text-slate-950">{request.reference}</span>
                    <time dateTime={request.createdAt} className="mt-1 block text-xs font-normal text-slate-600">{date.format(new Date(request.createdAt))}</time>
                    <div className="mt-2 space-y-1 md:hidden">
                      <p className="text-xs font-normal text-slate-600">{request.requester?.name || 'Unknown requester'} / {department(request.source)}</p>
                      <Status status={request.status} />
                    </div>
                  </th>
                  <td className={`${tableCell} hidden md:table-cell`}>
                    <span className="font-semibold text-slate-900">{request.requester?.name || 'Unknown requester'}</span>
                    <span className="mt-1 block text-xs text-slate-600">{department(request.source)}</span>
                  </td>
                  <td className={`${tableCell} hidden tabular-nums lg:table-cell`}>{request.items.length}</td>
                  <td className={`${tableCell} hidden md:table-cell`}><Status status={request.status} /></td>
                  <td className={`${tableCell} text-right align-top`}>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={`View details for ${request.reference}`}
                      onClick={() => {
                        flushSync(() => {
                          setSelectedId(request.id)
                          setDecisionError('')
                        })
                        dialog.current?.showModal()
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-800 hover:border-cyan-600 hover:bg-cyan-50 sm:px-3"
                    >View details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <dialog ref={dialog} onClose={() => setSelectedId(null)} onCancel={(event) => { if (busyId) event.preventDefault() }} aria-labelledby="request-detail-heading" className={`m-auto w-[calc(100%_-_1rem)] max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/65 ${printTarget ? 'print:!hidden' : ''}`}>
        {selected && (
          <div className="flex max-h-[90dvh] flex-col">
            <header className="flex shrink-0 items-start justify-between gap-3 bg-slate-950 px-5 py-5 text-white sm:px-7">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-cyan-200">Materials request</p>
                <h2 id="request-detail-heading" className="mt-1 break-words text-xl font-black">{selected.reference}</h2>
              </div>
              <button type="button" onClick={() => dialog.current?.close()} disabled={Boolean(busyId)} className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold hover:bg-white/10 disabled:opacity-50">Close</button>
            </header>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
              {decisionError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{decisionError}</p>}
              {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
              <RequestDetails request={selected} />
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
              <button type="button" onClick={() => void print(selected)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100">Print request</button>
              {['PENDING', 'UNDER_REVIEW'].includes(selected.status) && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={Boolean(busyId)} onClick={() => void decide(selected, 'REJECTED')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button>
                  <button type="button" disabled={Boolean(busyId)} onClick={() => void decide(selected, 'APPROVED')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">Approve release</button>
                </div>
              )}
            </footer>
          </div>
        )}
      </dialog>

      {printTarget && (
        <section ref={printDocument} className="admin-material-print hidden print:block">
          <header className="mb-5">
            <SalesLetterhead />
            <h1>{printTarget === 'register' ? 'Materials Request Register' : 'Warehouse Materials Request'}</h1>
            <p>{printTarget === 'register' ? `${requests.length.toLocaleString()} requests` : printTarget.reference}</p>
          </header>
          {printTarget === 'register' ? (
            <table className="text-left">
              <thead><tr><th scope="col">Request</th><th scope="col">Requester / Department</th><th scope="col">Submitted</th><th scope="col">Materials</th><th scope="col">Status</th></tr></thead>
              <tbody>{requests.map((request) => (
                <tr key={request.id}>
                  <th scope="row">{request.reference}</th>
                  <td>{request.requester?.name || 'Unknown requester'}<br />{department(request.source)}</td>
                  <td>{date.format(new Date(request.createdAt))}</td>
                  <td>{request.items.length}</td>
                  <td>{statusLabel(request.status)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <RequestDetails request={printTarget} />}
        </section>
      )}
    </div>
  )
}
