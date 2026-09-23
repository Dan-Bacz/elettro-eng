'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusBadge from '../../../../../components/admin/StatusBadge'
import ConfirmDialog from '../../../../../components/admin/ConfirmDialog'
import { BOOKING_STATUSES } from '../../../../../components/admin/types'
import { formatDate, formatDateTime } from '../../../../../components/admin/types'
import type { BookingObj, UserObj } from '../../../../../components/admin/types'

export default function AdminBookingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingObj | null>(null)
  const [techs, setTechs] = useState<UserObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [budget, setBudget] = useState('')
  const [techId, setTechId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [showDecline, setShowDecline] = useState(false)

  const bookingId = params?.id ?? ''

  async function load() {
    try {
      const [bRes, tRes] = await Promise.all([
        fetch(`/api/bookings/${bookingId}`),
        fetch('/api/users?role=TECH'),
      ])
      if (!bRes.ok) throw new Error('Failed to load booking')
      const b = await bRes.json()
      setBooking(b)
      setNewStatus(b.status || '')
      setBudget(b.budget != null ? String(b.budget) : '')
      setTechId(b.assignedToId || '')
      setStartDate(b.startDate ? b.startDate.slice(0, 10) : '')
      setEndDate(b.endDate ? b.endDate.slice(0, 10) : '')
      if (tRes.ok) {
        const t = await tRes.json()
        setTechs(t.users || [])
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load booking')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  async function post(action: string, body: Record<string, any> = {}) {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, bookingId, ...body }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Action failed')
      }
      setMessage('Saved successfully.')
      await load()
    } catch (e: any) {
      setError(e.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleStatus() {
    await post('update_status', { status: newStatus || booking?.status || '', budget: budget ? Number(budget) : null })
  }

  async function handleDelete() {
    await post('delete_booking')
    setShowDelete(false)
    router.push('/admin/bookings')
  }

  async function handleDecline() {
    await post('decline')
    setShowDecline(false)
  }

  async function handleTeamAdd() {
    if (!techId) return
    if (teamLocked) {
      await post('add_technician', { assignToId: techId })
    } else {
      await post('assign', { assignToId: techId, startDate: startDate || undefined, endDate: endDate || undefined })
    }
  }

  async function handleUnassign() {
    await post('assign', { assignToId: null })
  }

  if (loading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />
  }

  if (error && !booking) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="text-2xl">⚠️</div>
        <div className="mt-2 text-sm font-bold text-slate-700">{error}</div>
        <Link href="/admin/bookings" className="text-xs font-bold text-yellow-600 hover:underline">← Back to bookings</Link>
      </div>
    )
  }

  if (!booking) return null

  const teamMembers = booking.project?.assignments || []
  const teamLocked = teamMembers.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/bookings" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-yellow-600">←</Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-slate-900">{booking.title}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <div className="mt-1 text-xs text-slate-400">Created {formatDateTime(booking.createdAt)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(booking.status === 'PENDING' || booking.status === 'APPROVED') && (
            <button
              onClick={() => setShowDecline(true)}
              disabled={busy}
              className="rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Decline Booking
            </button>
          )}
          <button
            onClick={() => setShowDelete(true)}
            disabled={busy}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            Delete Booking
          </button>
        </div>
      </div>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">{message}</div>}
      {error && booking && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Booking Details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail label="Client" value={
                booking.client ? `${booking.client.name} (${booking.client.email})${booking.client.phone ? ` · ${booking.client.phone}` : ''}` : '—'
              } />
              <Detail label="Budget" value={booking.budget != null ? `$${Number(booking.budget).toLocaleString()}` : '—'} />
              <Detail label="Start Date" value={formatDate(booking.startDate)} />
              <Detail label="End Date" value={formatDate(booking.endDate)} />
            </dl>
            {booking.description && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">{booking.description}</div>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Technician Activity</h2>
            <div className="mt-4 space-y-4">
              {(booking.technicianActivities || []).length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No activity recorded yet.</div>
              )}
              {(booking.technicianActivities || []).map((a) => (
                <div key={a.id} className="relative pl-5">
                  <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-bold text-slate-800">{a.message}</div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {a.tech?.name || 'Technician'} · {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reports */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Reports</h2>
            <div className="mt-4 space-y-4">
              {(booking.reports || []).length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No reports attached.</div>
              )}
              {(booking.reports || []).map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="whitespace-pre-wrap text-xs text-slate-700">{r.content}</div>
                  <div className="mt-2 text-[10px] text-slate-400">
                    {r.author?.name || 'Unknown'} · {formatDateTime(r.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          {/* Approval */}
          {booking.status === 'PENDING' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-black text-slate-900">Approval</h2>
              <p className="mt-1 text-xs text-slate-500">Approving converts this booking into a project.</p>
              <button
                onClick={() => post('approve')}
                disabled={busy}
                className="mt-3 w-full rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-bold text-black hover:bg-yellow-500 transition-colors disabled:opacity-50"
              >
                Approve Booking
              </button>
            </div>
          )}

          {/* Project team */}
          {(booking.status === 'APPROVED' || booking.status === 'ASSIGNED' || booking.status === 'IN_PROGRESS') && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900">Project Team</h2>
                {teamMembers.length > 0 && <StatusBadge status={booking.status} />}
              </div>
              {teamMembers.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">No technicians assigned yet. Assign the first technician to start the project.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {teamMembers.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-yellow-400 text-[10px] font-black">{m.tech?.name?.charAt(0) || '?'}</span>
                      <span className="text-xs font-bold text-slate-700">{m.tech?.name || 'Technician'}</span>
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
                  disabled={busy || !techId}
                  className="w-full rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-yellow-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {teamMembers.length > 0 ? 'Add Technician to Project' : 'Assign First Technician'}
                </button>
                {teamMembers.length > 0 && (
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
          )}

          {/* Status update */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Project Status</h2>
            {teamLocked ? (
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 leading-relaxed">
                Technicians are assigned to this project. Status is updated by the assigned technicians as they report
                progress (in progress → completed). You can still update the budget below.
              </p>
            ) : (
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400">
                {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-500 mb-1">Budget (USD)</label>
              <input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 500" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <button
              onClick={handleStatus}
              disabled={busy}
              className="mt-3 w-full rounded-xl border border-yellow-400 bg-white px-4 py-2.5 text-xs font-bold text-yellow-700 hover:bg-yellow-50 transition-colors disabled:opacity-50"
            >
              Save {teamLocked ? 'Budget' : 'Status & Budget'}
            </button>
          </div>

          {/* Client card */}
          {booking.client && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-black text-slate-900">Client</h2>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-yellow-400 text-sm font-black">
                  {(booking.client.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-800">{booking.client.name}</div>
                  <div className="truncate text-xs text-slate-400">{booking.client.email}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete Booking"
        message={`Are you sure you want to delete "${booking.title}"? This will also remove related activities and reports. This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      <ConfirmDialog
        open={showDecline}
        title="Decline Booking"
        message={`Decline "${booking.title}"? The client will be notified that the booking was declined.`}
        confirmLabel="Decline"
        danger
        busy={busy}
        onConfirm={handleDecline}
        onCancel={() => setShowDecline(false)}
      />
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-xs font-semibold text-slate-700">{value}</dd>
    </div>
  )
}