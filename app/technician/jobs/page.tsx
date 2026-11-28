'use client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import StatusBadge from '../../../components/admin/StatusBadge'
import EmptyState from '../../../components/admin/EmptyState'
import type { BookingObj, UserObj } from '../../../components/admin/types'
import { formatDate, formatDateTime } from '../../../components/admin/types'
import { formatPeso } from '@/components/client/store/storeUtils'
import ReportPhotoPicker, { ReportPhotoGallery } from '@/components/ReportPhotoPicker'
import { MAX_REPORT_PHOTOS, readReportPhotos } from '@/lib/report-photos'

type RequestedMaterial = {
  requestedQuantity: number
  inventoryItem: { id: string; name: string; unit: string | null }
}

type TechPayload = {
  tech: UserObj
  bookings: (BookingObj & { warehouseRequests: { items: RequestedMaterial[] }[] })[]
}

type UsageDraft = { inventoryItemId: string; quantity: string; note: string }

type ChecklistItem = { id: string; text: string; checked: boolean }
type ReportDraft = {
  progress: string
  content: string
  workDone: string
  issues: string
  nextWork: string
  checklist: ChecklistItem[]
}

const TECH_UPDATE_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED']

export default function TechnicianJobsPage() {
  const router = useRouter()
  const [data, setData] = useState<TechPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const b = data?.bookings.find((booking) => booking.id === selectedJobId)

  useEffect(() => {
    const current = dialog.current
    if (selectedJobId && current && !current.open) {
      current.showModal()
      current.scrollTop = 0
    }
  }, [selectedJobId])
  const [activityMsg, setActivityMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [reportDrafts, setReportDrafts] = useState<Record<string, ReportDraft>>({})
  const [progressPhotos, setProgressPhotos] = useState<Record<string, string[]>>({})
  const [finalPhotos, setFinalPhotos] = useState<Record<string, string[]>>({})
  const [preparingPhoto, setPreparingPhoto] = useState(false)
  const closed = b?.status === 'COMPLETED' || b?.status === 'CANCELLED'
  const readyToComplete = !closed && b?.reports?.[0]?.progress === 100
  const [usageDrafts, setUsageDrafts] = useState<Record<string, UsageDraft>>({})
  async function load() {
    try {
      const res = await fetch('/api/tech')
      if (!res.ok) {
        if (res.status === 401) { router.push('/technician/login'); return }
        throw new Error('Failed to load your jobs')
      }
      const payload = await res.json()
      setData(payload)
      setError('')
    } catch (e: any) {
      setError(e.message || 'Failed to load your jobs')
    } finally {
      setLoading(false)
    }
  }

  const loadCb = useCallback(load, [router])
  useEffect(() => { loadCb() }, [loadCb])

  async function postActivity(bookingId: string) {
    if (!data?.tech || !activityMsg.trim()) return
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch('/api/tech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techId: data.tech.id, bookingId, message: activityMsg.trim() }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to post update')
      }
      setActivityMsg('')
      setNotice('Progress update posted.')
      await loadCb()
    } catch (e: any) {
      setNotice(e.message || 'Failed to post update')
    } finally {
      setBusy(false)
    }
  }

  async function updateStatus(bookingId: string, status: string) {
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', bookingId, status }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to update status')
      }
      setNotice(`Job status updated to ${status}.`)
      await loadCb()
    } catch (e: any) {
      setNotice(e.message || 'Failed to update status')
    } finally {
      setBusy(false)
    }
  }

  function draftFor(bookingId: string): ReportDraft {
    return reportDrafts[bookingId] || { progress: '0', content: '', workDone: '', issues: '', nextWork: '', checklist: [] }
  }

  function updateDraft(bookingId: string, patch: Partial<ReportDraft>) {
    setReportDrafts((current) => ({ ...current, [bookingId]: { ...draftFor(bookingId), ...patch } }))
  }

  async function submitReport(bookingId: string, completeProject = false) {
    const draft = draftFor(bookingId)
    const progress = completeProject ? 0 : Number(draft.progress)
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      setNotice('Progress addition must be a whole number from 0 to 100.')
      return
    }
    if (!completeProject && !draft.content.trim()) {
      setNotice('Add a short summary of the work before submitting the report.')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeProject
          ? { bookingId, progress, content: 'Final project results', photos: finalPhotos[bookingId], completeProject }
          : { bookingId, progress, content: draft.content.trim(), workDone: draft.workDone.trim(), issues: draft.issues.trim(), nextWork: draft.nextWork.trim(), checklist: draft.checklist, photos: progressPhotos[bookingId] }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to submit progress report')
      setReportDrafts((current) => ({ ...current, [bookingId]: { progress: '0', content: '', workDone: '', issues: '', nextWork: '', checklist: [] } }))
      setProgressPhotos((current) => ({ ...current, [bookingId]: [] }))
      if (completeProject) setFinalPhotos((current) => ({ ...current, [bookingId]: [] }))
      setNotice(completeProject ? 'Final results submitted. Project completed.' : 'Progress report submitted and added to the project total.')
      await loadCb()
    } catch (e: any) {
      setNotice(e.message || 'Failed to submit progress report')
    } finally {
      setBusy(false)
    }
  }

  function usageDraftFor(bookingId: string): UsageDraft {
    return usageDrafts[bookingId] || { inventoryItemId: '', quantity: '1', note: '' }
  }

  async function submitUsage(bookingId: string) {
    const draft = usageDraftFor(bookingId)
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch('/api/project-material-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, ...draft, quantity: Number(draft.quantity) }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to record material usage')
      setUsageDrafts(current => ({ ...current, [bookingId]: { inventoryItemId: '', quantity: '1', note: '' } }))
      setNotice('Project material usage recorded.')
      await loadCb()
    } catch (e: any) {
      setNotice(e.message || 'Failed to record material usage')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />)}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        icon="⚠️"
        title={error || 'No data'}
        message="Try refreshing the page."
        action={<button onClick={() => router.refresh()} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black">Refresh</button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight text-slate-950">My Jobs</h1>
      <div className="rounded-[1.6rem] border border-slate-200/90 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,.52)] sm:p-6">
        <h2 className="text-sm font-black text-slate-900">Assigned jobs ({data.bookings.length})</h2>

        {data.bookings.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon="🧾" title="No jobs assigned yet" message="When the admin assigns a job to you, it will appear here." />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data.bookings.map((job) => (
              <article key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-sm font-bold text-slate-950">{job.title}</h3>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{job.client?.name || 'Client'} / {formatDate(job.startDate)} to {formatDate(job.endDate)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {job.budget != null && <span className="text-xs font-semibold text-slate-700">{formatPeso(job.budget, 2)}</span>}
                  <button
                    type="button"
                    aria-label={`View job: ${job.title}`}
                    aria-haspopup="dialog"
                    onClick={() => {
                      setNotice('')
                      setActivityMsg('')
                      setSelectedJobId(job.id)
                    }}
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-800"
                  >
                    View job
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="technician-job-title"
        onClose={() => setSelectedJobId(null)}
        onCancel={(event) => { if (busy) event.preventDefault() }}
        className="m-auto max-h-[90dvh] w-[calc(100%_-_1rem)] max-w-3xl overflow-y-auto overscroll-y-contain rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/65 sm:w-[calc(100%_-_2rem)]"
      >
        {b && (
          <div>
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-950 to-cyan-950 px-5 py-4 text-white sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-cyan-200">Job details</p>
                <h2 id="technician-job-title" className="mt-1 break-words text-lg font-black">{b.title}</h2>
              </div>
              <button type="button" disabled={busy} onClick={() => dialog.current?.close()} className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold hover:bg-white/10 disabled:opacity-50">Close</button>
            </header>
            <div className="space-y-4 p-4 sm:p-6">
              <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-700 sm:grid-cols-2">
                <div><dt className="font-semibold text-slate-600">Client</dt><dd className="mt-1 font-bold">{b.client?.name || 'Client'}</dd></div>
                <div><dt className="font-semibold text-slate-600">Schedule</dt><dd className="mt-1 font-bold">{formatDate(b.startDate)} to {formatDate(b.endDate)}</dd></div>
                <div><dt className="font-semibold text-slate-600">Status</dt><dd className="mt-1"><StatusBadge status={b.status} /></dd></div>
                <div><dt className="font-semibold text-slate-600">Budget</dt><dd className="mt-1 font-bold">{b.budget != null ? formatPeso(b.budget, 2) : 'Not set'}</dd></div>
              </dl>
              {notice && <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">{notice}</p>}
              {/* Description */}
              {b.description && <p className="rounded-xl bg-white p-3 text-xs text-slate-600">{b.description}</p>}

              {/* Actual materials consumed on this project */}
              {(() => {
                const draft = usageDraftFor(b.id)
                const requestedMaterials = new Map<string, RequestedMaterial>()
                for (const request of b.warehouseRequests) {
                  for (const item of request.items) {
                    const previous = requestedMaterials.get(item.inventoryItem.id)
                    requestedMaterials.set(item.inventoryItem.id, {
                      ...item,
                      requestedQuantity: (previous?.requestedQuantity ?? 0) + item.requestedQuantity,
                    })
                  }
                }
                const quantity = Number(draft.quantity)
                const materialUsages = (b as any).materialUsages || []
                return (
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
                    <h3 className="text-sm font-black text-slate-900">Record material usage</h3>
                    <p className="mt-1 text-[11px] text-slate-500">Choose a material you requested for this project and enter how many units you used.</p>
                    {requestedMaterials.size === 0 ? (
                      <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-600">You have no requested materials available to log for this project.</p>
                    ) : <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_85px_minmax(0,1fr)_auto]">
                      <select aria-label="Requested material" value={requestedMaterials.has(draft.inventoryItemId) ? draft.inventoryItemId : ''} onChange={e => setUsageDrafts(current => ({ ...current, [b.id]: { ...draft, inventoryItemId: e.target.value } }))} className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-500">
                        <option value="">Select material</option>
                        {Array.from(requestedMaterials.values(), ({ inventoryItem, requestedQuantity }) => (
                          <option key={inventoryItem.id} value={inventoryItem.id}>{inventoryItem.name} ({requestedQuantity} {inventoryItem.unit || 'pcs'} requested)</option>
                        ))}
                      </select>
                      <input aria-label="Quantity used" type="number" min="1" max="1000000" step="1" value={draft.quantity} onChange={e => setUsageDrafts(current => ({ ...current, [b.id]: { ...draft, quantity: e.target.value } }))} className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-500" placeholder="Qty" />
                      <input value={draft.note} onChange={e => setUsageDrafts(current => ({ ...current, [b.id]: { ...draft, note: e.target.value } }))} className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-500" placeholder="Usage note (optional)" />
                      <button type="button" onClick={() => submitUsage(b.id)} disabled={busy || !requestedMaterials.has(draft.inventoryItemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000} className="rounded-xl bg-cyan-700 px-4 py-2 text-xs font-black text-white transition hover:bg-cyan-800 disabled:opacity-50">Record</button>
                    </div>}
                    {materialUsages.length > 0 && <div className="mt-3 space-y-1.5">{materialUsages.map((usage: any) => <div key={usage.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs"><span className="font-bold text-slate-700">{usage.inventoryItem?.name || 'Material'}</span><span className="text-slate-500">{usage.quantity} {usage.unit || usage.inventoryItem?.unit || 'pcs'}{usage.note ? ` · ${usage.note}` : ''}</span></div>)}</div>}
                  </div>
                )
              })()}

              {/* Structured progress report */}
              {!closed && !readyToComplete && (() => {
                const draft = draftFor(b.id)
                return (
                  <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-white p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div><h3 className="text-sm font-black text-slate-900">Add project progress</h3><p className="mt-1 text-[11px] text-slate-500">Add the work completed in this update. Each report is added to the previous total until the project reaches 100%.</p></div>
                      <div className="flex items-center gap-2"><span className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-black text-emerald-700">Current: {b.reports?.[0]?.progress ?? 0}%</span><label className="flex items-center gap-2 text-xs font-black text-slate-700">Add %<input type="number" min="0" max="100" value={draft.progress} onChange={(e) => updateDraft(b.id, { progress: e.target.value })} className="w-20 rounded-lg border border-yellow-200 bg-white px-2 py-1.5 text-center font-black outline-none focus:ring-2 focus:ring-yellow-300" /></label></div>
                    </div>
                    <textarea value={draft.content} onChange={(e) => updateDraft(b.id, { content: e.target.value })} placeholder="Progress summary (required)" rows={2} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200" />
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Work checklist</span><button type="button" onClick={() => updateDraft(b.id, { checklist: [...draft.checklist, { id: `${Date.now()}-${draft.checklist.length}`, text: '', checked: false }] })} className="rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-black text-yellow-300">+ Add task</button></div>{draft.checklist.length === 0 ? <p className="mt-2 text-[11px] text-slate-400">Add the project tasks you are tracking, then check each completed task.</p> : <div className="mt-2 space-y-2">{draft.checklist.map((item) => <div key={item.id} className="flex items-center gap-2"><input type="checkbox" checked={item.checked} onChange={(e) => updateDraft(b.id, { checklist: draft.checklist.map((task) => task.id === item.id ? { ...task, checked: e.target.checked } : task) })} className="h-4 w-4 accent-yellow-400" /><input value={item.text} onChange={(e) => updateDraft(b.id, { checklist: draft.checklist.map((task) => task.id === item.id ? { ...task, text: e.target.value } : task) })} placeholder="Task or deliverable" className={`min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-yellow-400 ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`} /><button type="button" onClick={() => updateDraft(b.id, { checklist: draft.checklist.filter((task) => task.id !== item.id) })} className="px-1 text-xs font-black text-red-400 hover:text-red-600">×</button></div>)}</div>}</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3"><input value={draft.workDone} onChange={(e) => updateDraft(b.id, { workDone: e.target.value })} placeholder="Additional work done" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-yellow-400" /><input value={draft.issues} onChange={(e) => updateDraft(b.id, { issues: e.target.value })} placeholder="Issues / blockers" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-yellow-400" /><input value={draft.nextWork} onChange={(e) => updateDraft(b.id, { nextWork: e.target.value })} placeholder="Next work" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-yellow-400" /></div>
                    <p className="mt-3 text-xs text-slate-600">Capture 1 to {MAX_REPORT_PHOTOS} photos of the work before submitting.</p>
                    <ReportPhotoPicker key={b.id} label="Progress photos (required)" photos={progressPhotos[b.id] ?? []} onChange={(photos) => setProgressPhotos((current) => ({ ...current, [b.id]: photos }))} onProcessing={setPreparingPhoto} disabled={busy || preparingPhoto} />
                    <button type="button" onClick={() => submitReport(b.id)} disabled={busy || preparingPhoto || !progressPhotos[b.id]?.length} className="mt-3 rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-black transition hover:bg-yellow-500 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit progress report'}</button>
                  </div>
                )
              })()}

              {readyToComplete && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="text-sm font-black text-emerald-950">Final project results</h3>
                  <p className="mt-1 text-xs text-emerald-800">Progress is at 100%. Capture at least one photo of the finished work to complete the project.</p>
                  <ReportPhotoPicker key={b.id} label="Final result photos" photos={finalPhotos[b.id] ?? []} onChange={(photos) => setFinalPhotos((current) => ({ ...current, [b.id]: photos }))} onProcessing={setPreparingPhoto} disabled={busy || preparingPhoto} />
                  <button type="button" onClick={() => submitReport(b.id, true)} disabled={busy || preparingPhoto || !finalPhotos[b.id]?.length} className="mt-3 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Submit final results and complete</button>
                </section>
              )}

              {b.reports?.filter((report) => readReportPhotos(report.photoUrls).length > 0).map((report) => (
                <section key={report.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <h3 className="text-xs font-bold text-slate-800">{report.content}</h3>
                  <ReportPhotoGallery photos={readReportPhotos(report.photoUrls)} />
                </section>
              ))}

              {/* Status update */}
              {!closed && <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Update status:</span>
                {TECH_UPDATE_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(b.id, s)}
                    disabled={busy || b.status === s}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors disabled:opacity-40 ${
                      b.status === s
                        ? 'bg-black text-yellow-400'
                        : 'border border-slate-200 bg-white text-slate-500 hover:border-yellow-400 hover:text-yellow-700'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>}

              {/* Add progress update */}
              <div className="flex gap-2">
                <input
                  value={activityMsg}
                  onChange={(e) => setActivityMsg(e.target.value)}
                  placeholder="Post a progress update…"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <button
                  onClick={() => postActivity(b.id)}
                  disabled={busy || !activityMsg.trim()}
                  className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-yellow-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {busy ? '…' : 'Post'}
                </button>
              </div>

              {/* Activity timeline */}
              <div className="space-y-2">
                {(b.technicianActivities || []).length === 0 && (
                  <div className="rounded-xl bg-white p-3 text-xs text-slate-400">No updates posted yet.</div>
                )}
                {(b.technicianActivities || []).map((a) => (
                  <div key={a.id} className="relative pl-4">
                    <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-yellow-400" />
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs font-bold text-slate-800">{a.message}</div>
                      <div className="mt-1 text-[10px] text-slate-400">{formatDateTime(a.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  )
}
