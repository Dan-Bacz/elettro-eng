'use client'

import { useMemo, useState } from 'react'
import { useEffect } from 'react'

type Blackout = { id?: string; date: string; reason?: string | null }

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export default function BookingAvailabilityCalendar() {
  const today = new Date()
  const [month, setMonth] = useState(`${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-01`)
  const [blackouts, setBlackouts] = useState<Blackout[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const monthDate = new Date(`${month}T00:00:00.000Z`)
  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const blackoutMap = useMemo(() => new Map(blackouts.map((item) => [item.date, item])), [blackouts])
  const days = useMemo(() => {
    const firstDay = monthDate.getUTCDay()
    const count = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate()
    return Array.from({ length: firstDay + count }, (_, index) => index < firstDay ? null : new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), index - firstDay + 1)))
  }, [month])

  async function load() {
    const response = await fetch('/api/admin/booking-availability', { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'Could not load booking availability.')
    setBlackouts(payload.dates || [])
  }

  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load booking availability.')) }, [])

  function moveMonth(amount: number) {
    const next = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + amount, 1))
    setMonth(dateKey(next))
  }

  async function toggle(date: Date) {
    const key = dateKey(date)
    if (date.getUTCDay() === 0) return
    setBusy(key); setError('')
    try {
      const exists = blackoutMap.has(key)
      const response = await fetch('/api/admin/booking-availability', { method: exists ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: key, reason: 'Fully booked by Admin' }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Could not update booking availability.')
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update booking availability.') } finally { setBusy('') }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Booking schedule</p><h2 className="mt-1 text-lg font-black text-slate-950">Manage fully booked dates</h2><p className="mt-1 text-xs text-slate-500">Click any Monday–Saturday date to block or reopen it for clients.</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => moveMonth(-1)} className="h-9 w-9 rounded-lg border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50">‹</button><span className="min-w-32 text-center text-sm font-black text-slate-900">{monthLabel}</span><button type="button" onClick={() => moveMonth(1)} className="h-9 w-9 rounded-lg border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50">›</button></div></div><div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-500" /> Fully booked</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Sunday unavailable</span></div><div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-black uppercase tracking-wide text-slate-400">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-2">{day}</div>)}{days.map((date, index) => { if (!date) return <div key={`blank-${index}`} />; const key = dateKey(date); const blackout = blackoutMap.get(key); const sunday = date.getUTCDay() === 0; return <button key={key} type="button" disabled={sunday || busy === key} onClick={() => void toggle(date)} title={sunday ? 'Sundays are unavailable' : blackout ? 'Click to reopen this date' : 'Click to mark fully booked'} className={`min-h-12 rounded-xl border p-2 text-xs font-black transition ${blackout ? 'border-red-300 bg-red-500 text-white shadow-sm' : sunday ? 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300' : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-400 hover:bg-cyan-50'}`}><span>{date.getUTCDate()}</span>{blackout && <span className="mt-0.5 block text-[8px] uppercase">Full</span>}</button> })}</div>{error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}</section>
}
