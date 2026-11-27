'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type SalesReport = {
  id: string
  reference: string
  customerName?: string | null
  total: number
  paymentAmount: number
  createdAt: string
  createdBy?: { name: string } | null
  items: Array<{ name: string; quantity: number; unitPrice: number }>
}

type SuccessfulOrder = {
  id: string
  clientName: string
  total: number
  createdAt: string
  status: string
  deliveryStatus: string
  items: Array<{ name: string; quantity: number }>
}

type ReportData = {
  preparedBy: { name: string; role: string }
  period: { startDate: string; endDate: string }
  summary: {
    totalIncome: number
    grossSalesIncome: number
    successfulOrderIncome: number
    completedSalesCount: number
    successfulOrdersCount: number
    reportGrossSalesIncome: number
    reportCompletedSalesCount: number
  }
  sales: SalesReport[]
  successfulOrders: SuccessfulOrder[]
}

const money = (value: unknown) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateLabel = (value?: string) => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const periodDate = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'UTC' })

function reportingPeriod({ startDate, endDate }: ReportData['period']) {
  if (startDate && endDate) return `${periodDate.format(new Date(startDate))} ? ${periodDate.format(new Date(endDate))}`
  if (startDate) return `From ${periodDate.format(new Date(startDate))}`
  if (endDate) return `Through ${periodDate.format(new Date(endDate))}`
  return 'All dates'
}

