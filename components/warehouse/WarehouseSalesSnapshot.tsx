'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Snapshot = { summary: { orders: number; units: number; revenue: number }; trend: { date: string; revenue: number; units: number }[] }
const money = (value: number) => `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
function dateValue(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

export default function WarehouseSalesSnapshot() {
  const [data, setData] = useState<Snapshot>({ summary: { orders: 0, units: 0, revenue: 0 }, trend: [] })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const today = new Date()
    const from = new Date(today)
    from.setDate(from.getDate() - 6)
    fetch(`/api/warehouse-sales?from=${dateValue(from)}&to=${dateValue(today)}`)
      .then((response) => response.json())
      .then((result) => setData(result))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])
  const max = Math.max(1, ...data.trend.map((point) => point.revenue))
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Sales &amp; revenue</p><h2 className="mt-1 text-lg font-black text-slate-900">Last 7 days</h2><p className="mt-1 text-xs text-slate-500">Verified customer sales, separate from material requests.</p></div><Link href="/warehouse/sales" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:border-yellow-400">View analytics</Link></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{[['Revenue', money(data.summary.revenue), 'text-yellow-700 bg-yellow-50'], ['Orders', data.summary.orders, 'text-blue-700 bg-blue-50'], ['Units sold', data.summary.units, 'text-emerald-700 bg-emerald-50']].map(([label, value, style]) => <div key={String(label)} className={`rounded-xl p-3 ${style}`}><div className="text-[10px] font-black uppercase tracking-wide">{label}</div><div className="mt-1 text-xl font-black text-slate-900">{value}</div></div>)}</div>
      <div className="mt-5 flex h-24 items-end gap-1 border-b border-slate-100 px-1">{loading ? <div className="w-full text-center text-xs text-slate-400">Loading…</div> : data.trend.map((point) => <div key={point.date} title={`${point.date}: ${money(point.revenue)}`} className="group flex h-full flex-1 items-end"><div className="w-full rounded-t bg-blue-500 group-hover:bg-blue-600" style={{ height: `${Math.max(4, point.revenue / max * 100)}%` }} /></div>)}</div>
    </section>
  )
}
