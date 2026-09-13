'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusBadge from '../../../../../components/admin/StatusBadge'
import ConfirmDialog from '../../../../../components/admin/ConfirmDialog'
import { formatDate } from '../../../../../components/admin/types'
import type { UserObj } from '../../../../../components/admin/types'

export default function AdminRegistrationDetailPage() {
  const params = useParams<{ id: string }>()
  const registrationId = params?.id ?? ''
  const router = useRouter()
  const [user, setUser] = useState<UserObj | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/admin')
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return }
          throw new Error('Failed to load registration')
        }
        const payload = await res.json()
        const found = (payload.registrations || []).find((r: any) => r.id === registrationId)
        if (!found) throw new Error('Registration not found')
        if (!cancelled) setUser(found)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load registration')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [registrationId, router])

  async function act(action: string, extra: Record<string, any> = {}) {
    if (!user) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: user.id, ...extra }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Action failed')
      }
      setShowReject(false)
      setRejectReason('')
      const up = await fetch('/api/admin')
      if (up.ok) {
        const payload = await up.json()
        const found = (payload.registrations || []).find((r: any) => r.id === user.id)
        if (found) setUser(found)
      }
    } catch (e: any) {
      setError(e.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  function status(u: UserObj) {
    return u.status || (u.approved ? 'ACTIVE' : 'PENDING')
  }

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />

  if (error || !user) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="text-2xl">⚠️</div>
        <div className="mt-2 text-sm font-bold text-slate-700">{error || 'Not found'}</div>
        <Link href="/admin/registrations" className="text-xs font-bold text-yellow-600 hover:underline">← Back to registrations</Link>
      </div>
    )
  }

  const currentStatus = status(user)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/registrations" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-yellow-600">←</Link>
          <div className="flex items-center gap-3">
            {user.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profileImageUrl} alt={user.name} className="h-12 w-12 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-yellow-400 text-base font-black">{user.name?.charAt(0)?.toUpperCase()}</div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-black text-slate-900">{user.name}</h1>
                <StatusBadge status={currentStatus} />
              </div>
              <div className="mt-1 text-xs text-slate-400">{user.email}{user.phone ? ` · ${user.phone}` : ''}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {currentStatus === 'PENDING' && (
            <>
              <button onClick={() => act('approve_user')} disabled={busy} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {busy ? '…' : 'Approve'}
              </button>
              <button onClick={() => setShowReject(true)} disabled={busy} className="rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                Reject
              </button>
            </>
          )}
          {currentStatus === 'ACTIVE' && (
            <button onClick={() => act('suspend_user')} disabled={busy} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50">
              Suspend
            </button>
          )}
          {(currentStatus === 'SUSPENDED' || currentStatus === 'REJECTED') && (
            <button onClick={() => act('activate_user')} disabled={busy} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50">
              Reinstate / Activate
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      {user.rejectionReason && currentStatus === 'REJECTED' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <span className="font-bold">Rejection reason:</span> {user.rejectionReason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-black text-slate-900">Professional Profile</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Specialization</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{user.specialization || '—'}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Experience</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{user.yearsOfExperience != null ? `${user.yearsOfExperience} years` : '—'}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{user.address || '—'}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Applied</dt><dd className="mt-1 text-xs font-semibold text-slate-700">{formatDate(user.createdAt)}</dd></div>
          </dl>
          <div className="mt-4">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skills</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {(user.skills || '').split(/[,\n]/).map((s, i) => s.trim() && (
                <span key={i} className="rounded-full bg-black px-3 py-1 text-[11px] font-bold text-yellow-400">{s.trim()}</span>
              ))}
              {!user.skills && <span className="text-xs text-slate-400">—</span>}
            </dd>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black text-slate-900">Account</h2>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between"><span className="text-slate-400">Role</span><span className="font-bold text-slate-800">Technician</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Approved</span><span className="font-bold text-slate-800">{user.approved ? 'Yes' : 'No'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Status</span><StatusBadge status={currentStatus} /></div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showReject}
        title={`Reject ${user.name}?`}
        message="Leave a reason the technician will see when they next try to sign in."
        confirmLabel="Reject Application"
        danger
        busy={busy}
        onConfirm={() => act('reject_user', { reason: rejectReason || 'Your application was not approved at this time.' })}
        onCancel={() => setShowReject(false)}
      >
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-500 mb-1">Rejection reason</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Optional reason for rejection…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}