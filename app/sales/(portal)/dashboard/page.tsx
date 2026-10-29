'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CartIcon, PackageIcon, InboxIcon, DocumentIcon, BarChartIcon } from '../../../../components/admin/icons'

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

export default function SalesDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<SalesReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/department-reports?department=SALES')
        if (res.status === 401) {
          router.push('/sales/login')
          return
        }
        if (!res.ok) throw new Error('Failed to load sales dashboard data')
        const json = await res.json()
        setData(json)
      } catch (err: any) {
        setError(err.message || 'Failed to load sales dashboard')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [router])

  const s = data?.summary
  const orders = data?.orders || []
  const releases = data?.releases || []

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Links */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Sales Department Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor client orders, warehouse fulfillments, rider delivery dispatches, and material handovers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/sales/orders"
            className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-slate-900 shadow-sm hover:bg-yellow-300 transition-colors"
          >
            Manage Orders
          </Link>
          <Link
            href="/sales/catalog"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Browse Catalog
          </Link>
          <Link
            href="/sales/deliveries"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Delivery Monitoring
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Required Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {/* Total Customer Orders */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Sales</span>
              <CartIcon className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">{s?.receivedOrders ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">
              ₱{(s?.totalSalesRevenue ?? 0).toLocaleString()} received sales value
            </div>
          </div>

          {/* Pending Orders */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Orders</span>
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-amber-800">{s?.pendingOrders ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">Awaiting sales confirmation</div>
          </div>

          {/* Orders Awaiting Warehouse Fulfillment */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Awaiting Warehouse</span>
              <InboxIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-blue-700">{s?.ordersAwaitingFulfillment ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">Pending warehouse release</div>
          </div>

          {/* Ready for Delivery */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Ready for Delivery</span>
              <PackageIcon className="h-5 w-5 text-purple-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-purple-700">
              {orders.filter((o) => o.status === 'SHIPPED' && !o.riderId).length}
            </div>
            <div className="mt-1 text-xs text-slate-500">Awaiting rider assignment</div>
          </div>

          {/* In-Transit Deliveries */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">In Transit</span>
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
            </div>
            <div className="mt-3 text-3xl font-black text-indigo-700">{s?.inTransitDeliveries ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">Currently out for delivery</div>
          </div>

          {/* Delivered Orders */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Delivered Orders</span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-emerald-700">{s?.deliveredOrders ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">With verified proof photo</div>
          </div>

          {/* Cancelled/Returned Orders */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">Cancelled / Returns</span>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-red-700">
              {(s?.cancelledOrders ?? 0) + (s?.returnedOrders ?? 0)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {s?.cancelledOrders ?? 0} cancelled · {s?.returnedOrders ?? 0} returns
            </div>
          </div>
        </div>
      )}

      {/* Main Sections: Recent Customer Orders & Warehouse Material Releases */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Customer Orders */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Recent Customer Orders</h2>
              <p className="text-xs text-slate-500">Latest orders submitted by clients.</p>
            </div>
            <Link href="/sales/orders" className="text-xs font-bold text-yellow-600 hover:text-yellow-700">
              View All Orders →
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              No orders found.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((ord) => (
                <div key={ord.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">
                        ORD-{ord.id.replace(/-/g, '').slice(0, 8).toUpperCase()}
                      </span>
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                      <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-800">
                        {ord.paymentStatus}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {ord.clientName} · ₱{Number(ord.total || 0).toLocaleString()} · {ord.items?.length || 0} items
                    </div>
                  </div>
                  <Link
                    href={`/sales/orders`}
                    className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-yellow-400"
                  >
                    Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warehouse Releases & Material Handovers */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Materials Received from Warehouse</h2>
              <p className="text-xs text-slate-500">Warehouse releases awaiting or confirmed for physical handover.</p>
            </div>
            <Link href="/sales/receipts" className="text-xs font-bold text-yellow-600 hover:text-yellow-700">
              View Receipts →
            </Link>
          </div>

          {releases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              No warehouse releases recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {releases.slice(0, 5).map((rel) => {
                const received = Boolean(rel.receivedBySalesId)
                return (
                  <div key={rel.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{rel.receiptNumber}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            received ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {received ? 'Handover Confirmed' : 'Awaiting Sales Handover'}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Released by: {rel.releasedBy?.name || 'Warehouse'} · {rel.items?.length || 0} items
                      </div>
                    </div>
                    <Link
                      href="/sales/receipts"
                      className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-yellow-400"
                    >
                      {received ? 'View' : 'Acknowledge'}
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
