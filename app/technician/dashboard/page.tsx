'use client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import StatusBadge from '../../../components/admin/StatusBadge'
import EmptyState from '../../../components/admin/EmptyState'
import type { BookingObj, UserObj } from '../../../components/admin/types'
import { formatDate, formatDateTime } from '../../../components/admin/types'
import TechnicianSectionPage from '../../../components/admin/TechnicianSectionPage'
import TechnicianAnalytics from '../../../components/admin/TechnicianAnalytics'

type TechPayload = {
  tech: UserObj
  bookings: BookingObj[]
}

type InventoryOption = { id: string; name: string; unit?: string | null }
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

const TECH_UPDATE_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export default function TechnicianDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<TechPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activityMsg, setActivityMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [reportDrafts, setReportDrafts] = useState<Record<string, ReportDraft>>({})
  const [inventoryItems, setInventoryItems] = useState<InventoryOption[]>([])
  const [usageDrafts, setUsageDrafts] = useState<Record<string, UsageDraft>>({})
  const [section, setSection] = useState('home')

  useEffect(() => {
    const syncSection = () => setSection(window.location.hash.replace(/^#/, '') || 'home')
    syncSection()
    window.addEventListener('hashchange', syncSection)
    return () => window.removeEventListener('hashchange', syncSection)
  }, [])

  async function load() {
    try {
      const [res, inventoryRes] = await Promise.all([fetch('/api/tech'), fetch('/api/inventory')])
      if (!res.ok) {
        if (res.status === 401) { router.push('/technician/login'); return }
        throw new Error('Failed to load your jobs')
      }
      const payload = await res.json()
      setData(payload)
      if (inventoryRes.ok) {
        const inventoryPayload = await inventoryRes.json()
        setInventoryItems((Array.isArray(inventoryPayload) ? inventoryPayload : inventoryPayload.inventory || []).filter((item: InventoryOption) => item.id && item.name))
      }
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

  async function submitReport(bookingId: string) {
    const draft = draftFor(bookingId)
    const progress = Number(draft.progress)
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      setNotice('Progress addition must be a whole number from 0 to 100.')
      return
    }
    if (!draft.content.trim()) {
      setNotice('Add a short summary of the work before submitting the report.')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, progress, content: draft.content.trim(), workDone: draft.workDone.trim(), issues: draft.issues.trim(), nextWork: draft.nextWork.trim(), checklist: draft.checklist }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to submit progress report')
      setReportDrafts((current) => ({ ...current, [bookingId]: { progress: String(progress), content: '', workDone: '', issues: '', nextWork: '', checklist: [] } }))
      setNotice('Progress report submitted and added to the project total.')
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

  const active = data.bookings.filter((b) => ['ASSIGNED', 'IN_PROGRESS'].includes(b.status))

  if (section !== 'home' && section !== 'jobs') {
    return <TechnicianSectionPage section={section} data={data} onRefresh={loadCb} />
  }

  return (
    <div className="space-y-7">
      <style jsx global>{` .tech-depth { transform: translateZ(0); transition: transform .25s ease, box-shadow .25s ease; } .tech-depth:hover { transform: translateY(-3px); box-shadow: 0 24px 45px -26px rgba(15,23,42,.42); } `}</style>
      {/* Welcome */}
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#122b35] to-[#08727f] p-6 text-white shadow-[0_32px_70px_-32px_rgba(8,114,127,.8)] sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Live technician overview</div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">Welcome, {data.tech.name.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-sm text-slate-300">
          {data.tech.specialization ? `${data.tech.specialization} · ` : ''}You have {active.length} active job{active.length === 1 ? '' : 's'}.
        </p>
        </div>
      </div>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-bold shadow-sm ${notice.toLowerCase().includes('fail') ? 'border-red-200 bg-red-50 text-red-600' : 'border-emerald-200 bg-emerald-50 text-emerald-600'}`}>
          {notice}
        </div>
      )}

      <TechnicianAnalytics bookings={data.bookings} />

      {/* Bookings */}
      <div id="jobs" className="tech-depth rounded-[1.6rem] border border-slate-200/90 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,.52)] sm:p-6">
        <h2 className="text-sm font-black text-slate-900">My Jobs ({data.bookings.length})</h2>

        {data.bookings.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon="🧾" title="No jobs assigned yet" message="When the admin assigns a job to you, it will appear here." />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {data.bookings.map((b) => {
              const isOpen = expanded === b.id
              return (
                <div key={b.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : b.id)}
                    className="flex w-full flex-col gap-3 p-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900">{b.title}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {b.client?.name || 'Client'} · {formatDate(b.startDate)} → {formatDate(b.endDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <span className="font-bold text-slate-700">{b.budget != null ? `$${Number(b.budget).toLocaleString()}` : '—'}</span>
                      <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-4">
                      {/* Description */}
                      {b.description && <p className="rounded-xl bg-white p-3 text-xs text-slate-600">{b.description}</p>}

                      {/* Actual materials consumed on this project */}
                      {(() => {
                        const draft = usageDraftFor(b.id)
                        const materialUsages = (b as any).materialUsages || []
                        return (
                          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
                            <h3 className="text-sm font-black text-slate-900">Record material usage</h3>
                            <p className="mt-1 text-[11px] text-slate-500">Log the materials actually consumed in the field. Warehouse releases remain separate from project usage.</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_100px_1fr_auto]">
                              <select value={draft.inventoryItemId} onChange={e => setUsageDrafts(current => ({ ...current, [b.id]: { ...draft, inventoryItemId: e.target.value } }))} className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-500">
                                <option value="">Select material</option>
                                {inventoryItems.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit || 'pcs'})</option>)}
                              </select>
                              <input type="number" min="1" step="1" value={draft.quantity} onChange={e => setUsageDrafts(current => ({ ...current, [b.id]: { ...draft, quantity: e.target.value } }))} className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-500" placeholder="Qty" />
                              <input value={draft.note} onChange={e => setUsageDrafts(current => ({ ...current, [b.id]: { ...draft, note: e.target.value } }))} className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-500" placeholder="Usage note (optional)" />
                              <button type="button" onClick={() => submitUsage(b.id)} disabled={busy || !draft.inventoryItemId} className="rounded-xl bg-cyan-700 px-4 py-2 text-xs font-black text-white transition hover:bg-cyan-800 disabled:opacity-50">Record</button>
                            </div>
                            {materialUsages.length > 0 && <div className="mt-3 space-y-1.5">{materialUsages.map((usage: any) => <div key={usage.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs"><span className="font-bold text-slate-700">{usage.inventoryItem?.name || 'Material'}</span><span className="text-slate-500">{usage.quantity} {usage.unit || usage.inventoryItem?.unit || 'pcs'}{usage.note ? ` · ${usage.note}` : ''}</span></div>)}</div>}
                          </div>
                        )
                      })()}

                      {/* Structured progress report */}
                      {(() => {
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
                            <button type="button" onClick={() => submitReport(b.id)} disabled={busy} className="mt-3 rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-black transition hover:bg-yellow-500 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit progress report'}</button>
                          </div>
                        )
                      })()}

                      {/* Status update */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Update status:</span>
                        {TECH_UPDATE_STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(b.id, s)}
                            disabled={busy || b.status === s || (s === 'COMPLETED' && (b.reports?.[0]?.progress ?? 0) < 100)}
                            title={s === 'COMPLETED' && (b.reports?.[0]?.progress ?? 0) < 100 ? 'Submit progress updates until the project reaches 100%.' : undefined}
                            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors disabled:opacity-40 ${
                              b.status === s
                                ? 'bg-black text-yellow-400'
                                : 'border border-slate-200 bg-white text-slate-500 hover:border-yellow-400 hover:text-yellow-700'
                            }`}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

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
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
