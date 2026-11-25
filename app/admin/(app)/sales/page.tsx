'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import SearchBar from '../../../../components/admin/SearchBar'
import FilterBar from '../../../../components/admin/FilterBar'
import EmptyState from '../../../../components/admin/EmptyState'
import PageHeader from '../../../../components/admin/PageHeader'
import { CartIcon } from '../../../../components/admin/icons'
import type { OrderObj } from '../../../../components/admin/types'

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'PROCESSING' | 'READY_FOR_PICKUP' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'

type CounterSale = {
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

type WarehouseRequest = { id: string; reference: string; status: string; createdAt: string; items?: { requestedQuantity: number }[] }
type SalesStock = { id: string; availableQuantity: number }

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'New' },
  { value: 'APPROVED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Preparing' },
  { value: 'SHIPPED', label: 'To Receive' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-violet-100 text-violet-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  READY_FOR_PICKUP: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-cyan-100 text-cyan-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'New order',
  APPROVED: 'Confirmed',
  PROCESSING: 'Preparing',
  SHIPPED: 'Shipped · to receive',
  READY_FOR_PICKUP: 'Ready for pickup',
  DELIVERED: 'Delivered · awaiting receipt',
  COMPLETED: 'Received',
  CANCELLED: 'Cancelled',
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminSalesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderObj[]>([])
  const [counterSales, setCounterSales] = useState<CounterSale[]>([])
  const [warehouseRequests, setWarehouseRequests] = useState<WarehouseRequest[]>([])
  const [salesStock, setSalesStock] = useState<SalesStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')

  const load = useCallback(async () => {
    try {
      const [ordersRes, salesRes, requestsRes] = await Promise.all([fetch('/api/orders'), fetch('/api/sales-sales'), fetch('/api/warehouse-requests?source=SALES')])
      if (!ordersRes.ok || !salesRes.ok || !requestsRes.ok) {
        if (ordersRes.status === 401 || salesRes.status === 401 || requestsRes.status === 401) { router.push('/admin/login'); return }
        throw new Error('Failed to load sales records')
      }
      const [ordersData, salesData, requestsData] = await Promise.all([ordersRes.json(), salesRes.json(), requestsRes.json()])
      setOrders(ordersData.orders || [])
      setCounterSales(salesData.sales || [])
      setSalesStock(salesData.stock || [])
      setWarehouseRequests(requestsData.requests || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load sales')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  const visible = orders.filter((o) => {
    const matchesFilter = filter === 'ALL' || o.status === filter
    const q = query.trim().toLowerCase()
    const matchesQuery = !q
      || (o.clientName || '').toLowerCase().includes(q)
      || (o.email || '').toLowerCase().includes(q)
      || (o.phone || '').toLowerCase().includes(q)
      || (o.reference || '').toLowerCase().includes(q)
      || (o.items || []).some((it) => (it.name || '').toLowerCase().includes(q))
    return matchesFilter && matchesQuery
  })

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length
  const successfulOrders = orders.filter((order) => order.isFullyReceived === true || (order.isFullyReceived === undefined && order.status === 'COMPLETED'))
  const orderRevenue = successfulOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const counterRevenue = counterSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)
  const combinedRevenue = orderRevenue + counterRevenue
  const completedOrders = successfulOrders.length
  const averageCounterSale = counterSales.length ? counterRevenue / counterSales.length : 0
  const salesStockUnits = salesStock.reduce((sum, item) => sum + Number(item.availableQuantity || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CartIcon className="h-5 w-5" />}
        title="Sales"
        subtitle={`${orders.length} sales · ${pendingCount} pending`}
        actions={
          <span className="rounded-xl bg-yellow-400 px-3 py-2 text-[11px] font-black text-black">
            ₱{orders.reduce((sum, o) => sum + Number(o.total || 0), 0).toLocaleString()} total
          </span>
        }
      />

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#152b3d] to-[#08727f] p-6 text-white shadow-[0_28px_60px_-30px_rgba(15,23,42,0.85)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200"><span className="h-1.5 w-1.5 rounded-full bg-yellow-300" /> Live sales intelligence</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Sales command center</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">A read-only view of sales department activity: client orders, counter sales, payment records, and completed receipts.</p></div>
          <div className="max-w-xs rounded-2xl border border-white/15 bg-white/10 p-4 text-xs font-semibold leading-5 text-slate-200">Sales creates and manages transactions. Admin monitors the live records here and cannot create sales.</div>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
          {[
            ['All records', orders.length + counterSales.length],
            ['Order revenue', `₱${orderRevenue.toLocaleString()}`],
            ['Counter sales', counterSales.length],
            ['Recorded revenue', `₱${combinedRevenue.toLocaleString()}`],
          ].map(([label, value]) => (
            <div key={String(label)}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div></div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {[
          ['Client Orders', orders.length, `${pendingCount} pending`, 'from-cyan-400 to-blue-600', '/admin/sales/orders'],
          ['Completed Orders', completedOrders, 'customer orders received', 'from-emerald-400 to-teal-600', '/admin/sales/completed'],
          ['Counter Receipts', counterSales.length, `₱${averageCounterSale.toLocaleString(undefined, { maximumFractionDigits: 0 })} average`, 'from-violet-400 to-indigo-600', '/admin/sales/receipts'],
          ['Payment Records', counterSales.filter((sale) => Number(sale.paymentAmount) >= Number(sale.total)).length, 'counter sales paid', 'from-amber-300 to-orange-600', '/admin/sales/payments'],
          ['Warehouse Requests', warehouseRequests.length, 'sales requests to warehouse', 'from-orange-400 to-red-600', '/admin/sales/warehouse-requests'],
          ['Sales Stock', salesStock.length, `${salesStockUnits.toLocaleString()} units available`, 'from-teal-400 to-cyan-600', '/admin/sales/stock'],
        ].map(([label, value, note, accent, href]) => <Link href={String(href)} key={String(label)} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_35px_-22px_rgba(15,23,42,0.7)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_40px_-20px_rgba(15,23,42,0.45)]"><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} /><div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100 transition group-hover:scale-125" /><div className="relative"><div className="flex items-start justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><span className="text-[10px] font-black text-slate-400 transition group-hover:text-slate-900">View →</span></div><p className="mt-3 text-3xl font-black text-slate-900">{value}</p><p className="mt-1 text-[11px] font-medium text-slate-500">{note}</p></div></Link>)}
      </div>

      <div className="hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by client, email, phone, item…" />
        <FilterBar options={FILTERS} value={filter} onChange={(v) => setFilter(v)} />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CartIcon className="h-6 w-6" />}
          title={orders.length === 0 ? 'No sales yet' : 'No sales match your filters'}
          message={orders.length === 0 ? 'Sales from the sales department will appear here.' : 'Try adjusting the search or filters.'}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((order) => {
            const itemsText = (order.items || []).map((it) => `${it.quantity}× ${it.name}`).join(', ')
            return (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left: order info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{order.reference}</span>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</span>
                      {order.warehouseRequest && (
                        <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Warehouse {order.warehouseRequest.status.toLowerCase().replace(/_/g, ' ')} · {order.warehouseRequest.reference}
                        </span>
                      )}
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {order.fulfillmentMethod === 'PICKUP' ? 'Pickup' : 'Delivery'} · {(order.paymentMethod || '').replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      {(order.items || []).map((it) => (
                        <div key={it.id} className="flex items-center justify-between gap-3 py-0.5">
                          <span className="text-xs font-semibold text-slate-700">{it.name}</span>
                          <span className="shrink-0 text-right text-[11px] font-bold text-slate-500">
                            {it.quantity} {it.unit || 'pcs'}{it.unitPrice > 0 ? ` · ₱${(Number(it.unitPrice) * it.quantity).toLocaleString()}` : ''}
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</span>
                        <span className="text-sm font-black text-yellow-700">₱{Number(order.total || 0).toLocaleString()}</span>
                      </div>
                      {order.fulfillmentMethod === 'DELIVERY' && (
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Delivery fee</span>
                          <span>₱{Number(order.shipping || 0).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Customer total</span>
                        <span>₱{(Number(order.total || 0) + Number(order.shipping || 0)).toLocaleString()}</span>
                      </div>
                    </div>

                    {itemsText && (
                      <p className="mt-2 text-[10px] text-slate-400">{itemsText}</p>
                    )}
                  </div>

                  {/* Right: client info (read-only) */}
                  <div className="shrink-0 lg:w-64">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="text-xs font-bold text-slate-800">{order.clientName}</div>
                      <div className="mt-1 truncate text-[11px] text-slate-500">{order.email}</div>
                      <div className="text-[11px] font-semibold text-slate-600">{order.phone}</div>
                      {order.client?.email && (
                        <Link href={`/admin/clients`} className="mt-1 block text-[10px] font-bold text-yellow-700 hover:underline">
                          Client record →
                        </Link>
                      )}
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Payment</div>
                      <div className="mt-1 text-xs font-bold text-slate-700">{(order.paymentStatus || 'UNPAID').replace(/_/g, ' ')}</div>
                      {order.paymentReference && <div className="mt-1 break-all text-[11px] text-slate-500">GCash reference: {order.paymentReference}</div>}
                    </div>
                    {order.fulfillmentMethod === 'DELIVERY' && (
                      <div className="mt-3 rounded-xl border border-slate-200 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Delivery fee</div>
                        <div className="mt-1 text-xs font-bold text-slate-700">₱{Number(order.shipping || 0).toLocaleString()}</div>
                        {order.shippingConfirmed && <span className="text-[10px] font-semibold text-emerald-700">Fee confirmed</span>}
                      </div>
                    )}
                    {order.fulfillmentNote && (
                      <div className="mt-3 rounded-xl border border-slate-200 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {order.fulfillmentMethod === 'PICKUP' ? 'Pickup instructions' : 'Delivery instructions'}
                        </div>
                        <div className="mt-1 text-xs text-slate-700">{order.fulfillmentNote}</div>
                      </div>
                    )}
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Admin view only
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Order management is handled by the Sales department
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div><h2 className="text-sm font-black text-slate-900">Counter sales and receipts</h2><p className="mt-1 text-[11px] text-slate-500">Live POS records submitted by the Sales department.</p></div>
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">Read-only archive</span>
        </div>
        {counterSales.length === 0 ? <div className="px-6 py-12 text-center text-xs text-slate-400">Completed counter sales will appear here.</div> : <div className="divide-y divide-slate-100">{counterSales.slice(0, 20).map((sale) => <article key={sale.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-slate-900">{sale.reference}</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Paid</span><span className="text-[10px] text-slate-400">{formatDate(sale.createdAt)}</span></div><p className="mt-1 truncate text-xs text-slate-600">{sale.items.map((item) => `${item.quantity} × ${item.name}`).join(' · ')}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">{sale.customerName || 'Walk-in customer'} · Cash ₱{Number(sale.paymentAmount).toLocaleString()} · Change ₱{Number(sale.changeAmount).toLocaleString()}</p></div><div className="text-left sm:text-right"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Receipt total</div><div className="text-lg font-black text-slate-900">₱{Number(sale.total).toLocaleString()}</div><div className="text-[10px] text-slate-400">By {sale.createdBy?.name || 'Sales staff'}</div></div></article>)}</div>}
       </section>
      </div>
    </div>
  )
}
