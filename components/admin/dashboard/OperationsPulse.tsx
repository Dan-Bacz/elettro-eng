'use client'

import Link from 'next/link'
import { ActivityIcon, AlertIcon, ArrowRightIcon, BellIcon, CartIcon, CheckCircleIcon, InboxTrayIcon, PackageIcon, UserIcon } from '../icons'
import type { DashboardData } from '../types'
import { formatDateTime } from '../types'

type Props = Pick<DashboardData, 'warehouseStock' | 'salesStock' | 'salesStockSummary' | 'eventTimeline'>

const money = (value: number) => `₱${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

function eventIcon(type: string) {
  if (type === 'STOCK' || type === 'RELEASE') return <PackageIcon className="h-4 w-4" />
  if (type === 'SALE') return <CartIcon className="h-4 w-4" />
  if (type === 'USER') return <UserIcon className="h-4 w-4" />
  if (type === 'BOOKING' || type === 'REQUEST') return <InboxTrayIcon className="h-4 w-4" />
  if (type === 'PROJECT') return <ActivityIcon className="h-4 w-4" />
  if (type === 'WARNING' || type === 'LOW_STOCK') return <AlertIcon className="h-4 w-4" />
  return <BellIcon className="h-4 w-4" />
}

function eventTone(type: string) {
  if (type === 'STOCK' || type === 'RELEASE') return 'bg-cyan-50 text-cyan-700 ring-cyan-100'
  if (type === 'SALE') return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  if (type === 'WARNING' || type === 'LOW_STOCK') return 'bg-amber-50 text-amber-700 ring-amber-100'
  if (type === 'USER') return 'bg-violet-50 text-violet-700 ring-violet-100'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

export default function OperationsPulse({ warehouseStock, salesStock, salesStockSummary, eventTimeline }: Props) {
  const warehouseTotal = warehouseStock.reduce((sum, item) => sum + item.quantity, 0)
  const warehouseValue = warehouseStock.reduce((sum, item) => sum + item.quantity * Number(item.buyPrice || 0), 0)
  const maxWarehouse = Math.max(1, ...warehouseStock.slice(0, 6).map((item) => item.quantity))
  const maxSales = Math.max(1, ...salesStock.slice(0, 6).map((item) => item.availableQuantity))

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">Inventory intelligence</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Stock command center</h2>
          <p className="mt-1 text-xs text-slate-500">See what Warehouse holds, what Sales can sell, and what just changed.</p>
        </div>
        <Link href="/admin/stock-movements" className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 sm:inline-flex">
          Open stock ledger <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="dashboard-depth relative overflow-hidden rounded-[1.6rem] border border-cyan-100 bg-gradient-to-br from-white via-white to-cyan-50/80 p-5 shadow-[0_18px_40px_-26px_rgba(8,145,178,.5)]">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"><PackageIcon className="h-4.5 w-4.5" /></span><div><h3 className="text-sm font-black text-slate-900">Warehouse stock</h3><p className="text-[10px] font-semibold text-slate-400">Physical inventory balance</p></div></div>
            </div>
            <Link href="/admin/inventory" className="text-[10px] font-black text-cyan-700 hover:text-cyan-900">Manage →</Link>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/80 p-3 ring-1 ring-cyan-100"><div className="text-[9px] font-black uppercase tracking-wide text-slate-400">Items</div><div className="mt-1 text-xl font-black text-slate-950">{warehouseStock.length}</div></div>
            <div className="rounded-xl bg-white/80 p-3 ring-1 ring-cyan-100"><div className="text-[9px] font-black uppercase tracking-wide text-slate-400">Units</div><div className="mt-1 text-xl font-black text-cyan-700">{warehouseTotal.toLocaleString()}</div></div>
            <div className="rounded-xl bg-white/80 p-3 ring-1 ring-cyan-100"><div className="text-[9px] font-black uppercase tracking-wide text-slate-400">Value</div><div className="mt-1 truncate text-xl font-black text-slate-950">{money(warehouseValue)}</div></div>
          </div>
          <div className="relative mt-5 space-y-3">
            {warehouseStock.slice(0, 6).map((item) => <div key={item.id}>
              <div className="mb-1 flex items-center justify-between gap-3"><span className="truncate text-[11px] font-bold text-slate-700">{item.name}</span><span className={`shrink-0 text-[10px] font-black ${item.status === 'Out of Stock' ? 'text-red-600' : item.status === 'Low Stock' ? 'text-amber-600' : 'text-cyan-700'}`}>{item.quantity} {item.unit || 'pcs'}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-cyan-100"><div className={`h-full rounded-full ${item.status === 'Out of Stock' ? 'bg-red-500' : item.status === 'Low Stock' ? 'bg-amber-400' : 'bg-cyan-500'}`} style={{ width: `${Math.max(4, Math.min(100, (item.quantity / maxWarehouse) * 100))}%` }} /></div>
            </div>)}
            {warehouseStock.length === 0 && <p className="py-5 text-center text-xs text-slate-400">No warehouse stock yet.</p>}
          </div>
        </section>

        <section className="dashboard-depth relative overflow-hidden rounded-[1.6rem] border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/80 p-5 shadow-[0_18px_40px_-26px_rgba(16,185,129,.45)]">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-emerald-300/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"><CartIcon className="h-4.5 w-4.5" /></span><div><h3 className="text-sm font-black text-slate-900">Sales stock</h3><p className="text-[10px] font-semibold text-slate-400">Released, sold, and available</p></div></div><Link href="/admin/sales" className="text-[10px] font-black text-emerald-700 hover:text-emerald-900">View sales →</Link></div>
          <div className="relative mt-5 grid grid-cols-3 gap-2"><div className="rounded-xl bg-white/80 p-3 ring-1 ring-emerald-100"><div className="text-[9px] font-black uppercase tracking-wide text-slate-400">Products</div><div className="mt-1 text-xl font-black text-slate-950">{salesStockSummary.products}</div></div><div className="rounded-xl bg-white/80 p-3 ring-1 ring-emerald-100"><div className="text-[9px] font-black uppercase tracking-wide text-slate-400">Available</div><div className="mt-1 text-xl font-black text-emerald-700">{salesStockSummary.availableUnits.toLocaleString()}</div></div><div className="rounded-xl bg-white/80 p-3 ring-1 ring-emerald-100"><div className="text-[9px] font-black uppercase tracking-wide text-slate-400">Sold</div><div className="mt-1 text-xl font-black text-slate-950">{salesStockSummary.soldUnits.toLocaleString()}</div></div></div>
          <div className="relative mt-5 space-y-3">{salesStock.slice(0, 6).map((item) => <div key={item.id}><div className="mb-1 flex items-center justify-between gap-3"><span className="truncate text-[11px] font-bold text-slate-700">{item.name}</span><span className="shrink-0 text-[10px] font-black text-emerald-700">{item.availableQuantity} {item.unit || 'pcs'}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(4, Math.min(100, (item.availableQuantity / maxSales) * 100))}%` }} /></div><div className="mt-1 text-[9px] font-semibold text-slate-400">{item.soldQuantity} sold · {item.releasedQuantity} released</div></div>)}{salesStock.length === 0 && <p className="py-5 text-center text-xs text-slate-400">No Sales stock has been received yet.</p>}</div>
        </section>
      </div>

      <section className="dashboard-depth overflow-hidden rounded-[1.6rem] border border-slate-200/90 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,.52)]">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-yellow-400"><ActivityIcon className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-slate-900">System events</h3><p className="text-[10px] font-semibold text-slate-400">One timeline for activity across every department</p></div></div></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />Live feed</span></div>
        <div className="mt-5 grid gap-x-8 md:grid-cols-2">{eventTimeline.slice(0, 12).map((event) => <Link key={event.id} href={event.href} className="group flex gap-3 border-t border-slate-100 py-3.5 transition hover:bg-slate-50/70"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${eventTone(event.type)}`}>{eventIcon(event.type)}</span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><span className="truncate text-[11px] font-black text-slate-800 group-hover:text-cyan-700">{event.title}</span><span className="shrink-0 text-[9px] font-semibold text-slate-400">{formatDateTime(event.createdAt)}</span></span><span className="mt-1 block truncate text-[10px] text-slate-500">{event.description}</span><span className="mt-1 block text-[9px] font-bold text-slate-300">by {event.actor}</span></span></Link>)}{eventTimeline.length === 0 && <div className="col-span-full py-10 text-center text-xs text-slate-400">No system events yet.</div>}</div>
        <Link href="/admin/notifications" className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black text-slate-500 transition hover:text-slate-900">View full event history <ArrowRightIcon className="h-3.5 w-3.5" /></Link>
      </section>
    </div>
  )
}
