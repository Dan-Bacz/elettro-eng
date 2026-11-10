'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DocumentIcon, SearchIcon } from '../admin/icons'

type Sale = {
  id: string
  reference: string
  customerName: string | null
  customerContact: string | null
  total: number
  paymentAmount: number
  changeAmount: number
  createdAt: string
  createdBy?: { name: string } | null
  items: { id: string; name: string; quantity: number; unit: string | null; unitPrice: number }[]
}

const money = (value: number) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function SalesReceipts() {
  const [sales, setSales] = useState<Sale[]>([])
  const [preset, setPreset] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ preset })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const response = await fetch(`/api/sales-sales?${params}`)
      if (!response.ok) throw new Error('Could not load sales receipts.')
      setSales((await response.json()).sales || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sales receipts.')
    } finally {
      setLoading(false)
    }
  }, [from, preset, to])

  useEffect(() => { void load() }, [load])

  const visibleSales = useMemo(() => sales.filter((sale) => {
    const value = `${sale.reference} ${sale.customerName || ''} ${sale.items.map((item) => item.name).join(' ')}`.toLowerCase()
    return value.includes(query.trim().toLowerCase())
  }), [query, sales])
  const total = visibleSales.reduce((sum, sale) => sum + Number(sale.total), 0)

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-700">Point of sale history</p><h1 className="mt-1 text-2xl font-black text-slate-900">Sales receipts</h1><p className="mt-1 text-sm text-slate-500">Every completed counter sale is recorded here automatically.</p></div>
      <Link href="/sales/pos" className="rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-slate-900 shadow-sm hover:bg-yellow-300">＋ New counter sale</Link>
    </div>
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
      <div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search receipt, customer, or product" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-bold outline-none focus:border-yellow-400 focus:bg-white" /></div>
      <select value={preset} onChange={(event) => setPreset(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-600 outline-none"><option value="all">All dates</option><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option></select>
      <div className="flex items-center gap-2"><input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPreset('all') }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600" /><span className="text-xs text-slate-400">to</span><input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPreset('all') }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600" /></div>
      <div className="rounded-xl bg-slate-900 px-4 py-2.5 text-right"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Filtered sales</div><div className="text-sm font-black text-yellow-400">{money(total)}</div></div>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[1fr_auto] border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400"><span>{visibleSales.length} receipts</span><span>Newest first</span></div>
      {loading ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div> : visibleSales.length === 0 ? <div className="p-14 text-center"><DocumentIcon className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">No sales receipts found</p><p className="mt-1 text-xs text-slate-400">Completed counter sales will appear here.</p></div> : <div className="divide-y divide-slate-100">{visibleSales.map((sale) => <article key={sale.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700"><DocumentIcon className="h-5 w-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-mono text-xs font-black text-slate-900">{sale.reference}</h2><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">Paid</span></div><p className="mt-1 truncate text-xs text-slate-500">{sale.items.map((item) => `${item.quantity}× ${item.name}`).join(' · ')}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{sale.customerName || 'Walk-in customer'} · {new Date(sale.createdAt).toLocaleString()}</p></div></div><div className="flex items-center justify-between gap-6 sm:justify-end"><div className="text-right"><div className="text-[9px] font-black uppercase text-slate-400">Total</div><div className="text-base font-black text-slate-900">{money(Number(sale.total))}</div></div><button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-white">Print</button></div></article>)}</div>}
    </div>
  </div>
}
