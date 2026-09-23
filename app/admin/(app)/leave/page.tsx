'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import StatusBadge from '../../../../components/admin/StatusBadge'
import EmptyState from '../../../../components/admin/EmptyState'
import ConfirmDialog from '../../../../components/admin/ConfirmDialog'
import { leaveTypeLabel, formatDate } from '../../../../components/admin/types'
import type { LeaveObj, LeaveCreditsObj } from '../../../../components/admin/types'

export default function AdminLeavePage() {
  const router = useRouter()
  const [leaves, setLeaves] = useState<LeaveObj[]>([])
  const [credits, setCredits] = useState<LeaveCreditsObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [decision, setDecision] = useState<{ leave: LeaveObj; action: 'approve' | 'reject' } | null>(null)
  const [note, setNote] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/admin/leave')
      if (!res.ok) {
        if (res.status === 401) { router.push('/admin/login'); return }
        throw new Error('Failed to load leave requests')
      }
      const payload = await res.json()
      setLeaves(payload.leaves || [])
      setCredits(payload.credits || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const res = await fetch('/api/admin/leave')
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return }
          throw new Error('Failed to load leave requests')
        }
        const payload = await res.json()
        if (!cancelled) {
          setLeaves(payload.leaves || [])
          setCredits(payload.credits || [])
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load leave requests')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [router])

  async function decide() {
    if (!decision) return
    setBusyId(decision.leave.id)
    try {
      const res = await fetch('/api/admin/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: decision.action, leaveId: decision.leave.id, note: note || undefined }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Action failed')
      setDecision(null)
      setNote('')
      await load()
    } catch (e: any) {
      setError(e.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  const pending = leaves.filter((l) => l.status === 'PENDING')

  return (
    <div className="space-y-6">
      <PageHeader
        icon="🗓️"
        title="Leave Requests"
        subtitle={`${pending.length} leave application${pending.length === 1 ? '' : 's'} awaiting approval`}
      />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : (
        <>
          {/* Leave requests */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-black text-slate-800">Leave Applications</h2>
                <p className="text-[11px] text-slate-400">CSC Form No. 6 – application for leave of absence</p>
              </div>
            </div>

            {leaves.length === 0 ? (
              <EmptyState icon="🗓️" title="No leave applications yet" message="Applications filed by technicians will appear here." />
            ) : (
              <div className="divide-y divide-slate-100">
                {leaves.map((l) => (
                  <div key={l.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-800">{l.tech?.name || 'Technician'}</span>
                        <StatusBadge status={l.status} />
                      </div>
                      <div className="text-[11px] font-bold text-slate-500">{leaveTypeLabel(l.type)} · {l.days} day(s)</div>
                      <div className="text-[11px] text-slate-400">
                        {formatDate(l.fromDate)} → {formatDate(l.toDate)}
                        {l.commutation === 'REQUESTED' ? ' · with pay' : ' · without pay'}
                      </div>
                      {l.reason && <div className="text-[11px] italic text-slate-500 line-clamp-2">{l.reason}</div>}
                      {l.adminNote && <div className="text-[11px] text-slate-400">Note: {l.adminNote}</div>}
                      {l.addressDuringLeave && <div className="text-[11px] text-slate-400">📍 {l.addressDuringLeave}</div>}
                      {l.medicalCertificate && <div className="text-[11px] text-slate-400">🩺 Medical certificate indicated</div>}
                    </div>
                    {l.status === 'PENDING' && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => { setDecision({ leave: l, action: 'approve' }); setNote('') }}
                          disabled={busyId === l.id}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                          {busyId === l.id ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => { setDecision({ leave: l, action: 'reject' }); setNote('') }}
                          disabled={busyId === l.id}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave credits */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-black text-slate-800">Leave Credits</h2>
              <p className="text-[11px] text-slate-400">Earned vacation & sick leave balances per technician</p>
            </div>
            {credits.length === 0 ? (
              <EmptyState icon="💳" title="No technicians yet" message="Approved technicians will be listed with their leave credits." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3 font-bold">Technician</th>
                      <th className="px-4 py-3 font-bold">Vacation</th>
                      <th className="px-4 py-3 font-bold">Sick</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100 hover:bg-yellow-50/40 transition-colors">
                        <td className="px-5 py-3">
                          <div className="text-xs font-bold text-slate-800">{c.tech?.name || 'Technician'}</div>
                          <div className="text-[10px] text-slate-400">{c.tech?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-yellow-400"
                                style={{ width: `${Math.min(100, Math.round((c.vacationUsed / Math.max(1, c.vacation)) * 100))}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600">{Math.max(0, c.vacation - c.vacationUsed)}/{c.vacation} days</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-400"
                                style={{ width: `${Math.min(100, Math.round((c.sickUsed / Math.max(1, c.sick)) * 100))}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600">{Math.max(0, c.sick - c.sickUsed)}/{c.sick} days</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!decision}
        title={decision ? `${decision.action === 'approve' ? 'Approve' : 'Reject'} leave for ${decision.leave.tech?.name || 'technician'}?` : ''}
        message={
          decision
            ? `${leaveTypeLabel(decision.leave.type)} · ${decision.leave.days} day(s) · ${formatDate(decision.leave.fromDate)} → ${formatDate(decision.leave.toDate)}. The technician will be notified by email.`
            : ''
        }
        confirmLabel={decision?.action === 'approve' ? 'Approve Leave' : 'Reject Leave'}
        danger={decision?.action === 'reject'}
        busy={busyId === decision?.leave.id}
        onConfirm={decide}
        onCancel={() => { setDecision(null); setNote('') }}
      >
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-500 mb-1">Remarks / reason (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={decision?.action === 'approve' ? 'Optional approval remarks…' : 'Reason for rejection…'}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}