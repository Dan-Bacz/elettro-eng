'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Period = 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
type SalesData = {
  summary: { orders: number; units: number; revenue: number }
  trend: { date: string; orders: number; units: number; revenue: number }[]
  categories: { category: string; units: number; revenue: number }[]
  recentOrders: { id: string; reference: string; customer: string; amount: number; status: string; paymentStatus: string; createdAt: string; itemCount: number }[]
}

const money = (value: number) => `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function daysAgo(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return dateValue(date)
}

export default function WarehouseSalesOverview() {
  const [period, setPeriod] = useState<Period>('MONTH')
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(dateValue(new Date()))
  const [metric, setMetric] = useState<'revenue' | 'units'>('revenue')
  const [data, setData] = useState<SalesData>({ summary: { orders: 0, units: 0, revenue: 0 }, trend: [], categories: [], recentOrders: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/warehouse-sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not load sales analytics')
      setData(result)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load sales analytics')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { void load() }, [load])

  function changePeriod(value: Period) {
    setPeriod(value)
    if (value === 'DAY') { const today = dateValue(new Date()); setFrom(today); setTo(today) }
    if (value === 'WEEK') { setFrom(daysAgo(6)); setTo(dateValue(new Date())) }
    if (value === 'MONTH') { setFrom(daysAgo(29)); setTo(dateValue(new Date())) }
  }

  const maxValue = useMemo(() => Math.max(1, ...data.trend.map((point) => metric === 'revenue' ? point.revenue : point.units)), [data.trend, metric])
  const topCategory = data.categories[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-600">Sales &amp; revenue</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Warehouse sales overview</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Track customer order volume, revenue, and demand by product period using verified order records.</p>
        </div>
        <Link href="/warehouse/inventory" className="rounded-xl bg-yellow-400 px-4 py-2.5 text-center text-xs font-black text-slate-900 shadow-sm transition hover:bg-yellow-300">View inventory</Link>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">Period
          <select value={period} onChange={(e) => changePeriod(e.target.value as Period)} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
            <option value="DAY">Today</option><option value="WEEK">Last 7 days</option><option value="MONTH">Last 30 days</option><option value="CUSTOM">Custom range</option>
          </select>
        </label>
        <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">From<input type="date" value={from} onChange={(e) => { setPeriod('CUSTOM'); setFrom(e.target.value) }} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700" /></label>
        <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">To<input type="date" value={to} onChange={(e) => { setPeriod('CUSTOM'); setTo(e.target.value) }} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700" /></label>
        <div className="ml-auto flex rounded-xl bg-slate-100 p-1">
          <button onClick={() => setMetric('revenue')} className={`rounded-lg px-3 py-2 text-xs font-black ${metric === 'revenue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Revenue</button>
          <button onClick={() => setMetric('units')} className={`rounded-lg px-3 py-2 text-xs font-black ${metric === 'units' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Units sold</button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[['Total sales', money(data.summary.revenue), 'Value of qualifying customer orders', 'text-yellow-700 bg-yellow-50'], ['Sales orders', data.summary.orders, 'Approved through completed orders', 'text-blue-700 bg-blue-50'], ['Units sold', data.summary.units, 'Product units in those orders', 'text-emerald-700 bg-emerald-50']].map(([label, value, note, style]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${style}`}>{label}</div>
            <div className="mt-4 text-3xl font-black text-slate-900">{value}</div>
            <p className="mt-1 text-xs text-slate-500">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black text-slate-900">Sales trend</h2><p className="mt-1 text-xs text-slate-500">{metric === 'revenue' ? 'Revenue' : 'Units sold'} by order date</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{from} → {to}</span></div>
          <div className="mt-6 flex h-56 items-end gap-1 border-b border-l border-slate-200 px-2 pb-0 pt-4 sm:gap-2">
            {loading ? <div className="flex w-full items-center justify-center text-xs text-slate-400">Loading trend…</div> : data.trend.length === 0 ? <div className="flex w-full items-center justify-center text-xs text-slate-400">No customer sales in this period.</div> : data.trend.map((point) => { const value = metric === 'revenue' ? point.revenue : point.units; return <div key={point.date} title={`${point.date}: ${metric === 'revenue' ? money(value) : `${value} units`}`} className="group flex h-full flex-1 items-end"><div className="w-full rounded-t-md bg-yellow-400 transition-all group-hover:bg-yellow-500" style={{ height: `${Math.max(3, (value / maxValue) * 100)}%` }} /></div> })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400"><span>{data.trend[0]?.date || from}</span><span>{data.trend[data.trend.length - 1]?.date || to}</span></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-base font-black text-slate-900">Top categories</h2><p className="mt-1 text-xs text-slate-500">Ranked by revenue</p></div>{topCategory && <span className="text-xs font-black text-yellow-700">{money(topCategory.revenue)}</span>}</div><div className="mt-5 space-y-4">{data.categories.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">No category sales yet.</div> : data.categories.slice(0, 5).map((category, index) => { const max = data.categories[0].revenue || 1; return <div key={category.category}><div className="flex justify-between text-xs"><span className="font-bold text-slate-700">{index + 1}. {category.category}</span><span className="font-black text-slate-900">{money(category.revenue)}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.max(4, category.revenue / max * 100)}%` }} /></div></div> })}</div></section>
      </div>

      <section id="recent-sales" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-base font-black text-slate-900">Recent sales</h2><p className="mt-1 text-xs text-slate-500">Newest qualifying orders in the selected period</p></div><a href="#recent-sales" className="text-xs font-black text-yellow-700 hover:underline">Refresh this list →</a></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-3 py-3">Order</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3 text-center">Items</th><th className="px-3 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recentOrders.map((order) => <tr key={order.id} className="hover:bg-yellow-50/30"><td className="px-5 py-3 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td><td className="px-3 py-3 font-mono font-bold text-slate-800">{order.reference}</td><td className="px-3 py-3 font-semibold text-slate-700">{order.customer}</td><td className="px-3 py-3 text-center text-slate-500">{order.itemCount}</td><td className="px-3 py-3 text-right font-black text-slate-900">{money(order.amount)}</td><td className="px-5 py-3 text-right"><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">{order.status.replace(/_/g, ' ')}</span></td></tr>)}{!loading && data.recentOrders.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-xs text-slate-400">No qualifying sales found for this period.</td></tr>}</tbody></table></div></section>
    </div>
  )
}
