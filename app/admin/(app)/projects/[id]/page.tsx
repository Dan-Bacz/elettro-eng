'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusBadge from '../../../../../components/admin/StatusBadge'
import ConfirmDialog from '../../../../../components/admin/ConfirmDialog'
import { statusProgress, formatDate, formatDateTime } from '../../../../../components/admin/types'
import type { BookingObj, UserObj } from '../../../../../components/admin/types'

const STEPS = ['APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']

function parseWorkDetails(value?: string | null) {
  if (!value) return { summary: '', checklist: [] as { text: string; status: 'COMPLETED' | 'IN_PROGRESS' }[] }
  try {
    const parsed = JSON.parse(value)
    if (parsed && Array.isArray(parsed.checklist)) {
      return { summary: String(parsed.summary || ''), checklist: parsed.checklist.map((item: any) => ({ text: String(item?.text || ''), status: item?.status === 'COMPLETED' || item?.checked === true ? 'COMPLETED' : 'IN_PROGRESS' })).filter((item: { text: string }) => item.text) }
    }
  } catch { /* legacy plain text */ }
  return { summary: value, checklist: [] as { text: string; status: 'COMPLETED' | 'IN_PROGRESS' }[] }
}

export default function AdminProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const bookingId = params?.id ?? ''
  const [booking, setBooking] = useState<BookingObj | null>(null)
  const [techs, setTechs] = useState<UserObj[]>([])
  const [techId, setTechId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showDecline, setShowDecline] = useState(false)

  async function load() {
    try {
      const [bRes, tRes] = await Promise.all([
        fetch(`/api/bookings/${bookingId}`),
        fetch('/api/users?role=TECH'),
      ])
      if (!bRes.ok) throw new Error('Failed to load project')
      const b = await bRes.json()
      setBooking(b)
      if (tRes.ok) {
        const t = await tRes.json()
        setTechs(t.users || [])
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  async function post(action: string, body: Record<string, unknown> = {}) {
    setBusy(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, bookingId, ...body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Action failed')
      await load()
    } catch (e: any) {
      setError(e.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleTeamAdd() {
    if (!techId) return
    if (teamLocked) {
      await post('add_technician', { assignToId: techId })
    } else {
      await post('assign', { assignToId: techId })
    }
  }

  async function handleDecline() {
    await post('decline')
    setShowDecline(false)
  }

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />

  if (error || !booking) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="text-2xl">⚠️</div>
        <div className="mt-2 text-sm font-bold text-slate-700">{error || 'Project not found'}</div>
        <div className="mt-3 text-xs text-slate-400">{error ? 'This project was likely deleted.' : ''}</div>
        <Link href="/admin/projects" className="mt-3 inline-block text-xs font-bold text-yellow-600 hover:underline">← Back to projects</Link>
      </div>
    )
  }

  const teamMembers = booking.project?.assignments || []
  const teamLocked = teamMembers.length > 0
  const latestReport = booking.reports?.[0]
  const progress = latestReport?.progress != null ? Math.max(0, Math.min(100, Number(latestReport.progress))) : statusProgress(booking.status)
  const currentStepIndex = STEPS.indexOf(booking.status as any)
  const reportCount = (booking.reports || []).length
  const activityCount = (booking.technicianActivities || []).length

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">⚠️ {error}</div>
      )}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#12313b] to-[#08717d] p-6 text-white shadow-[0_28px_60px_-30px_rgba(15,23,42,0.8)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100"><Link href="/admin/projects" className="transition hover:text-white">Projects</Link><span className="text-white/40">/</span><span>Project workspace</span></div>
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-black tracking-tight sm:text-4xl">{booking.title}</h1><StatusBadge status={booking.status} /></div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">This accepted booking is now managed as a project. Field progress below is driven by the latest technician-submitted report.</p>
            <div className="mt-4 text-xs text-slate-300">Project #{booking.project?.id?.slice(0, 8) || booking.id.slice(0, 8)} · Created {formatDate(booking.createdAt)}</div>
          </div>
          {booking.status === 'APPROVED' && <button onClick={() => setShowDecline(true)} disabled={busy} className="w-fit rounded-xl border border-red-200/30 bg-red-500/15 px-4 py-2.5 text-xs font-bold text-red-100 transition hover:bg-red-500/25 disabled:opacity-50">Decline project</button>}
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-3 border-t border-white/15 pt-5 sm:grid-cols-4">
          {[['Progress', `${progress}%`], ['Reports', String(reportCount)], ['Team', String(teamMembers.length)], ['Activities', String(activityCount)]].map(([label, value]) => <div key={label}><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div></div>)}
        </div>
      </section>

      <div className="hidden flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/projects" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-yellow-600">←</Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-slate-900">{booking.title}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <div className="mt-1 text-xs text-slate-400">Project #{booking.id.slice(0, 8)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {booking.status === 'APPROVED' && (
            <button
              onClick={() => setShowDecline(true)}
              disabled={busy}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          )}
          <span className="hidden">
            Manage Booking →
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Progress stepper */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.7)] sm:p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Live field signal</p><h2 className="mt-1 text-lg font-black text-slate-900">Project Progress</h2></div>
              <span className="text-3xl font-black text-slate-900">{progress}%</span>
            </div>
            <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 shadow-[0_0_20px_rgba(34,211,238,0.45)]" style={{ width: `${progress}%` }} /></div>
            <div className="mt-5 flex items-center">
              {STEPS.map((step, i) => {
                const done = i <= currentStepIndex
                return (
                  <div key={step} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${done ? 'bg-yellow-400 text-black' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                        {i + 1}
                      </div>
                      <span className={`mt-1.5 text-[10px] font-bold ${done ? 'text-slate-800' : 'text-slate-400'}`}>{step.replace('_', ' ')}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`mx-2 h-1 flex-1 rounded-full ${i < currentStepIndex ? 'bg-yellow-400' : 'bg-slate-100'}`} />
                    )}
                  </div>
                )
              })}
            </div>
            {teamLocked && booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                Status (in progress → completed / cancelled) is managed by the assigned technicians from their
                dashboard. You can only add technicians and edit the budget.
              </p>
            )}
          </div>

          {/* Project info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Project Details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{booking.client?.name || '—'}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lead Technician</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{booking.assignedTo?.name || '—'}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Date</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{formatDate(booking.startDate)}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Date</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{formatDate(booking.endDate)}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Budget</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{booking.budget != null ? `$${Number(booking.budget).toLocaleString()}` : '—'}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Created</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{formatDate(booking.createdAt)}</dd></div>
            </dl>
          </div>

          {/* Activity timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Activity Log</h2>
            <div className="mt-4 space-y-4">
              {(booking.technicianActivities || []).length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No activity recorded yet.</div>
              )}
              {(booking.technicianActivities || []).map((a) => (
                <div key={a.id} className="relative pl-5">
                  <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-bold text-slate-800">{a.message}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{a.tech?.name || 'Technician'} · {formatDateTime(a.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-black text-slate-900">Technician Progress Reports</h2><span className="rounded-full bg-yellow-50 px-2.5 py-1 text-[10px] font-black text-yellow-700">{(booking.reports || []).length}</span></div>
            <div className="mt-4 space-y-3">
              {(booking.reports || []).length === 0 && <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No progress reports submitted yet.</div>}
              {(booking.reports || []).map((report) => {
                const details = parseWorkDetails(report.workDone)
                return <div key={report.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-800">{report.author?.name || 'Technician'}</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">{report.progress ?? 0}%</span></div><div className="mt-2 text-xs leading-5 text-slate-600">{report.content}</div>{details.summary && <div className="mt-2 text-[11px] text-slate-500"><span className="font-black text-slate-700">Work details:</span> {details.summary}</div>}{details.checklist.length > 0 && <div className="mt-3 space-y-1.5">{details.checklist.map((item, index) => { const completed = item.status === 'COMPLETED'; return <div key={`${report.id}-${index}`} className={`flex items-center justify-between gap-2 text-[11px] ${completed ? 'text-emerald-700' : 'text-amber-700'}`}><div className="flex min-w-0 items-center gap-2"><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-black ${completed ? 'border-emerald-400 bg-emerald-100' : 'border-amber-300 bg-amber-50'}`}>{completed ? '✓' : '·'}</span><span className={completed ? 'line-through opacity-75' : ''}>{item.text}</span></div><span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase">{completed ? 'Completed' : 'In progress'}</span></div> })}</div>}<div className="mt-2 text-[10px] text-slate-400">{formatDateTime(report.createdAt)}{report.issues ? ` · Issues: ${report.issues}` : ''}{report.nextWork ? ` · Next: ${report.nextWork}` : ''}</div></div>
              })}
            </div>
          </div>
        </div>

        {/* Side: team + summary */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Project Team</h2>
            {teamMembers.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">No technicians assigned yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {teamMembers.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-yellow-400 text-[10px] font-black">{m.tech?.name?.charAt(0) || '?'}</span>
                    <span className="text-xs font-bold text-slate-700">
                      {m.tech?.name || 'Technician'}
                      {m.techId === booking.assignedToId && <span className="ml-1 text-[10px] font-bold text-yellow-600">(lead)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 space-y-3">
              <select value={techId} onChange={(e) => setTechId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">— Select technician —</option>
                {techs.filter((t) => !teamMembers.some((m) => m.techId === t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button
                onClick={handleTeamAdd}
                disabled={busy || !techId || booking.status === 'COMPLETED' || booking.status === 'CANCELLED'}
                className="w-full rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-yellow-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {teamLocked ? 'Add Technician to Project' : 'Assign First Technician'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Summary</h2>
            <div className="mt-4 space-y-3 text-xs">
              <p className="rounded-xl bg-slate-50 p-3 text-slate-600 leading-relaxed">
                {booking.description || 'No description provided.'}
              </p>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Reports</span>
                <span className="font-black text-slate-800">{(booking.reports || []).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Activity entries</span>
                <span className="font-black text-slate-800">{(booking.technicianActivities || []).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDecline}
        title="Decline Project"
        message={`Decline "${booking.title}"? The client will be notified and the booking will be cancelled. Only projects with no assigned technicians can be declined.`}
        confirmLabel="Decline"
        danger
        busy={busy}
        onConfirm={handleDecline}
        onCancel={() => setShowDecline(false)}
      />
    </div>
  )
}
