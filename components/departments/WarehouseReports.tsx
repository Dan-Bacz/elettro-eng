'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DepartmentReportPrint, { DepartmentReportStyles, type ReportPeriod, type ReportPreparer } from '../sales/DepartmentReportPrint'

const printReports = {
  all: { label: 'All Reports', title: 'Warehouse Department Report' },
  inventory: { label: 'Inventory Stock Report', title: 'Warehouse Inventory Stock Report' },
  lowStock: { label: 'Low Stock Report', title: 'Warehouse Low Stock Report' },
  movements: { label: 'Stock Movement Report', title: 'Warehouse Stock Movement Report' },
  requests: { label: 'Materials Requests Report', title: 'Warehouse Materials Requests Report' },
  releases: { label: 'Materials Release Report', title: 'Warehouse Materials Release Report' },
  receipts: { label: 'Receipt Report', title: 'Warehouse Receipt Report' },
} as const

type PrintReport = keyof typeof printReports

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
  const [data, setData] = useState<(ReportData & { preparedBy: ReportPreparer; period: ReportPeriod }) | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [query, setQuery] = useState('')
  const [printReport, setPrintReport] = useState<PrintReport>('all')
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
      setData({ ...payload, period: { startDate, endDate } })
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

  const showsReport = (section: Exclude<PrintReport, 'all'>) => printReport === 'all' || printReport === section
  const summary = data?.summary || {}
  const indicators = [
    ['Inventory items', summary.totalProducts || 0, `${summary.availableStockItems || 0} with stock`],
    ['Low stock', summary.lowStockCount || 0, 'Needs replenishment'],
    ['Requests', summary.totalRequests || 0, `${summary.technicianRequestsCount || 0} technician requests`],
    ['Released quantity', summary.totalReleasedQty || 0, `${summary.totalReceipts || 0} receipts`],
  ] as const

  return (
    <div className="department-report-page space-y-6">
      <DepartmentReportStyles />

      <section className="reports-print-hidden relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#122b35] to-[#08727f] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">Warehouse reporting</div><h1 className="text-3xl font-black tracking-tight">Warehouse Reports</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Print or export the complete warehouse record: inventory, low stock, requests, releases, receipts, and stock movement history.</p></div>
          <div className="reports-print-hidden flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold text-white">
              Report type
              <select
                value={printReport}
                onChange={(event) => setPrintReport(event.target.value as PrintReport)}
                className="mt-1 block rounded-xl border border-white/20 bg-slate-900 px-3 py-2.5 text-sm text-white"
              >
                {Object.entries(printReports).map(([value, report]) => (
                  <option key={value} value={value}>{report.label}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => window.print()} disabled={loading || !data || Boolean(error)} className="rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-900 hover:bg-cyan-50 disabled:opacity-50">
              Print / Save PDF
            </button>
            <button type="button" onClick={exportCsv} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-black text-white hover:bg-white/20">
              Export CSV
            </button>
          </div>
        </div>
        {data && !loading && !error && (
          <dl className="relative mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-white/20 pt-5 lg:grid-cols-4">
            {indicators.map(([label, value, note]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-semibold text-cyan-100">{label}</dt>
                <dd className="mt-1 break-words text-2xl font-black tabular-nums text-white">{value.toLocaleString()}</dd>
                <dd className="mt-0.5 text-xs text-slate-200">{note}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="reports-print-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Report controls</p><h2 className="mt-1 text-lg font-black text-slate-950">Choose a reporting period</h2><p className="mt-1 text-xs text-slate-500">Leave dates blank to include the complete warehouse history.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-xs font-bold text-slate-600">From<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500" /></label><label className="text-xs font-bold text-slate-600">To<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500" /></label><button type="button" onClick={() => void load()} className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-cyan-800">Generate report</button></div></div><div className="mt-4 border-t border-slate-100 pt-4"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter materials, references, staff, statuses…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:bg-white" /></div></section>

      {error && <div role="alert" className="reports-print-hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {loading && <p role="status" className="reports-print-hidden px-4 py-5 text-sm text-slate-600">Loading warehouse report...</p>}

      {!loading && data && <>
        {!error && (
          <DepartmentReportPrint
            title={printReports[printReport].title}
            officerLabel={data.preparedBy.role === 'WAREHOUSE' ? 'Warehouse Department Officer' : 'Prepared by'}
            preparedBy={data.preparedBy}
            period={data.period}
            filterNote={query.trim() ? (
              printReport === 'all'
                ? `Search filter: "${query.trim()}". Summary covers the full report.`
                : `Search filter: "${query.trim()}".`
            ) : undefined}
          />
        )}
        {printReport === 'all' && !error && (
          <div className="department-print-summary [--report-summary-columns:4] hidden print:grid">
            {indicators.map(([label, value, note]) => (
              <div key={label} className="reports-print-card">
                <p className="text-xs font-bold">{label}</p>
                <p className="font-black tabular-nums">{value.toLocaleString()}</p>
                <p className="text-xs">{note}</p>
              </div>
            ))}
          </div>
        )}

        <ReportTable visible={showsReport('inventory')} title="Inventory stock report" eyebrow="Current warehouse stock" count={filtered.inventory.length}><table><thead><tr><th>Material</th><th>SKU</th><th>Category</th><th>Stock</th><th>Reorder level</th><th>Stock value</th></tr></thead><tbody>{filtered.inventory.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.name}</td><td>{item.sku || '—'}</td><td>{item.category || 'General'}</td><td className={item.quantity <= item.reorderLevel ? 'font-black text-red-600' : 'font-black text-emerald-700'}>{item.quantity} {item.unit || 'units'}</td><td>{item.reorderLevel}</td><td className="font-black text-slate-900">{money(item.quantity * Number(item.buyPrice || 0))}</td></tr>)}</tbody></table></ReportTable>
        {(showsReport('lowStock') || showsReport('requests')) && (
          <div className={`department-print-table-group grid gap-6 ${printReport === 'all' ? 'xl:grid-cols-2' : ''}`}>
            <ReportTable visible={showsReport('lowStock')} title="Low-stock report" eyebrow="Replenishment monitoring" count={filtered.lowStockItems.length}><table><thead><tr><th>Material</th><th>Current stock</th><th>Reorder level</th><th>Unit</th></tr></thead><tbody>{filtered.lowStockItems.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.name}</td><td className="font-black text-red-600">{item.quantity}</td><td>{item.reorderLevel}</td><td>{item.unit || 'units'}</td></tr>)}</tbody></table></ReportTable>
            <ReportTable visible={showsReport('requests')} title="Requests report" eyebrow="Incoming material requests" count={filtered.requests.length}><table><thead><tr><th>Reference</th><th>Source</th><th>Status</th><th>Requester</th><th>Date</th></tr></thead><tbody>{filtered.requests.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.reference}</td><td>{item.source}</td><td><Status value={item.status} /></td><td>{item.requester?.name || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable>
          </div>
        )}
        {(showsReport('releases') || showsReport('receipts')) && (
          <div className={`department-print-table-group grid gap-6 ${printReport === 'all' ? 'xl:grid-cols-2' : ''}`}>
            <ReportTable visible={showsReport('releases')} title="Release report" eyebrow="Materials handed over" count={filtered.releases.length}><table><thead><tr><th>Receipt</th><th>Request</th><th>Quantity</th><th>Released by</th><th>Date</th></tr></thead><tbody>{filtered.releases.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.receiptNumber}</td><td>{item.request?.reference || '—'}</td><td className="font-black text-emerald-700">{item.items?.reduce((sum: number, line: any) => sum + line.quantity, 0) || 0}</td><td>{item.releasedBy?.name || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable>
            <ReportTable visible={showsReport('receipts')} title="Receipt report" eyebrow="Printable release records" count={filtered.receipts.length}><table><thead><tr><th>Receipt reference</th><th>Request</th><th>Warehouse staff</th><th>Date</th></tr></thead><tbody>{filtered.receipts.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.reference}</td><td>{item.snapshot?.requestReference || '—'}</td><td>{item.snapshot?.warehouseWorker || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable>
          </div>
        )}
        <ReportTable visible={showsReport('movements')} title="Stock movement audit" eyebrow="Receipts, releases, and adjustments" count={filtered.movements.length}><table><thead><tr><th>Material</th><th>Movement</th><th>Change</th><th>Stock before → after</th><th>Worker</th><th>Date</th></tr></thead><tbody>{filtered.movements.map(item => <tr key={item.id}><td className="font-black text-slate-900">{item.inventoryItem?.name || '—'}</td><td><Status value={item.type} /><span className="mt-1 block max-w-[220px] text-[10px]">{item.reason || '—'}</span></td><td className={`font-black ${item.quantity < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{item.quantity > 0 ? '+' : ''}{item.quantity}</td><td>{item.stockBefore} → {item.stockAfter}</td><td>{item.worker?.name || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable>
      </>}
    </div>
  )
}

function Status({ value }: { value?: string }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${statusTone(value)}`}>{String(value || '—').replaceAll('_', ' ')}</span>
}

function ReportTable({ visible, title, eyebrow, count, children }: { visible: boolean; title: string; eyebrow: string; count: number; children: React.ReactNode }) {
  if (!visible) return null
  return <section className="reports-print-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="department-print-table-heading flex items-end justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">{eyebrow}</p><h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{count} records</span></div><div className="report-table overflow-x-auto">{children}</div></section>
}