export default function SalesReports() {
  const router = useRouter()
  const [data, setData] = useState<ReportData | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ department: 'SALES' })
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const response = await fetch(`/api/department-reports?${params.toString()}`, { cache: 'no-store' })
      if (response.status === 401) { router.push('/sales/login'); return }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Unable to generate the sales report.')
      setData({ ...payload, period: { startDate, endDate } })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to generate the sales report.')
    } finally {
      setLoading(false)
    }
  }, [endDate, router, startDate])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    if (!data || !query.trim()) return data
    const term = query.trim().toLowerCase()
    const includes = (value: unknown) => String(value || '').toLowerCase().includes(term)
    return {
      ...data,
      sales: data.sales.filter(sale => includes(sale.reference) || includes(sale.customerName) || sale.items.some(item => includes(item.name))),
      successfulOrders: data.successfulOrders.filter(order => includes(order.id) || includes(order.clientName) || order.items.some(item => includes(item.name))),
    }
  }, [data, query])

  function exportCsv() {
    if (!data) return
    const rows: string[][] = [['Type', 'Reference', 'Customer', 'Items', 'Status', 'Amount', 'Date']]
    data.sales.forEach(sale => rows.push(['POS sale', sale.reference, sale.customerName || 'Walk-in customer', sale.items.map(item => `${item.quantity} × ${item.name}`).join(' · '), 'COMPLETED', String(sale.total), dateLabel(sale.createdAt)]))
    data.successfulOrders.forEach(order => rows.push(['Client order', `ORD-${order.id.slice(0, 8).toUpperCase()}`, order.clientName, order.items.map(item => `${item.quantity} × ${item.name}`).join(' · '), 'SUCCESSFUL', String(order.total), dateLabel(order.createdAt)]))
    const csv = rows.map(row => row.map(cell => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `elettro-sales-report-${startDate || 'all'}-${endDate || 'time'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const summary = data?.summary
  const cards = [
    ['Total income', money(summary?.totalIncome), 'POS gross + successful client orders', 'from-yellow-400 to-orange-500'],
    ['POS gross income', money(summary?.reportGrossSalesIncome), `${summary?.reportCompletedSalesCount || 0} completed transactions`, 'from-cyan-400 to-blue-500'],
    ['Successful orders', summary?.successfulOrdersCount || 0, `${money(summary?.successfulOrderIncome)} order income`, 'from-emerald-400 to-teal-500'],
  ] as const

  return (
    <div className="sales-reports-page space-y-6">
      <style jsx global>{`
        .sales-print-header { display: none; }
        .sales-reports-page .report-table table { width: 100%; border-collapse: collapse; }
        .sales-reports-page .report-table th { background: #0f172a; color: #cbd5e1; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; padding: 12px 16px; text-align: left; white-space: nowrap; }
        .sales-reports-page .report-table td { border-top: 1px solid #eef2f7; color: #64748b; padding: 12px 16px; vertical-align: middle; }

        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          html:has(.sales-reports-page),
          body:has(.sales-reports-page) { height: auto !important; overflow: visible !important; }
          body:has(.sales-reports-page),
          div:has(> div > main > .sales-reports-page) { background: white !important; min-height: 0 !important; }
          div:has(> div > main > .sales-reports-page) > aside,
          div:has(> main > .sales-reports-page) > :is(header, footer),
          .sales-reports-page .reports-print-hidden,
          .sales-reports-page :is(img, svg):not(.sales-print-logo) { display: none !important; }
          div:has(> main > .sales-reports-page) { display: block !important; margin: 0 !important; min-height: 0 !important; }
          main:has(> .sales-reports-page) { padding: 0 !important; }
          .sales-reports-page { color: #111; font: 10pt/1.4 Arial, sans-serif; }
          .sales-reports-page > * + * { margin-top: 6mm !important; }

          .sales-print-header { display: block; margin-top: 0 !important; break-inside: avoid; }
          .sales-print-brand { display: flex; align-items: center; gap: 4mm; border-bottom: 1.5pt solid #222; padding-bottom: 3mm; }
          .sales-print-logo { width: 15mm; height: 15mm; object-fit: contain; }
          .sales-print-company { font-size: 14pt; font-weight: 700; }
          .sales-print-title { margin: 5mm 0 2mm; font-size: 20pt; line-height: 1.15; font-weight: 700; }
          .sales-print-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 5mm; }
          .sales-print-meta dt { font-size: 8pt; font-weight: 700; }
          .sales-print-meta dd { margin: 0; overflow-wrap: anywhere; }
          .sales-print-filter { margin-top: 2mm; overflow-wrap: anywhere; }

          .sales-print-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; border-block: 1px solid #555; break-inside: avoid; }
          .sales-reports-page .reports-print-card { overflow: visible; border: 0; border-radius: 0; box-shadow: none; background: white; }
          .sales-print-summary .reports-print-card { padding: 3mm; }
          .sales-print-summary .reports-print-card + .reports-print-card { border-left: 1px solid #aaa; }
          .sales-print-summary .reports-print-card > div { display: none; }
          .sales-print-summary p { color: #111; letter-spacing: normal; }
          .sales-print-summary p:nth-of-type(2) { margin-top: 1mm; font-size: 13pt; line-height: 1.25; overflow-wrap: anywhere; }

          .sales-print-table-heading { padding: 0 0 2mm; border: 0; break-after: avoid; }
          .sales-print-table-heading :is(h2, p, span) { color: #111; }
          .sales-print-table-heading h2 { font-size: 12pt; font-weight: 700; }
          .sales-print-table-heading > span { background: none; padding: 0; font-size: 8pt; }
          .sales-reports-page .report-table { overflow: visible; }
          .sales-reports-page .report-table table { table-layout: fixed; font-size: 8.5pt; }
          .sales-reports-page .report-table thead { display: table-header-group; }
          .sales-reports-page .report-table tr { break-inside: avoid; }
          .sales-reports-page .report-table :is(th, td) { padding: 2mm 1.5mm; color: #111; white-space: normal; overflow-wrap: anywhere; }
          .sales-reports-page .report-table th { background: none; font-size: 8pt; letter-spacing: normal; border-block: 1px solid #555; }
          .sales-reports-page .report-table td { border-bottom: 1px solid #bbb; }
          .sales-reports-page .report-table th:nth-child(3) { width: 26%; }
          .sales-reports-page .report-table :is(th, td):nth-child(4) { text-align: right; }
          .sales-reports-page .report-table td span { color: inherit; background: none; padding: 0; }
        }
      `}</style>

      <section className="reports-print-hidden relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#122b35] to-[#08727f] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">Sales reporting</div><h1 className="text-3xl font-black tracking-tight">Sales Reports</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Review POS transactions and successful client orders, then print or export the selected period.</p></div>
          <div className="reports-print-hidden flex flex-wrap gap-3"><button type="button" onClick={() => window.print()} disabled={loading || !data || Boolean(error)} className="rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-900 hover:bg-cyan-50 disabled:opacity-50">Print / Save PDF</button><button type="button" onClick={exportCsv} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-black text-white hover:bg-white/20">Export CSV</button></div>
        </div>
      </section>

      <section className="reports-print-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Report controls</p><h2 className="mt-1 text-lg font-black text-slate-950">Choose a reporting period</h2><p className="mt-1 text-xs text-slate-500">Set dates to filter both POS sales and successful client orders.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-xs font-bold text-slate-600">From<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500" /></label><label className="text-xs font-bold text-slate-600">To<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500" /></label><button type="button" onClick={() => void load()} className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-cyan-800">Generate report</button></div></div><div className="mt-4 border-t border-slate-100 pt-4"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter references, customers, or products…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:bg-white" /></div></section>

      {error && <div role="alert" className="reports-print-hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {loading && <div className="reports-print-hidden grid gap-4 sm:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}</div>}

      {!loading && data && filtered && <>
        {!error && <header className="sales-print-header">
          <div className="sales-print-brand">
            <Image className="sales-print-logo" src="/logo-elettro.jpg" alt="" width={64} height={64} loading="eager" unoptimized />
            <p className="sales-print-company">ELETTRO Engineering Enterprises</p>
          </div>
          <h1 className="sales-print-title">Sales Department Report</h1>
          <dl className="sales-print-meta">
            <div>
              <dt>{data.preparedBy.role === 'SALES' ? 'Sales Department Officer' : 'Prepared by'}</dt>
              <dd>{data.preparedBy.name}</dd>
            </div>
            <div>
              <dt>Reporting period</dt>
              <dd>{reportingPeriod(data.period)}</dd>
            </div>
          </dl>
          {query.trim() && <p className="sales-print-filter">Transaction filter ?{query.trim()}? ? Summary covers the full reporting period.</p>}
        </header>}
        <div className="sales-print-summary grid gap-4 sm:grid-cols-3">{cards.map(([label, value, note, accent]) => <div key={label} className="reports-print-card relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} /><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-medium text-slate-500">{note}</p></div>)}</div>

        <ReportTable title="POS sales transactions" eyebrow="Completed counter sales" count={filtered.sales.length}><table><thead><tr><th>Reference</th><th>Customer</th><th>Items</th><th>Gross amount</th><th>Recorded by</th><th>Date</th></tr></thead><tbody>{filtered.sales.map(sale => <tr key={sale.id}><td className="font-black text-slate-900">{sale.reference}</td><td>{sale.customerName || 'Walk-in customer'}</td><td>{sale.items.map(item => `${item.quantity} × ${item.name}`).join(' · ')}</td><td className="font-black text-emerald-700">{money(sale.total)}</td><td>{sale.createdBy?.name || 'Sales staff'}</td><td>{dateLabel(sale.createdAt)}</td></tr>)}</tbody></table></ReportTable>
        <ReportTable title="Successful client orders" eyebrow="Orders completed and received" count={filtered.successfulOrders.length}><table><thead><tr><th>Reference</th><th>Client</th><th>Items</th><th>Gross amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{filtered.successfulOrders.map(order => <tr key={order.id}><td className="font-black text-slate-900">ORD-{order.id.slice(0, 8).toUpperCase()}</td><td>{order.clientName}</td><td>{order.items.map(item => `${item.quantity} × ${item.name}`).join(' · ')}</td><td className="font-black text-emerald-700">{money(order.total)}</td><td><span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Successful</span></td><td>{dateLabel(order.createdAt)}</td></tr>)}</tbody></table></ReportTable>
      </>}
    </div>
  )
}

function ReportTable({ title, eyebrow, count, children }: { title: string; eyebrow: string; count: number; children: React.ReactNode }) {
  return <section className="reports-print-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="sales-print-table-heading flex items-end justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">{eyebrow}</p><h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{count} records</span></div><div className="report-table overflow-x-auto">{children}</div></section>
}
