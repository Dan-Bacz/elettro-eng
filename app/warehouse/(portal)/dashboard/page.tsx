'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PackageIcon, InboxIcon, DocumentIcon, BarChartIcon } from '../../../../components/admin/icons'

type WarehouseStats = {
  totalProducts: number
  availableStockItems: number
  lowStockCount: number
  totalRequests: number
  salesRequestsCount: number
  technicianRequestsCount: number
  totalRequestedQty: number
  totalReleasedQty: number
  totalMovements: number
  totalReceipts: number
}

export default function WarehouseDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<WarehouseStats | null>(null)
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [salesRequests, setSalesRequests] = useState<any[]>([])
  const [technicianRequests, setTechnicianRequests] = useState<any[]>([])
  const [recentMovements, setRecentMovements] = useState<any[]>([])
  const [recentReceipts, setRecentReceipts] = useState<any[]>([])
  const [releasedTodayCount, setReleasedTodayCount] = useState(0)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/department-reports?department=WAREHOUSE')
        if (res.status === 401) {
          router.push('/warehouse')
          return
        }
        if (!res.ok) throw new Error('Failed to load warehouse data')
        const data = await res.json()
        setSummary(data.summary)
        setLowStockItems(data.lowStockItems || [])
        setSalesRequests(data.salesRequests || [])
        setTechnicianRequests(data.technicianRequests || [])
        setRecentMovements(data.movements?.slice(0, 6) || [])
        setRecentReceipts(data.receipts?.slice(0, 6) || [])

        // Count releases today
        const todayStr = new Date().toISOString().slice(0, 10)
        const todayReleases = (data.receipts || []).filter((r: any) =>
          String(r.createdAt).slice(0, 10) === todayStr
        ).length
        setReleasedTodayCount(todayReleases)
      } catch (err: any) {
        setError(err.message || 'Could not fetch warehouse dashboard metrics')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Warehouse Operations Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Live inventory levels, pending material requests, and audited release logs.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/warehouse/requests"
            className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-slate-900 shadow-sm hover:bg-yellow-300 transition-colors"
          >
            Review Material Requests
          </Link>
          <Link
            href="/warehouse/inventory"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Manage Stock
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {/* Total Products */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Products</span>
              <PackageIcon className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">{summary?.totalProducts ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">Inventory catalog lines</div>
          </div>

          {/* Available Stock Items */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Available Stock</span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-emerald-700">{summary?.availableStockItems ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">Products ready for release</div>
          </div>

          {/* Low Stock Items */}
          <div className={`rounded-2xl border p-5 shadow-sm ${
            (summary?.lowStockCount ?? 0) > 0 ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Low-Stock Items</span>
              {(summary?.lowStockCount ?? 0) > 0 && (
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-900">ALERT</span>
              )}
            </div>
            <div className="mt-3 text-3xl font-black text-amber-800">{summary?.lowStockCount ?? 0}</div>
            <div className="mt-1 text-xs text-amber-700">At or below reorder level</div>
          </div>

          {/* Pending Sales Requests */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Pending Sales Req.</span>
              <InboxIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-blue-700">
              {salesRequests.filter((r) => r.status === 'PENDING').length}
            </div>
            <div className="mt-1 text-xs text-slate-500">{summary?.salesRequestsCount ?? 0} total sales requests</div>
          </div>

          {/* Pending Technician Requests */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Pending Tech Req.</span>
              <InboxIcon className="h-5 w-5 text-purple-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-purple-700">
              {technicianRequests.filter((r) => r.status === 'PENDING').length}
            </div>
            <div className="mt-1 text-xs text-slate-500">{summary?.technicianRequestsCount ?? 0} total technician requests</div>
          </div>

          {/* Materials Released Today */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Releases Today</span>
              <DocumentIcon className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">{releasedTodayCount}</div>
            <div className="mt-1 text-xs text-slate-500">Released receipts today</div>
          </div>

          {/* Total Warehouse Releases */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Releases</span>
              <BarChartIcon className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">{summary?.totalReceipts ?? 0}</div>
            <div className="mt-1 text-xs text-slate-500">{summary?.totalReleasedQty ?? 0} units released to date</div>
          </div>
        </div>
      )}

      {/* Main Grid: Incoming Sales & Technician Requests */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Incoming Sales Material Requests */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Incoming Sales Material Requests</h2>
              <p className="text-xs text-slate-500">Requests originating from Sales officers or confirmed orders.</p>
            </div>
            <Link href="/warehouse/requests?source=SALES" className="text-xs font-bold text-yellow-600 hover:text-yellow-700">
              View all →
            </Link>
          </div>

          {salesRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              No sales material requests.
            </div>
          ) : (
            <div className="space-y-3">
              {salesRequests.slice(0, 4).map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">{req.reference}</span>
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      From: {req.requester?.name || 'Sales'} · {req.items?.length || 0} line items
                    </div>
                  </div>
                  <Link
                    href={`/warehouse/requests?reference=${encodeURIComponent(req.reference)}`}
                    className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-yellow-400"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Technician Material Requests */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Incoming Technician Material Requests</h2>
              <p className="text-xs text-slate-500">Requests submitted by field technicians for project jobs.</p>
            </div>
            <Link href="/warehouse/requests?source=TECHNICIAN" className="text-xs font-bold text-yellow-600 hover:text-yellow-700">
              View all →
            </Link>
          </div>

          {technicianRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              No technician material requests.
            </div>
          ) : (
            <div className="space-y-3">
              {technicianRequests.slice(0, 4).map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">{req.reference}</span>
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Technician: {req.requester?.name || 'Tech'} · Project: {req.projectReference || 'Field Project'}
                    </div>
                  </div>
                  <Link
                    href={`/warehouse/requests?reference=${encodeURIComponent(req.reference)}`}
                    className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-yellow-400"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low-Stock Alerts & Recent Movements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low-Stock Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Low-Stock Alerts</h2>
              <p className="text-xs text-slate-500">Materials requiring replenishment or immediate attention.</p>
            </div>
            <Link href="/warehouse/inventory" className="text-xs font-bold text-yellow-600 hover:text-yellow-700">
              Receive Stock →
            </Link>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-emerald-600 font-semibold">
              All inventory levels are healthy above reorder thresholds.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{item.name}</div>
                    <div className="text-[10px] text-slate-400">SKU: {item.sku || 'N/A'} · Reorder level: {item.reorderLevel} {item.unit || 'pcs'}</div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">
                      {item.quantity} {item.unit || 'pcs'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Inventory Movements */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Recent Inventory Movement History</h2>
              <p className="text-xs text-slate-500">Audited stock receipts, releases, adjustments, and returns.</p>
            </div>
            <Link href="/warehouse/inventory" className="text-xs font-bold text-yellow-600 hover:text-yellow-700">
              View History →
            </Link>
          </div>

          {recentMovements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              No recent movements logged.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentMovements.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase mr-2 ${
                      m.type === 'STOCK_RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                      m.type === 'STOCK_RELEASED' ? 'bg-blue-100 text-blue-700' :
                      m.type === 'RETURN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {m.type.replace(/_/g, ' ')}
                    </span>
                    <span className="font-bold text-slate-800">{m.inventoryItem?.name}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {m.worker?.name} · {m.reason || 'Movement'}
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-600">
                    {m.stockBefore} → <span className="text-slate-900 font-black">{m.stockAfter}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
