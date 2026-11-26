'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type ReportData = {
  summary: Record<string, number>
  inventory: any[]
  lowStockItems: any[]
  requests: any[]
  releases: any[]
  movements: any[]
  receipts: any[]
}

const emptyData: ReportData = { summary: {}, inventory: [], lowStockItems: [], requests: [], releases: [], movements: [], receipts: [] }
const money = (value: unknown) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString() : '—'
const statusTone = (value?: string) => {
  const status = String(value || '').toUpperCase()
  if (['FULFILLED', 'COMPLETED', 'RELEASED'].includes(status)) return 'bg-emerald-100 text-emerald-700'
  if (['PENDING', 'UNDER_REVIEW', 'PARTIALLY_FULFILLED'].includes(status)) return 'bg-amber-100 text-amber-700'
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-600'
}

export default function WarehouseReports() {
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
      const params = new URLSearchParams({ department: 'WAREHOUSE' })
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const response = await fetch(`/api/department-reports?${params.toString()}`, { cache: 'no-store' })
      if (response.status === 401) { router.push('/warehouse/login'); return }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Unable to generate the warehouse report.')
      setData(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to generate the warehouse report.')
    } finally {
      setLoading(false)
    }
  }, [endDate, router, startDate])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    if (!data || !query.trim()) return data ? { ...emptyData, ...data, releases: data.releases || [] } : emptyData
    const term = query.trim().toLowerCase()
    const includes = (value: unknown) => String(value || '').toLowerCase().includes(term)
    return {
      ...data,
      inventory: data.inventory.filter(item => includes(item.name) || includes(item.sku) || includes(item.category)),
      lowStockItems: data.lowStockItems.filter(item => includes(item.name) || includes(item.sku)),
      requests: data.requests.filter(item => includes(item.reference) || includes(item.source) || includes(item.status) || includes(item.requester?.name)),
      releases: (data.releases || []).filter(item => includes(item.receiptNumber) || includes(item.request?.reference) || includes(item.releasedBy?.name)),
      movements: data.movements.filter(item => includes(item.inventoryItem?.name) || includes(item.worker?.name) || includes(item.type) || includes(item.reason)),
      receipts: data.receipts.filter(item => includes(item.reference) || includes(item.snapshot?.requestReference) || includes(item.snapshot?.warehouseWorker)),
    }
  }, [data, query])

  function exportCsv() {
    if (!data) return
    const rows: string[][] = [['Section', 'Reference / Material', 'Status / Type', 'Staff / Source', 'Quantity', 'Stock', 'Date']]
    data.inventory.forEach(item => rows.push(['Inventory', item.name, item.quantity <= item.reorderLevel ? 'LOW STOCK' : 'IN STOCK', item.sku || '', String(item.quantity), `${item.quantity} / reorder ${item.reorderLevel}`, dateLabel(item.updatedAt)]))
    data.requests.forEach(item => rows.push(['Request', item.reference, item.status, item.source, String(item.items?.reduce((sum: number, line: any) => sum + line.requestedQuantity, 0) || 0), '', dateLabel(item.createdAt)]))
    data.releases.forEach(item => rows.push(['Release', item.receiptNumber, 'RELEASED', item.releasedBy?.name || '', String(item.items?.reduce((sum: number, line: any) => sum + line.quantity, 0) || 0), '', dateLabel(item.createdAt)]))
    data.movements.forEach(item => rows.push(['Stock movement', item.inventoryItem?.name || '', item.type, item.worker?.name || '', String(item.quantity), `${item.stockBefore} → ${item.stockAfter}`, dateLabel(item.createdAt)]))
    data.receipts.forEach(item => rows.push(['Receipt', item.reference, 'RELEASED', item.snapshot?.warehouseWorker || '', '', '', dateLabel(item.createdAt)]))
    const csv = rows.map(row => row.map(cell => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `elettro-warehouse-report-${startDate || 'all'}-${endDate || 'time'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const summary = data?.summary || {}
  const cards = [
    ['Inventory items', summary.totalProducts || 0, `${summary.availableStockItems || 0} with stock`, 'from-emerald-400 to-teal-500'],
    ['Low stock', summary.lowStockCount || 0, 'Needs replenishment', 'from-amber-300 to-orange-500'],
    ['Requests', summary.totalRequests || 0, `${summary.technicianRequestsCount || 0} technician requests`, 'from-cyan-400 to-blue-500'],
    ['Released quantity', summary.totalReleasedQty || 0, `${summary.totalReceipts || 0} receipts`, 'from-violet-400 to-indigo-500'],
  ] as const

  return (
    <div className="warehouse-reports-page space-y-6">
      <style jsx global>{`@media print { @page { size: A4; margin: 14mm; } html, body { background: #fff !important; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body:has(.warehouse-reports-page) aside, body:has(.warehouse-reports-page) header, body:has(.warehouse-reports-page) footer { display: none !important; } body:has(.warehouse-reports-page) main { padding: 0 !important; } body:has(.warehouse-reports-page) main > div { margin-left: 0 !important; } .warehouse-reports-page { width: 100% !important; margin: 0 !important; } .reports-print-hidden { display: none !important; } .reports-print-card { break-inside: avoid; box-shadow: none !important; } .report-table { overflow: visible !important; } .report-table table { font-size: 9px !important; } .report-table th, .report-table td { padding: 7px 9px !important; } .report-table thead { display: table-header-group; } .report-table tr { break-inside: avoid; } } .report-table table { width: 100%; border-collapse: collapse; } .report-table th { background: #0f172a; color: #cbd5e1; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; padding: 12px 16px; white-space: nowrap; } .report-table td { border-top: 1px solid #eef2f7; color: #64748b; padding: 12px 16px; vertical-align: middle; }`}</style>

      <style jsx global>{`@media print { @page { size: A4 portrait; margin: 10mm; } html, body { background: #fff !important; } body { width: 210mm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body:has(.warehouse-reports-page) aside, body:has(.warehouse-reports-page) header, body:has(.warehouse-reports-page) footer, body:has(.warehouse-reports-page) .reports-print-hidden { display: none !important; } body:has(.warehouse-reports-page) main { padding: 0 !important; } body:has(.warehouse-reports-page) main > div { margin-left: 0 !important; } .warehouse-reports-page { display: block !important; width: 190mm !important; max-width: 190mm !important; margin: 0 !important; font-size: 9px !important; } .warehouse-reports-page > * { margin-bottom: 7mm !important; } .warehouse-reports-page .relative.overflow-hidden { padding: 8mm !important; } .warehouse-reports-page h1 { font-size: 22px !important; } .reports-summary-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 3mm !important; } .reports-summary-grid .reports-print-card { padding: 4mm !important; } .warehouse-reports-page > .grid:not(.reports-summary-grid) { display: block !important; } .warehouse-reports-page > .grid:not(.reports-summary-grid) > .reports-print-card { margin-bottom: 7mm !important; } .reports-print-card { break-inside: avoid; box-shadow: none !important; } .report-table { overflow: visible !important; } .report-table table { width: 100% !important; table-layout: fixed !important; font-size: 8px !important; } .report-table th, .report-table td { padding: 3px 5px !important; line-height: 1.25 !important; overflow-wrap: anywhere !important; } .report-table th { white-space: normal !important; } .report-table thead { display: table-header-group; } .report-table tr { break-inside: avoid; } }`}</style>

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#122b35] to-[#08727f] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">Warehouse reporting</div><h1 className="text-3xl font-black tracking-tight">Warehouse Reports</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Print or export the complete warehouse record: inventory, low stock, requests, releases, receipts, and stock movement history.</p></div>
          <div className="reports-print-hidden flex flex-wrap gap-3"><button type="button" onClick={() => window.print()} className="rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-900 hover:bg-cyan-50">Print / Save PDF</button><button type="button" onClick={exportCsv} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-black text-white hover:bg-white/20">Export CSV</button></div>
        </div>
      </section>

      <section className="reports-print-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Report controls</p><h2 className="mt-1 text-lg font-black text-slate-950">Choose a reporting period</h2><p className="mt-1 text-xs text-slate-500">Leave dates blank to include the complete warehouse history.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-xs font-bold text-slate-600">From<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500" /></label><label className="text-xs font-bold text-slate-600">To<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500" /></label><button type="button" onClick={() => void load()} className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-cyan-800">Generate report</button></div></div><div className="mt-4 border-t border-slate-100 pt-4"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter materials, references, staff, statuses…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:bg-white" /></div></section>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {loading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}</div>}

      {!loading && data && <>
        <div className="reports-summary-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, note, accent]) => <div key={label} className="reports-print-card relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} /><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-medium text-slate-500">{note}</p></div>)}</div>

        <ReportTable title="Inventory stock report" eyebrow="Current warehouse stock" count={filtered.inventory.length}><table><thead><tr><th>Material</th><th>SKU</th><th>Category</th><th>Stock</th><th>Reorder level</th><th>Stock value</th></tr></thead><tbody>{filtered.inventory.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.name}</td><td>{item.sku || '—'}</td><td>{item.category || 'General'}</td><td className={item.quantity <= item.reorderLevel ? 'font-black text-red-600' : 'font-black text-emerald-700'}>{item.quantity} {item.unit || 'units'}</td><td>{item.reorderLevel}</td><td className="font-black text-slate-900">{money(item.quantity * Number(item.buyPrice || 0))}</td></tr>)}</tbody></table></ReportTable>
        <div className="grid gap-6 xl:grid-cols-2"><ReportTable title="Low-stock report" eyebrow="Replenishment monitoring" count={filtered.lowStockItems.length}><table><thead><tr><th>Material</th><th>Current stock</th><th>Reorder level</th><th>Unit</th></tr></thead><tbody>{filtered.lowStockItems.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.name}</td><td className="font-black text-red-600">{item.quantity}</td><td>{item.reorderLevel}</td><td>{item.unit || 'units'}</td></tr>)}</tbody></table></ReportTable><ReportTable title="Requests report" eyebrow="Incoming material requests" count={filtered.requests.length}><table><thead><tr><th>Reference</th><th>Source</th><th>Status</th><th>Requester</th><th>Date</th></tr></thead><tbody>{filtered.requests.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.reference}</td><td>{item.source}</td><td><Status value={item.status} /></td><td>{item.requester?.name || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable></div>
        <div className="grid gap-6 xl:grid-cols-2"><ReportTable title="Release report" eyebrow="Materials handed over" count={filtered.releases.length}><table><thead><tr><th>Receipt</th><th>Request</th><th>Quantity</th><th>Released by</th><th>Date</th></tr></thead><tbody>{filtered.releases.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.receiptNumber}</td><td>{item.request?.reference || '—'}</td><td className="font-black text-emerald-700">{item.items?.reduce((sum: number, line: any) => sum + line.quantity, 0) || 0}</td><td>{item.releasedBy?.name || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable><ReportTable title="Receipt report" eyebrow="Printable release records" count={filtered.receipts.length}><table><thead><tr><th>Receipt reference</th><th>Request</th><th>Warehouse staff</th><th>Date</th></tr></thead><tbody>{filtered.receipts.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.reference}</td><td>{item.snapshot?.requestReference || '—'}</td><td>{item.snapshot?.warehouseWorker || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable></div>
        <ReportTable title="Stock movement audit" eyebrow="Receipts, releases, and adjustments" count={filtered.movements.length}><table><thead><tr><th>Material</th><th>Movement</th><th>Change</th><th>Stock before → after</th><th>Worker</th><th>Date</th></tr></thead><tbody>{filtered.movements.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.inventoryItem?.name || '—'}</td><td><Status value={item.type} /><span className="mt-1 block max-w-[220px] text-[10px]">{item.reason || '—'}</span></td><td className={`font-black ${item.quantity < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{item.quantity > 0 ? '+' : ''}{item.quantity}</td><td>{item.stockBefore} → {item.stockAfter}</td><td>{item.worker?.name || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable>
      </>}
    </div>
  )
}

function Status({ value }: { value?: string }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${statusTone(value)}`}>{String(value || '—').replaceAll('_', ' ')}</span>
}

function ReportTable({ title, eyebrow, count, children }: { title: string; eyebrow: string; count: number; children: React.ReactNode }) {
  return <section className="reports-print-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-end justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">{eyebrow}</p><h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{count} records</span></div><div className="report-table overflow-x-auto">{children}</div></section>
}
