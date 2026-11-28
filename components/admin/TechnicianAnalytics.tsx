'use client'

import { useMemo } from 'react'

type Props = { bookings: any[] }

const statusProgress: Record<string, number> = { APPROVED: 15, ASSIGNED: 25, IN_PROGRESS: 60, COMPLETED: 100, CANCELLED: 0 }

function progressFor(booking: any) {
  const report = booking.reports?.[0]
  return Math.max(0, Math.min(100, Number(report?.progress ?? statusProgress[booking.status] ?? 0)))
}

export default function TechnicianAnalytics({ bookings }: Props) {
  const analytics = useMemo(() => {
    const active = bookings.filter((b) => ['ASSIGNED', 'IN_PROGRESS'].includes(b.status)).length
    const completed = bookings.filter((b) => b.status === 'COMPLETED').length
    const queued = Math.max(0, bookings.length - active - completed)
    const total = bookings.length || 1
    const average = bookings.length ? Math.round(bookings.reduce((sum, b) => sum + progressFor(b), 0) / bookings.length) : 0
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index))
      const key = date.toISOString().slice(0, 10)
      const count = bookings.reduce((sum, b) => sum + (b.technicianActivities || []).filter((a: any) => String(a.createdAt || '').slice(0, 10) === key).length + (b.reports || []).filter((r: any) => String(r.createdAt || '').slice(0, 10) === key).length, 0)
      return { label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2), count }
    })
    return { active, completed, queued, total, average, days }
  }, [bookings])

  const maxActivity = Math.max(1, ...analytics.days.map((day) => day.count))

  return (
    <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-[#10232c] to-[#123e49] p-5 text-white shadow-[0_30px_70px_-32px_rgba(8,114,127,.7)] sm:p-6" style={{ perspective: 1200 }}>
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">3D workload intelligence</p><h2 className="mt-1 text-lg font-black">Your field performance</h2></div><span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black text-emerald-200">LIVE</span></div>
        <div className="relative mt-6 grid items-center gap-6 sm:grid-cols-[190px_1fr]">
          <div className="relative mx-auto h-44 w-44" style={{ transform: 'rotateX(58deg) rotateZ(-18deg)', transformStyle: 'preserve-3d' }}>
            <div className="absolute inset-0 rounded-full opacity-40 blur-[1px]" style={{ background: `conic-gradient(#facc15 0 ${Math.round((analytics.active / analytics.total) * 100)}%, #22d3ee ${Math.round((analytics.active / analytics.total) * 100)}% ${Math.round(((analytics.active + analytics.completed) / analytics.total) * 100)}%, #334155 ${Math.round(((analytics.active + analytics.completed) / analytics.total) * 100)}% 100%)`, transform: 'translateZ(-15px) scale(1.04)' }} />
            <div className="absolute inset-0 rounded-full shadow-[0_18px_30px_rgba(0,0,0,.45)]" style={{ background: `conic-gradient(#facc15 0 ${Math.round((analytics.active / analytics.total) * 100)}%, #22d3ee ${Math.round((analytics.active / analytics.total) * 100)}% ${Math.round(((analytics.active + analytics.completed) / analytics.total) * 100)}%, #334155 ${Math.round(((analytics.active + analytics.completed) / analytics.total) * 100)}% 100%)`, mask: 'radial-gradient(transparent 0 53%, #000 55% 100%)', WebkitMask: 'radial-gradient(transparent 0 53%, #000 55% 100%)' }} />
            <div className="absolute inset-[25%] rounded-full bg-slate-950/90 shadow-inner" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[['Active jobs', analytics.active, 'text-yellow-300'], ['Completed', analytics.completed, 'text-cyan-300'], ['Queued', analytics.queued, 'text-slate-300'], ['Average progress', `${analytics.average}%`, 'text-emerald-300']].map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-2xl font-black ${color}`}>{value}</p></div>)}
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-4 text-[10px] font-bold text-slate-300"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-yellow-300" />Active workload</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-cyan-300" />Completed</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-slate-600" />Queued</span></div>
      </div>

      <div className="rounded-[2rem] border border-slate-200/90 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,.52)] sm:p-6">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Activity pulse</p><h2 className="mt-1 text-lg font-black text-slate-900">Last 7 days</h2></div><span className="rounded-full bg-yellow-50 px-2.5 py-1 text-[10px] font-black text-yellow-700">Updates + reports</span></div>
        <div className="mt-7 flex h-36 items-end justify-between gap-2">
          {analytics.days.map((day) => <div key={day.label + day.count} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="relative flex h-28 w-full items-end justify-center"><div className="w-full max-w-[26px] rounded-t-xl bg-gradient-to-t from-cyan-500 via-cyan-400 to-yellow-300 shadow-[0_8px_18px_-6px_rgba(6,182,212,.7)] transition-all duration-700" style={{ height: `${Math.max(10, (day.count / maxActivity) * 100)}%` }}><span className="absolute -mt-5 w-full text-center text-[10px] font-black text-slate-500">{day.count}</span></div></div><span className="text-[10px] font-black uppercase text-slate-400">{day.label}</span></div>)}
        </div>
        <div className="mt-5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">Keep posting concise updates to keep your project timeline and admin analytics current.</div>
      </div>

    </section>
  )
}
