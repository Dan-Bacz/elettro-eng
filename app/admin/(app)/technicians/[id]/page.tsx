'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusBadge from '../../../../../components/admin/StatusBadge'
import EmptyState from '../../../../../components/admin/EmptyState'
import type { BookingObj, UserObj } from '../../../../../components/admin/types'
import { formatDate } from '../../../../../components/admin/types'

export default function AdminTechnicianDetailPage() {
  const params = useParams<{ id: string }>()
  const techUserId = params?.id ?? ''
  const router = useRouter()
  const [tech, setTech] = useState<UserObj | null>(null)
  const [bookings, setBookings] = useState<BookingObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [profileRes, techRes] = await Promise.all([
          fetch('/api/admin'),
          fetch(`/api/tech?techId=${techUserId}`),
        ])
        if (!profileRes.ok && !techRes.ok) throw new Error('Failed to load technician')
        const profilePayload = await profileRes.json().catch(() => ({ registrations: [] }))
        const found = (profilePayload.registrations || []).find((u: any) => u.id === techUserId)
        const techPayload = techRes.ok ? await techRes.json() : null
        if (!found && !techPayload?.tech) throw new Error('Technician not found')
        if (!cancelled) {
          setTech(found || techPayload?.tech)
          setBookings(techPayload?.bookings || [])
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load technician')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [techUserId])

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />

  if (error || !tech) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="text-2xl">⚠️</div>
        <div className="mt-2 text-sm font-bold text-slate-700">{error || 'Technician not found'}</div>
        <Link href="/admin/technicians" className="text-xs font-bold text-yellow-600 hover:underline">← Back to technicians</Link>
      </div>
    )
  }

  const status = tech.status || (tech.approved ? 'ACTIVE' : 'PENDING')
  const assigned = bookings.filter((b) => b.status === 'ASSIGNED' || b.status === 'IN_PROGRESS').length
  const completed = bookings.filter((b) => b.status === 'COMPLETED').length
  const projectedRevenue = bookings.reduce((sum, b) => sum + (Number(b.budget) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/technicians" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-yellow-600">←</Link>
        <h1 className="text-lg font-black text-slate-900">Technician Profile</h1>
        {tech.status === 'PENDING' && (
          <Link href={`/admin/registrations/${tech.id}`} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black hover:bg-yellow-500 transition-colors">
            Review Registration
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            {tech.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tech.profileImageUrl} alt={tech.name} className="h-14 w-14 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-yellow-400 text-xl font-black">{tech.name?.charAt(0)?.toUpperCase()}</div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">{tech.name}</h2>
                <StatusBadge status={status} />
              </div>
              <div className="text-xs text-slate-400">{tech.email}</div>
            </div>
          </div>

          <dl className="mt-5 space-y-3 text-xs">
            <div className="flex justify-between"><dt className="text-slate-400">Phone</dt><dd className="font-bold text-slate-700">{tech.phone || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Specialization</dt><dd className="font-bold text-slate-700">{tech.specialization || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Experience</dt><dd className="font-bold text-slate-700">{tech.yearsOfExperience != null ? `${tech.yearsOfExperience} yrs` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Address</dt><dd className="font-bold text-slate-700 text-right">{tech.address || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Joined</dt><dd className="font-bold text-slate-700">{formatDate(tech.createdAt)}</dd></div>
          </dl>

          <div className="mt-5">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skills</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {(tech.skills || '').split(/[,\n]/).map((s, i) => s.trim() && (
                <span key={i} className="rounded-full bg-black px-3 py-1 text-[11px] font-bold text-yellow-400">{s.trim()}</span>
              ))}
              {!tech.skills && <span className="text-xs text-slate-400">—</span>}
            </dd>
          </div>
        </div>

        {/* Stats */}
        <div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-2xl font-black text-slate-900">{bookings.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total Jobs</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-2xl font-black text-yellow-600">{assigned}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Active</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-2xl font-black text-emerald-600">{completed}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Completed</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-2xl font-black text-slate-900">${projectedRevenue.toLocaleString()}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Job Value</div>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned bookings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-black text-slate-900">Assigned Bookings</h2>
        {bookings.length === 0 ? (
          <EmptyState icon="🧾" title="No bookings assigned" message="This technician has not been assigned any bookings yet." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4 font-bold">Booking</th>
                  <th className="pb-3 pr-4 font-bold">Client</th>
                  <th className="pb-3 pr-4 font-bold">Status</th>
                  <th className="pb-3 pr-4 font-bold">Dates</th>
                  <th className="pb-3 font-bold text-right">Budget</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/bookings/${b.id}`} className="text-xs font-bold text-slate-800 hover:text-yellow-600">{b.title}</Link>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">{b.client?.name || '—'}</td>
                    <td className="py-3 pr-4"><StatusBadge status={b.status} /></td>
                    <td className="py-3 pr-4 text-xs text-slate-400">{formatDate(b.startDate)} → {formatDate(b.endDate)}</td>
                    <td className="py-3 text-right text-xs font-bold text-slate-700">{b.budget != null ? `$${Number(b.budget).toLocaleString()}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}