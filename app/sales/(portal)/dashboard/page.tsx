'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarChartIcon, CartIcon, DocumentIcon, InboxIcon, PackageIcon } from '../../../../components/admin/icons'

type SalesReportData = {
  summary: {
    totalOrders: number
    receivedOrders: number
    pendingOrders: number
    ordersAwaitingFulfillment: number
    inTransitDeliveries: number
    deliveredOrders: number
    failedDeliveries: number
    cancelledOrders: number
    returnedOrders: number
    totalSalesRevenue: number
    releasesHandedOver: number
    releasesPendingHandover: number
  }
  orders: any[]
  releases: any[]
}

const money = (value: number) => `₱${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const statusTone: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-violet-100 text-violet-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-cyan-100 text-cyan-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-700',
}

function formatDate(value?: string) {
  if (!value) return 'No date'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SalesDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<SalesReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        const response = await fetch('/api/department-reports?department=SALES')
        if (response.status === 401) {
          router.push('/sales/login')
          return
        }
        if (!response.ok) throw new Error('Failed to load sales dashboard data')
        setData(await response.json())
      } catch (err: any) {
        setError(err.message || 'Failed to load sales dashboard')
      } finally {
        setLoading(false)
      }
    }
    void loadDashboard()
  }, [router])

  const summary = data?.summary
  const orders = data?.orders || []
  const releases = data?.releases || []
  const deliveryTotal = (summary?.inTransitDeliveries || 0) + (summary?.deliveredOrders || 0) + (summary?.failedDeliveries || 0)
  const deliveredPercent = deliveryTotal ? Math.round(((summary?.deliveredOrders || 0) / deliveryTotal) * 100) : 0
  const fulfillmentTotal = (summary?.receivedOrders || 0) + (summary?.ordersAwaitingFulfillment || 0) + (summary?.pendingOrders || 0)
  const fulfillmentPercent = fulfillmentTotal ? Math.round(((summary?.receivedOrders || 0) / fulfillmentTotal) * 100) : 0

  const pipeline = useMemo(() => [
    { label: 'Pending review', value: summary?.pendingOrders || 0, color: 'bg-amber-400', text: 'text-amber-700' },
    { label: 'Warehouse queue', value: summary?.ordersAwaitingFulfillment || 0, color: 'bg-blue-500', text: 'text-blue-700' },
    { label: 'In transit', value: summary?.inTransitDeliveries || 0, color: 'bg-indigo-500', text: 'text-indigo-700' },
    { label: 'Completed', value: summary?.receivedOrders || 0, color: 'bg-emerald-500', text: 'text-emerald-700' },
  ], [summary])

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-2xl shadow-slate-300/50 sm:px-8">
        <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,0.12)]" /> Sales intelligence center</div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Sales dashboard</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-300">One clear view of revenue, customer orders, warehouse handovers, and delivery performance.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/sales/orders" className="rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-300">Manage orders</Link>
              <Link href="/sales/pos" className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black text-white ring-1 ring-white/15 transition hover:bg-white/15">Open POS</Link>
              <Link href="/sales/deliveries" className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black text-white ring-1 ring-white/15 transition hover:bg-white/15">Track deliveries</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Orders</div><div className="mt-2 text-3xl font-black">{summary?.totalOrders || 0}</div><div className="mt-1 text-[10px] font-bold text-slate-400">all time</div></div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Handover</div><div className="mt-2 text-3xl font-black">{summary?.releasesHandedOver || 0}</div><div className="mt-1 text-[10px] font-bold text-slate-400">confirmed releases</div></div>
            <div className="col-span-2 rounded-2xl bg-yellow-400 p-4 text-slate-950 shadow-lg shadow-yellow-500/20 sm:col-span-1"><div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Sales value</div><div className="mt-2 text-2xl font-black">{money(summary?.totalSalesRevenue || 0)}</div><div className="mt-1 text-[10px] font-bold text-slate-700">received sales</div></div>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div key={item} className="h-32 animate-pulse rounded-3xl bg-slate-200/70" />)}</div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Completed sales', value: summary?.receivedOrders || 0, detail: `${money(summary?.totalSalesRevenue || 0)} received value`, icon: CartIcon, tone: 'from-emerald-500 to-teal-600', href: '/sales/orders' },
              { label: 'Pending orders', value: summary?.pendingOrders || 0, detail: 'Awaiting confirmation', icon: InboxIcon, tone: 'from-amber-400 to-orange-500', href: '/sales/orders' },
              { label: 'Warehouse queue', value: summary?.ordersAwaitingFulfillment || 0, detail: 'Needs material release', icon: PackageIcon, tone: 'from-blue-500 to-indigo-600', href: '/sales/requests' },
              { label: 'In transit', value: summary?.inTransitDeliveries || 0, detail: 'Currently out for delivery', icon: BarChartIcon, tone: 'from-violet-500 to-purple-700', href: '/sales/deliveries' },
            ].map((card) => {
              const Icon = card.icon
              return <Link key={card.label} href={card.href} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70"><div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${card.tone} opacity-10 blur-xl transition group-hover:opacity-20`} /><div className="relative flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.tone} text-white shadow-lg`}><Icon className="h-5 w-5" /></div><span className="text-slate-300 transition group-hover:text-yellow-500">↗</span></div><div className="relative mt-5 text-3xl font-black tracking-tight text-slate-950">{card.value}</div><div className="relative mt-1 text-xs font-black text-slate-700">{card.label}</div><div className="relative mt-1 text-[10px] font-medium text-slate-400">{card.detail}</div></Link>
            })}
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600">Live pipeline</div><h2 className="mt-1 text-xl font-black text-slate-950">Fulfillment performance</h2><p className="mt-1 text-xs font-medium text-slate-500">How customer orders are moving through Sales.</p></div><div className="rounded-2xl bg-slate-950 px-3 py-2 text-right text-white"><div className="text-xl font-black">{fulfillmentPercent}%</div><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">completed</div></div></div>
              <div className="mt-7 space-y-5">{pipeline.map((item) => { const width = fulfillmentTotal ? Math.max(5, Math.round((item.value / fulfillmentTotal) * 100)) : 5; return <div key={item.label}><div className="mb-2 flex items-center justify-between text-xs"><span className={`font-black ${item.text}`}>{item.label}</span><span className="font-black text-slate-500">{item.value}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color} shadow-[0_3px_8px_rgba(15,23,42,0.18)] transition-all`} style={{ width: `${width}%` }} /></div></div> })}</div>
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5"><div><div className="text-lg font-black text-emerald-600">{summary?.deliveredOrders || 0}</div><div className="text-[10px] font-bold text-slate-400">Delivered</div></div><div><div className="text-lg font-black text-red-600">{summary?.failedDeliveries || 0}</div><div className="text-[10px] font-bold text-slate-400">Failed delivery</div></div><div><div className="text-lg font-black text-slate-900">{summary?.cancelledOrders || 0}</div><div className="text-[10px] font-bold text-slate-400">Cancelled</div></div></div>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-xl shadow-indigo-200/40">
              <div className="absolute -bottom-16 -right-16 h-44 w-44 rounded-full border-[22px] border-white/5" /><div className="absolute -right-7 top-8 h-28 w-28 rounded-full border-[14px] border-yellow-400/20" />
              <div className="relative"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Delivery health</div><h2 className="mt-1 text-xl font-black">Field performance</h2><div className="mt-7 flex items-center gap-5"><div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full shadow-inner" style={{ background: `conic-gradient(#34d399 ${deliveredPercent}%, rgba(255,255,255,0.12) 0)` }}><div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-slate-900"><span className="text-2xl font-black">{deliveredPercent}%</span><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">success</span></div></div><div className="space-y-3 text-xs"><div><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />{summary?.deliveredOrders || 0} delivered</div><div><span className="mr-2 inline-block h-2 w-2 rounded-full bg-indigo-400" />{summary?.inTransitDeliveries || 0} in transit</div><div><span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-400" />{summary?.failedDeliveries || 0} failed</div></div></div><Link href="/sales/deliveries" className="mt-8 inline-flex rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black ring-1 ring-white/15 transition hover:bg-white/15">Open delivery monitoring →</Link></div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600">Customer activity</div><h2 className="mt-1 text-xl font-black text-slate-950">Recent orders</h2></div><Link href="/sales/orders" className="text-xs font-black text-yellow-700 hover:text-yellow-800">View all →</Link></div><div className="mt-5 space-y-3">{orders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">No orders found.</div> : orders.slice(0, 5).map((order) => <div key={order.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-yellow-200 hover:bg-yellow-50/40"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-slate-800">ORD-{order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}</span><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${statusTone[order.status] || 'bg-slate-200 text-slate-700'}`}>{order.status.replace(/_/g, ' ')}</span></div><div className="mt-1 truncate text-[11px] font-medium text-slate-500">{order.clientName} · {order.items?.length || 0} items · {formatDate(order.createdAt)}</div></div><div className="shrink-0 text-right text-xs font-black text-slate-900">{money(order.total)}</div></div>)}</div></div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Warehouse coordination</div><h2 className="mt-1 text-xl font-black text-slate-950">Material handovers</h2></div><Link href="/sales/receipts" className="text-xs font-black text-yellow-700 hover:text-yellow-800">View receipts →</Link></div><div className="mt-5 space-y-3">{releases.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">No warehouse releases recorded yet.</div> : releases.slice(0, 5).map((release) => { const received = Boolean(release.receivedBySalesId); return <div key={release.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/40"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-slate-800">{release.receiptNumber}</span><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${received ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{received ? 'Confirmed' : 'Awaiting handover'}</span></div><div className="mt-1 truncate text-[11px] font-medium text-slate-500">{release.items?.length || 0} items · Released by {release.releasedBy?.name || 'Warehouse'}</div></div><Link href="/sales/receipts" className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[10px] font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:ring-yellow-400">{received ? 'View' : 'Acknowledge'}</Link></div> })}</div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5"><div className="rounded-2xl bg-emerald-50 p-3"><div className="text-xl font-black text-emerald-700">{summary?.releasesHandedOver || 0}</div><div className="text-[10px] font-bold text-emerald-700/70">Confirmed releases</div></div><div className="rounded-2xl bg-amber-50 p-3"><div className="text-xl font-black text-amber-700">{summary?.releasesPendingHandover || 0}</div><div className="text-[10px] font-bold text-amber-700/70">Pending handover</div></div></div></div>
          </section>
        </>
      )}
    </div>
  )
}

