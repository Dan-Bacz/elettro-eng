'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DepartmentReportPrint, { DepartmentReportStyles, type ReportPeriod, type ReportPreparer } from '../../../../components/sales/DepartmentReportPrint'

type AdminReportData = {
  summary: Record<string, number>
  users: any[]
  bookings: any[]
  projects: any[]
  technicianReports: any[]
  activities: any[]
  materialUsages: any[]
  inventory: any[]
  lowStockItems: any[]
  orders: any[]
  sales: any[]
  requests: any[]
  releases: any[]
  movements: any[]
}

const money = (value: number) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString() : '—'
const statusTone = (value?: string) => {
  const status = String(value || '').toUpperCase()
  if (['COMPLETED', 'DELIVERED', 'FULFILLED', 'ACTIVE', 'APPROVED'].includes(status)) return 'bg-emerald-100 text-emerald-700'
  if (['PENDING', 'UNDER_REVIEW', 'IN_PROGRESS', 'PROCESSING', 'ASSIGNED'].includes(status)) return 'bg-amber-100 text-amber-700'
  if (['CANCELLED', 'REJECTED', 'FAILED', 'SUSPENDED'].includes(status)) return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-600'
}

const emptyReportData: AdminReportData = {
  summary: {}, users: [], bookings: [], projects: [], technicianReports: [], activities: [], materialUsages: [], inventory: [], lowStockItems: [], orders: [], sales: [], requests: [], releases: [], movements: [],
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [data, setData] = useState<(AdminReportData & { preparedBy: ReportPreparer; period: ReportPeriod }) | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (start: string, end: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ department: 'ADMIN' })
      if (start) params.set('startDate', start)
      if (end) params.set('endDate', end)
      const response = await fetch(`/api/department-reports?${params.toString()}`)
      if (response.status === 401) { router.push('/admin/login'); return }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Unable to generate the report.')
      setData({ ...payload, period: { startDate: start, endDate: end } })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to generate the report.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load('', '') }, [load])

  const filtered = useMemo(() => {
    if (!data || !query.trim()) return data || emptyReportData
    const term = query.trim().toLowerCase()
    const includes = (value: unknown) => String(value || '').toLowerCase().includes(term)
    return {
      ...data,
      users: data.users.filter(item => includes(item.name) || includes(item.email) || includes(item.role)),
      bookings: data.bookings.filter(item => includes(item.title) || includes(item.client?.name) || includes(item.status)),
      projects: data.projects.filter(item => includes(item.title) || includes(item.booking?.title) || includes(item.status)),
      technicianReports: data.technicianReports.filter(item => includes(item.content) || includes(item.author?.name) || includes(item.booking?.title)),
      activities: data.activities.filter(item => includes(item.message) || includes(item.tech?.name) || includes(item.booking?.title)),
      materialUsages: data.materialUsages.filter(item => includes(item.inventoryItem?.name) || includes(item.tech?.name) || includes(item.booking?.title)),
      inventory: data.inventory.filter(item => includes(item.name) || includes(item.sku) || includes(item.category)),
      orders: data.orders.filter(item => includes(item.id) || includes(item.clientName) || includes(item.status) || includes(item.deliveryStatus)),
      sales: data.sales.filter(item => includes(item.reference) || includes(item.customerName) || includes(item.createdBy?.name)),
      requests: data.requests.filter(item => includes(item.reference) || includes(item.source) || includes(item.status) || includes(item.requester?.name)),
      releases: data.releases.filter(item => includes(item.receiptNumber) || includes(item.request?.reference) || includes(item.releasedBy?.name)),
      movements: data.movements.filter(item => includes(item.inventoryItem?.name) || includes(item.worker?.name) || includes(item.type)),
    }
  }, [data, query])

  function exportCsv() {
    if (!data) return
    const rows: string[][] = [['Section', 'Reference / Name', 'Status', 'Role / Source', 'Quantity', 'Amount', 'Date']]
    data.sales.forEach(item => rows.push(['Sales counter', item.reference, 'COMPLETED', item.createdBy?.name || '', String(item.items?.reduce((sum: number, line: any) => sum + line.quantity, 0) || 0), String(item.total || 0), dateLabel(item.createdAt)]))
    data.orders.forEach(item => rows.push(['Client order', item.id, `${item.status} / ${item.deliveryStatus}`, item.clientName || '', String(item.items?.reduce((sum: number, line: any) => sum + line.quantity, 0) || 0), String(item.total || 0), dateLabel(item.createdAt)]))
    data.inventory.forEach(item => rows.push(['Inventory', item.name, item.quantity <= item.reorderLevel ? 'LOW STOCK' : 'IN STOCK', item.sku || '', String(item.quantity), String(item.quantity * Number(item.buyPrice || 0)), dateLabel(item.updatedAt)]))
    data.requests.forEach(item => rows.push(['Warehouse request', item.reference, item.status, item.source, String(item.items?.reduce((sum: number, line: any) => sum + line.requestedQuantity, 0) || 0), '', dateLabel(item.createdAt)]))
    data.releases.forEach(item => rows.push(['Warehouse release', item.receiptNumber, 'RELEASED', item.request?.source || '', String(item.items?.reduce((sum: number, line: any) => sum + line.quantity, 0) || 0), '', dateLabel(item.createdAt)]))
    data.bookings.forEach(item => rows.push(['Booking', item.title, item.status, item.client?.name || '', '', '', dateLabel(item.createdAt)]))
    data.projects.forEach(item => rows.push(['Project', item.title, item.status, item.assignments?.map((entry: any) => entry.tech?.name).join(', ') || '', '', '', dateLabel(item.updatedAt)]))
    data.materialUsages.forEach(item => rows.push(['Material usage', item.booking?.title || '', 'USED', `${item.inventoryItem?.name || ''} · ${item.tech?.name || ''}`, String(item.quantity), '', dateLabel(item.createdAt)]))
    data.users.forEach(item => rows.push(['Worker', item.name, item.status, item.role, '', '', dateLabel(item.createdAt)]))
    const csv = rows.map(row => row.map(cell => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `elettro-admin-report-${data.period.startDate || 'all'}-${data.period.endDate || 'time'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const summary = data?.summary || {}
  const cards = [
    ['Total sales income', money(summary.totalSalesRevenue), 'POS + successful client orders', 'from-cyan-400 to-blue-500'],
    ['Client orders', summary.totalOrders || 0, `${summary.deliveredOrders || 0} delivered`, 'from-violet-400 to-indigo-500'],
    ['Warehouse stock', summary.inventoryCount || 0, `${summary.lowStockCount || 0} low stock`, 'from-emerald-400 to-teal-500'],
    ['Projects', summary.totalProjects || 0, `${summary.completedProjects || 0} completed`, 'from-amber-300 to-orange-500'],
    ['Bookings', summary.totalBookings || 0, `${summary.completedBookings || 0} completed`, 'from-pink-400 to-rose-500'],
    ['Workers', summary.totalWorkers || 0, `${summary.activeWorkers || 0} active`, 'from-slate-400 to-slate-700'],
  ] as const

  return (
    <div className="department-report-page space-y-6">
      <DepartmentReportStyles />

      <section className="reports-print-hidden relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#122b35] to-[#08727f] p-6 text-white shadow-[0_28px_60px_-30px_rgba(15,23,42,0.85)] sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" /><div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Executive reporting</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Reports</h1><p className="mt-3 text-sm leading-6 text-slate-300">One printable view of sales, warehouse, deliveries, projects, technicians, clients, and workforce activity across Elettro.</p></div><div className="reports-print-hidden flex flex-wrap gap-3"><button type="button" onClick={() => window.print()} disabled={loading || !data || Boolean(error)} className="rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-900 transition hover:bg-cyan-50 disabled:opacity-50">Print / Save PDF</button><button type="button" onClick={exportCsv} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-black text-white transition hover:bg-white/20">Export CSV</button></div></div>
      </section>

      <section className="reports-print-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Report controls</p><h2 className="mt-1 text-lg font-black text-slate-950">Choose a reporting period</h2><p className="mt-1 text-xs text-slate-500">Leave both dates blank to include the complete system history.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-xs font-bold text-slate-600">From<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500" /></label><label className="text-xs font-bold text-slate-600">To<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-cyan-500" /></label><button type="button" onClick={() => void load(startDate, endDate)} className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-cyan-800">Generate report</button></div></div><div className="mt-4 border-t border-slate-100 pt-4"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter records by name, reference, role, status, or department…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:bg-white" /></div></section>

      {error && <div role="alert" className="reports-print-hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {loading && <div className="reports-print-hidden grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map(item => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}</div>}

      {!loading && data && <>
        {!error && (
          <DepartmentReportPrint
            title="Administration Report"
            officerLabel="Prepared by"
            preparedBy={data.preparedBy}
            period={data.period}
            filterNote={query.trim() ? `Search filter: "${query.trim()}". Summary covers the full reporting period.` : undefined}
          />
        )}
        <div className="department-print-summary grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, note, accent]) => <div key={label} className="reports-print-card group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_35px_-22px_rgba(15,23,42,0.7)] transition hover:-translate-y-1"><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} /><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-medium text-slate-500">{note}</p></div>)}</div>

        <section className="reports-print-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Report coverage</p><h2 className="mt-1 text-xl font-black text-slate-950">System activity overview</h2></div><span className="text-xs font-bold text-slate-500">{data.period.startDate || data.period.endDate ? `${data.period.startDate || 'Beginning'} → ${data.period.endDate || 'Latest'}` : 'All recorded time'}</span></div><div className="mt-5 grid gap-4 md:grid-cols-4"><div className="rounded-2xl bg-cyan-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-cyan-700">Technician reports</p><p className="mt-2 text-2xl font-black text-cyan-950">{summary.technicianReportCount || 0}</p><p className="mt-1 text-xs text-cyan-800">Progress updates submitted</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Warehouse releases</p><p className="mt-2 text-2xl font-black text-amber-950">{summary.releaseCount || 0}</p><p className="mt-1 text-xs text-amber-800">Materials released</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Inventory movements</p><p className="mt-2 text-2xl font-black text-emerald-950">{summary.movementCount || 0}</p><p className="mt-1 text-xs text-emerald-800">Stock audit events</p></div><div className="rounded-2xl bg-violet-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Inventory value</p><p className="mt-2 text-2xl font-black text-violet-950">{money(summary.inventoryValue)}</p><p className="mt-1 text-xs text-violet-800">Based on buy price</p></div></div></section>

        <div className="department-print-table-group grid gap-6 xl:grid-cols-2">
          <ReportTable title="Sales & client orders" eyebrow="Sales department" count={filtered.orders.length + filtered.sales.length}><table className="w-full min-w-[700px] text-left text-xs"><thead><tr><th>Record</th><th>Status</th><th>Customer / cashier</th><th>Amount</th><th>Date</th></tr></thead><tbody>{filtered.sales.map(item => <tr key={`sale-${item.id}`}><td className="font-black">Counter · {item.reference}</td><td><Status value="COMPLETED" /></td><td>{item.customerName || item.createdBy?.name || 'Walk-in customer'}</td><td className="font-black">{money(item.total)}</td><td>{dateLabel(item.createdAt)}</td></tr>)}{filtered.orders.map(item => <tr key={`order-${item.id}`}><td className="font-black">Order · {item.id.slice(0, 8)}</td><td><Status value={`${item.status} / ${item.deliveryStatus}`} /></td><td>{item.clientName || item.client?.name || 'Client'}</td><td className="font-black">{money(item.total)}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable>
          <ReportTable title="Warehouse requests & releases" eyebrow="Materials control" count={filtered.requests.length + filtered.releases.length}><table className="w-full min-w-[700px] text-left text-xs"><thead><tr><th>Reference</th><th>Type</th><th>Status</th><th>Requester / worker</th><th>Date</th></tr></thead><tbody>{filtered.requests.map(item => <tr key={`request-${item.id}`}><td className="font-black">{item.reference}</td><td>{item.source}</td><td><Status value={item.status} /></td><td>{item.requester?.name || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}{filtered.releases.map(item => <tr key={`release-${item.id}`}><td className="font-black">{item.receiptNumber}</td><td>RELEASE</td><td><Status value="RELEASED" /></td><td>{item.releasedBy?.name || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable>
        </div>

        <ReportTable title="Inventory materials" eyebrow="Warehouse stock" count={filtered.inventory.length}><table className="w-full min-w-[720px] text-left text-xs"><thead><tr><th>Material</th><th>SKU</th><th>Category</th><th>Stock</th><th>Reorder level</th><th>Value</th></tr></thead><tbody>{filtered.inventory.map(item => <tr key={item.id}><td className="font-black">{item.name}</td><td>{item.sku || '—'}</td><td>{item.category || 'General'}</td><td><span className={`font-black ${item.quantity <= item.reorderLevel ? 'text-red-600' : 'text-emerald-700'}`}>{item.quantity} {item.unit || 'units'}</span></td><td>{item.reorderLevel}</td><td className="font-black">{money(item.quantity * Number(item.buyPrice || 0))}</td></tr>)}</tbody></table></ReportTable>

        <div className="department-print-table-group grid gap-6 xl:grid-cols-2"><ReportTable title="Projects & bookings" eyebrow="Service operations" count={filtered.projects.length + filtered.bookings.length}><table className="w-full min-w-[700px] text-left text-xs"><thead><tr><th>Project / booking</th><th>Status</th><th>Client</th><th>Team</th><th>Date</th></tr></thead><tbody>{filtered.projects.map(item => <tr key={`project-${item.id}`}><td className="font-black">Project · {item.title}</td><td><Status value={item.status} /></td><td>{item.booking?.title || '—'}</td><td>{item.assignments?.length || 0} technician(s)</td><td>{dateLabel(item.updatedAt)}</td></tr>)}{filtered.bookings.map(item => <tr key={`booking-${item.id}`}><td className="font-black">Booking · {item.title}</td><td><Status value={item.status} /></td><td>{item.client?.name || '—'}</td><td>{item.assignedTo?.name || 'Unassigned'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable>
          <ReportTable title="Workforce directory" eyebrow="Roles & access" count={filtered.users.length}><table className="w-full min-w-[680px] text-left text-xs"><thead><tr><th>Staff member</th><th>Role</th><th>Account status</th><th>Approved</th><th>Joined</th></tr></thead><tbody>{filtered.users.map(item => <tr key={item.id}><td className="font-black">{item.name}<span className="ml-2 font-normal text-slate-400">{item.email}</span></td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase">{item.role}</span></td><td><Status value={item.status} /></td><td>{item.approved ? 'Yes' : 'Pending'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable></div>

        <div className="department-print-table-group grid gap-6 xl:grid-cols-2"><ReportTable title="Technician progress reports" eyebrow="Field activity" count={filtered.technicianReports.length}><table className="w-full min-w-[680px] text-left text-xs"><thead><tr><th>Project</th><th>Technician</th><th>Progress</th><th>Update</th><th>Date</th></tr></thead><tbody>{filtered.technicianReports.map(item => <tr key={item.id}><td className="max-w-[220px] truncate font-black">{item.booking?.title || '—'}</td><td>{item.author?.name || '—'}</td><td className="font-black text-cyan-700">{item.progress ?? 0}%</td><td className="max-w-[260px] truncate">{item.content}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable><ReportTable title="Inventory movement audit" eyebrow="Traceability" count={filtered.movements.length}><table className="w-full min-w-[680px] text-left text-xs"><thead><tr><th>Material</th><th>Movement</th><th>Quantity</th><th>Worker</th><th>Date</th></tr></thead><tbody>{filtered.movements.map(item => <tr key={item.id}><td className="font-black">{item.inventoryItem?.name || '—'}</td><td><Status value={item.type} /></td><td>{item.quantity}</td><td>{item.worker?.name || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable></div>
        <ReportTable title="Project material usage" eyebrow="Materials consumed in the field" count={filtered.materialUsages.length}><table className="w-full min-w-[680px] text-left text-xs"><thead><tr><th>Project</th><th>Material</th><th>Quantity</th><th>Technician</th><th>Date</th></tr></thead><tbody>{filtered.materialUsages.map(item => <tr key={item.id}><td className="font-black">{item.booking?.title || '—'}</td><td>{item.inventoryItem?.name || '—'}</td><td className="font-black text-sky-700">{item.quantity} {item.unit || item.inventoryItem?.unit || 'pcs'}</td><td>{item.tech?.name || '—'}</td><td>{dateLabel(item.createdAt)}</td></tr>)}</tbody></table></ReportTable>
      </>}
    </div>
  )
}

function Status({ value }: { value?: string }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${statusTone(value)}`}>{value || '—'}</span>
}

function ReportTable({ title, eyebrow, count, children }: { title: string; eyebrow: string; count: number; children: React.ReactNode }) {
  return <section className="reports-print-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="department-print-table-heading flex items-end justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">{eyebrow}</p><h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{count} records</span></div><div className="report-table overflow-x-auto">{children}</div></section>
}
