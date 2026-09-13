'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusBadge from '../../../../../components/admin/StatusBadge'
import { statusProgress, formatDate, formatDateTime } from '../../../../../components/admin/types'
import type { BookingObj } from '../../../../../components/admin/types'

const STEPS = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']

export default function AdminProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const bookingId = params?.id ?? ''
  const [booking, setBooking] = useState<BookingObj | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`)
        if (!res.ok) throw new Error('Failed to load project')
        const data = await res.json()
        if (!cancelled) setBooking(data)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load project')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [bookingId])

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />

  if (error || !booking) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="text-2xl">⚠️</div>
        <div className="mt-2 text-sm font-bold text-slate-700">{error || 'Project not found'}</div>
        <Link href="/admin/projects" className="text-xs font-bold text-yellow-600 hover:underline">← Back to projects</Link>
      </div>
    )
  }

  const progress = statusProgress(booking.status)
  const currentStepIndex = STEPS.indexOf(booking.status as any)

  return (
    <div className="space-y-6">
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
        <Link href={`/admin/bookings/${booking.id}`} className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-yellow-400 hover:bg-slate-800 transition-colors">
          Manage Booking →
        </Link>
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
          </div>

          {/* Project info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Project Details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Client</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{booking.client?.name || '—'}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Technician</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{booking.assignedTo?.name || '—'}</dd></div>
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

        {/* Side summary */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">Summary</h2>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Description</span></div>
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
    </div>
  )
}