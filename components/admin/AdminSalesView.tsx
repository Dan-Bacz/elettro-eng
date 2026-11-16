'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type View = 'orders' | 'completed' | 'receipts' | 'payments' | 'warehouse-requests' | 'stock'
type Order = { id: string; reference: string; clientName: string; email?: string; status: string; total: number; shipping?: number; createdAt: string; items: { name: string; quantity: number; unit?: string | null }[] }
type Sale = { id: string; reference: string; customerName: string | null; total: number; paymentAmount: number; changeAmount: number; createdAt: string; createdBy?: { name: string } | null; items: { name: string; quantity: number }[] }
type Request = { id: string; reference: string; status: string; customerReference?: string | null; createdAt: string; items?: { requestedQuantity: number; releasedQuantity: number; inventoryItem?: { name: string } }[] }
type Stock = { id: string; name: string; sku: string | null; category: string | null; unit: string | null; sellPrice: number | null; availableQuantity: number; releasedQuantity: number; soldQuantity: number }

const money = (value: number) => `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const titles: Record<View, { title: string; subtitle: string }> = {
  orders: { title: 'Client orders', subtitle: 'All customer orders received by the Sales department.' },
  completed: { title: 'Completed orders', subtitle: 'Customer orders confirmed as received or completed.' },
  receipts: { title: 'Counter receipts', subtitle: 'Live POS receipts created by Sales staff.' },
  payments: { title: 'Payment records', subtitle: 'Cash received and change recorded for counter sales.' },
  'warehouse-requests': { title: 'Warehouse requests', subtitle: 'Materials and products requested by Sales from Warehouse.' },
  stock: { title: 'Sales stock', subtitle: 'Materials received by Sales and available for counter selling.' },
}

export default function AdminSalesView({ view }: { view: View }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [stock, setStock] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError('')
      try {
        const endpoint = view === 'warehouse-requests' ? '/api/warehouse-requests?source=SALES' : view === 'stock' || view === 'receipts' || view === 'payments' ? '/api/sales-sales' : '/api/orders'
        const response = await fetch(endpoint)
        if (!response.ok) throw new Error('Could not load this sales record.')
        const data = await response.json()
        if (!active) return
        if (view === 'warehouse-requests') setRequests(data.requests || [])
        else if (view === 'stock') setStock(data.stock || [])
        else if (view === 'receipts' || view === 'payments') setSales(data.sales || [])
        else setOrders(data.orders || [])
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Could not load this sales record.') }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [view])

  const title = titles[view]
  const filteredOrders = useMemo(() => view === 'completed' ? orders.filter((order) => order.status === 'COMPLETED') : orders, [orders, view])
  const nav = Object.entries(titles) as [View, { title: string; subtitle: string }][]

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#152b3d] to-[#08727f] p-6 text-white shadow-[0_28px_60px_-30px_rgba(15,23,42,0.85)] sm:p-8"><div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" /><div className="relative"><Link href="/admin/sales" className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 hover:text-white">← Sales overview</Link><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">{title.subtitle} This page is read-only for Admin.</p></div></section>
    <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">{nav.map(([key, item]) => <Link key={key} href={`/admin/sales/${key}`} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide ${key === view ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{item.title}</Link>)}</nav>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}
    {loading ? <div className="space-y-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />)}</div> : (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Live department record</span><h2 className="mt-1 text-sm font-black text-slate-900">{title.title}</h2></div>
        <div className="divide-y divide-slate-100">
          {view === 'stock' && stock.map((item) => <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-slate-900">{item.name}</p><p className="mt-1 text-[10px] text-slate-500">{item.sku || 'No SKU'} · {item.category || 'Uncategorized'}</p></div><div className="flex gap-6 text-right text-xs"><div><p className="text-[9px] font-black uppercase text-slate-400">Available</p><p className="font-black text-emerald-700">{item.availableQuantity} {item.unit || 'pcs'}</p></div><div><p className="text-[9px] font-black uppercase text-slate-400">Value</p><p className="font-black text-slate-900">{money(item.availableQuantity * Number(item.sellPrice || 0))}</p></div></div></div>)}
          {(view === 'receipts' || view === 'payments') && sales.map((sale) => <div key={sale.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-xs font-black text-slate-900">{sale.reference}</p><p className="mt-1 text-xs text-slate-600">{sale.items.map((item) => `${item.quantity} × ${item.name}`).join(' · ')}</p><p className="mt-1 text-[10px] text-slate-400">{sale.customerName || 'Walk-in customer'} · {new Date(sale.createdAt).toLocaleString()}</p></div><div className="text-left sm:text-right"><p className="text-lg font-black text-slate-900">{money(sale.total)}</p><p className="text-[10px] font-semibold text-slate-500">Cash {money(sale.paymentAmount)} · Change {money(sale.changeAmount)}</p><p className="text-[10px] text-slate-400">By {sale.createdBy?.name || 'Sales staff'}</p></div></div>)}
          {(view === 'orders' || view === 'completed') && filteredOrders.map((order) => <div key={order.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-xs font-black text-slate-900">{order.reference}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">{order.status.replace(/_/g, ' ')}</span></div><p className="mt-1 text-xs font-bold text-slate-700">{order.clientName}</p><p className="mt-1 text-[10px] text-slate-500">{order.items.map((item) => `${item.quantity} × ${item.name}`).join(' · ')}</p></div><div className="text-left sm:text-right"><p className="text-lg font-black text-slate-900">{money(Number(order.total) + Number(order.shipping || 0))}</p><p className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleString()}</p></div></div>)}
          {view === 'warehouse-requests' && requests.map((request) => <div key={request.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-xs font-black text-slate-900">{request.reference}</p><span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase text-amber-700">{request.status.replace(/_/g, ' ')}</span></div><p className="mt-1 text-xs text-slate-600">{request.items?.map((item) => `${item.requestedQuantity} × ${item.inventoryItem?.name || 'Material'}`).join(' · ') || 'No items'}</p></div><p className="text-[10px] text-slate-400">{new Date(request.createdAt).toLocaleString()}</p></div>)}
          {((view === 'stock' && stock.length === 0) || ((view === 'receipts' || view === 'payments') && sales.length === 0) || ((view === 'orders' || view === 'completed') && filteredOrders.length === 0) || (view === 'warehouse-requests' && requests.length === 0)) && <div className="px-6 py-16 text-center text-xs text-slate-400">No records found for this view.</div>}
        </div>
      </section>
    )}
  </div>
}
