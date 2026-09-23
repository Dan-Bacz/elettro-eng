'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusBadge from '../../../../../components/admin/StatusBadge'
import ConfirmDialog from '../../../../../components/admin/ConfirmDialog'
import { statusProgress, formatDate, formatDateTime } from '../../../../../components/admin/types'
import type { BookingObj, UserObj } from '../../../../../components/admin/types'

const STEPS = ['APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']

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

  async function handleUnassign() {
    await post('assign', { assignToId: null })
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
  const progress = statusProgress(booking.status)
  const currentStepIndex = STEPS.indexOf(booking.status as any)

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">⚠️ {error}</div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
          <Link href={`/admin/bookings/${booking.id}`} className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-yellow-400 hover:bg-slate-800 transition-colors">
            Manage Booking →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Progress stepper */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">Project Progress</h2>
              <span className="text-xs font-black text-yellow-600">{progress}%</span>
            </div>
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
            {teamLocked && booking.status !== 'COMPLETED' && (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                Status is managed by the assigned technicians as they report progress. An admin can still edit budget and add or remove technicians.
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
              {teamLocked && booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
                <button
                  onClick={handleUnassign}
                  disabled={busy}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Remove all technicians (back to approved)
                </button>
              )}
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