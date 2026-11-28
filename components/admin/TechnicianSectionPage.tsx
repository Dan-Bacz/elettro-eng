'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import StatusBadge from './StatusBadge'
import TechnicianMaterialRequestForm from './TechnicianMaterialRequestForm'
import AccountSettings from '../departments/AccountSettings'
import { formatDate, formatDateTime } from './types'

type Props = { section: string; data: any; onRefresh: () => Promise<void> }

const card = 'rounded-[1.6rem] border border-slate-200/90 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,.52)]'
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200'
const leaveTypes = ['VACATION', 'SICK', 'MATERNITY', 'PATERNITY', 'SOLO_PARENT', 'SPECIAL_PRIVILEGE', 'STUDY', 'VAWC', 'REHABILITATION', 'SPECIAL_EMERGENCY', 'OTHER']

export default function TechnicianSectionPage({ section, data, onRefresh }: Props) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [leave, setLeave] = useState<any>({ credits: null, leaves: [] })
  const [inventory, setInventory] = useState<any[]>([])
  const [leaveForm, setLeaveForm] = useState({ type: 'VACATION', from: '', to: '', commutation: 'NOT_REQUESTED', addressDuringLeave: '', medicalCertificate: false, reason: '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [availabilityBusy, setAvailabilityBusy] = useState(false)

  useEffect(() => {
    async function loadSection() {
      try {
        if (section === 'notifications') {
          const res = await fetch('/api/notifications')
          if (res.ok) setNotifications((await res.json()).notifications || [])
        }
        if (section === 'leave') {
          const res = await fetch('/api/leave')
          if (res.ok) setLeave(await res.json())
        }
        if (section === 'materials' || section === 'inventory') {
          const res = await fetch('/api/inventory')
          if (res.ok) setInventory(await res.json())
        }
      } catch {
        setNotice('Unable to load this section right now.')
      }
    }
    loadSection()
  }, [section])

  async function markNotification(id?: string) {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(id ? { id } : { markAll: true }) })
    const res = await fetch('/api/notifications')
    if (res.ok) setNotifications((await res.json()).notifications || [])
  }


  async function submitLeave(e: FormEvent) {
    e.preventDefault(); setBusy(true); setNotice('')
    try {
      const res = await fetch('/api/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(leaveForm) })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to submit leave')
      setNotice('Leave application submitted for approval.')
      const refreshed = await fetch('/api/leave'); if (refreshed.ok) setLeave(await refreshed.json())
    } catch (e: any) { setNotice(e.message || 'Failed to submit leave') } finally { setBusy(false) }
  }


  async function updateAvailability(available: boolean) {
    setAvailabilityBusy(true)
    setNotice('')
    try {
      const res = await fetch('/api/tech', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available }) })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Unable to update availability')
      setNotice(available ? 'You are now available for assignments.' : 'You are now marked unavailable.')
      await onRefresh()
    } catch (e: any) { setNotice(e.message || 'Unable to update availability') } finally { setAvailabilityBusy(false) }
  }

  const reports = useMemo(() => (data.bookings || []).flatMap((booking: any) => (booking.reports || []).map((report: any) => ({ ...report, booking }))), [data.bookings])

  const titles: Record<string, [string, string]> = {
    leave: ['Leave Applications', 'Apply for leave and review your leave balance.'],
    notifications: ['Notifications', 'Stay updated with project and material activity.'],
    materials: ['Material Requests', 'Request materials for your assigned projects.'],
    inventory: ['Inventory', 'Browse the current material inventory.'],
    reports: ['Progress Reports', 'Review progress reports submitted for your projects.'],
    settings: ['Account Settings', 'Your technician account and access information.'],
  }
  const [title, subtitle] = titles[section] || titles.settings

  return (
    <div className="space-y-6">
      {section !== 'settings' && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-black text-slate-900">{title}</h1><p className="mt-1 text-xs font-medium text-slate-400">{subtitle}</p></div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Technician access</span>
      </div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}

      {section === 'notifications' && <div className="space-y-3"><div className="flex justify-end"><button onClick={() => markNotification()} className="rounded-xl bg-black px-4 py-2 text-xs font-black text-yellow-400">Mark all read</button></div>{notifications.length === 0 ? <div className={card}><p className="text-sm text-slate-400">No notifications yet.</p></div> : notifications.map((n) => <div key={n.id} className={`${card} ${n.read ? 'opacity-65' : 'border-yellow-200 bg-yellow-50/50'}`} onClick={() => !n.read && markNotification(n.id)}><div className="flex items-start justify-between gap-3"><h2 className="text-sm font-black text-slate-900">{n.title}</h2>{!n.read && <span className="rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black text-black">NEW</span>}</div><p className="mt-2 text-sm text-slate-600">{n.message}</p><p className="mt-2 text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</p></div>)}</div>}

      {section === 'leave' && <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className={card}><h2 className="text-sm font-black text-slate-900">Leave balance</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-yellow-50 p-4"><p className="text-[10px] font-black uppercase text-yellow-700">Vacation</p><p className="mt-1 text-2xl font-black text-slate-900">{leave.credits?.vacation ?? '—'}</p><p className="text-[11px] text-slate-400">days remaining</p></div><div className="rounded-xl bg-blue-50 p-4"><p className="text-[10px] font-black uppercase text-blue-700">Sick</p><p className="mt-1 text-2xl font-black text-slate-900">{leave.credits?.sick ?? '—'}</p><p className="text-[11px] text-slate-400">days remaining</p></div></div><h2 className="mt-6 text-sm font-black text-slate-900">Recent applications</h2><div className="mt-3 space-y-2">{(leave.leaves || []).slice(0, 6).map((item: any) => <div key={item.id} className="rounded-xl border border-slate-100 p-3"><div className="flex justify-between gap-2"><span className="text-xs font-black text-slate-800">{String(item.type).replaceAll('_', ' ')}</span><StatusBadge status={item.status} /></div><p className="mt-1 text-[11px] text-slate-400">{formatDate(item.fromDate)} – {formatDate(item.toDate)} · {item.days} working day(s)</p></div>)}</div></div><form onSubmit={submitLeave} className={`${card} space-y-4`}><h2 className="text-sm font-black text-slate-900">Apply for leave</h2><div className="grid gap-3 sm:grid-cols-2"><select className={input} value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>{leaveTypes.map((type) => <option key={type}>{type}</option>)}</select><select className={input} value={leaveForm.commutation} onChange={(e) => setLeaveForm({ ...leaveForm, commutation: e.target.value })}><option value="NOT_REQUESTED">Not requested</option><option value="REQUESTED">Requested with pay</option></select><input required type="date" className={input} value={leaveForm.from} onChange={(e) => setLeaveForm({ ...leaveForm, from: e.target.value })} /><input required type="date" className={input} value={leaveForm.to} onChange={(e) => setLeaveForm({ ...leaveForm, to: e.target.value })} /></div>{leaveForm.type === 'VACATION' && <input className={input} placeholder="Address during leave" value={leaveForm.addressDuringLeave} onChange={(e) => setLeaveForm({ ...leaveForm, addressDuringLeave: e.target.value })} />}{leaveForm.type === 'SICK' && <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={leaveForm.medicalCertificate} onChange={(e) => setLeaveForm({ ...leaveForm, medicalCertificate: e.target.checked })} /> Medical certificate attached</label>}<textarea className={input} rows={3} placeholder="Reason / remarks" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} /><button disabled={busy} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-black disabled:opacity-50">{busy ? 'Submitting…' : 'Submit application'}</button></form></div>}

      {section === 'materials' && <TechnicianMaterialRequestForm bookings={data.bookings} technicianId={data.tech.id} inventory={inventory} onRefresh={onRefresh} />}

      {section === 'inventory' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{inventory.map((item: any) => <div key={item.id} className={`${card} flex gap-3`}><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">{item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0"><h2 className="truncate text-sm font-black text-slate-900">{item.name}</h2><p className="mt-1 text-xs text-slate-500">{item.category || 'General'} · {item.quantity} {item.unit || 'pcs'}</p><p className={`mt-2 text-[11px] font-bold ${item.quantity <= (item.reorderLevel || 10) ? 'text-red-600' : 'text-emerald-600'}`}>{item.quantity <= (item.reorderLevel || 10) ? 'Low stock' : 'Available'}</p></div></div>)}{inventory.length === 0 && <div className={`${card} sm:col-span-2 xl:col-span-3`}><p className="text-sm text-slate-400">No inventory items available.</p></div>}</div>}

      {section === 'settings' && (
        <AccountSettings
          department="Technician"
          initialProfile={{ name: data.tech.name, email: data.tech.email, profileImageUrl: data.tech.profileImageUrl, phone: null, address: null }}
          onSaved={onRefresh}
        />
      )}

      {section === 'reports' && <div className="space-y-3">{reports.map((report: any) => <div key={report.id} className={card}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-black text-slate-900">{report.booking.title}</h2><span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[11px] font-black text-yellow-700">{report.progress ?? 0}%</span></div><p className="mt-3 text-sm text-slate-600">{report.content}</p><p className="mt-2 text-[11px] text-slate-400">{formatDateTime(report.createdAt)}</p></div>)}{reports.length === 0 && <div className={card}><p className="text-sm text-slate-400">No progress reports submitted yet.</p></div>}</div>}

      {section === 'settings' && <div className={`${card} flex items-center justify-between gap-4`}><div><h2 className="text-sm font-black text-slate-900">Assignment availability</h2><p className="mt-1 text-xs text-slate-500">Turn this off when you are unavailable for new work. Your account stays active.</p></div><button type="button" disabled={availabilityBusy} onClick={() => updateAvailability(data.tech.available === false)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${data.tech.available === false ? 'bg-slate-300' : 'bg-emerald-500'} disabled:opacity-50`} aria-label={data.tech.available === false ? 'Set available' : 'Set unavailable'}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${data.tech.available === false ? 'left-1' : 'left-6'}`} /></button></div>}
      {section === 'settings' && <div className={card}><h2 className="text-sm font-black text-slate-900">Account access</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><div><p className="text-[10px] font-black uppercase text-slate-400">Role</p><p className="mt-1 text-sm font-bold text-slate-800">Technician</p></div><div><p className="text-[10px] font-black uppercase text-slate-400">Status</p><p className="mt-1 text-sm font-bold text-emerald-600">{data.tech.status}</p></div><div><p className="text-[10px] font-black uppercase text-slate-400">Access</p><p className="mt-1 text-sm font-bold text-slate-800">Android app only</p></div></div><p className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Technician access is restricted to the authenticated Elettro Android application.</p></div>}
    </div>
  )
}
