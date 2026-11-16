'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '../../../../components/admin/PageHeader'
import EmptyState from '../../../../components/admin/EmptyState'
import { ActivityIcon, CartIcon, CheckCircleIcon, PackageIcon, SearchIcon } from '../../../../components/admin/icons'

type Tab = 'ALL' | 'SALES' | 'WAREHOUSE' | 'ORDERS'
type Operations = {
  syncedAt: string
  summary: { warehouseItems: number; warehouseUnits: number; lowStock: number; salesTransactions: number; salesRevenue: number; warehouseReleases: number; clientOrders: number; pendingOrders: number }
  inventory: { id: string; name: string; sku: string | null; quantity: number; unit: string | null; reorderLevel: number }[]
  sales: { id: string; reference: string; customerName: string | null; total: number; createdAt: string; createdBy: { name: string }; items: { name: string; quantity: number }[] }[]
  movements: { id: string; type: string; quantity: number; stockBefore: number; stockAfter: number; reason: string | null; createdAt: string; inventoryItem: { name: string; sku: string | null }; worker: { name: string; role: string }; request: { reference: string; source: string } | null; release: { receiptNumber: string } | null }[]
  releases: { id: string; receiptNumber: string; createdAt: string; releasedBy: { name: string }; salesRecipient: { name: string } | null; request: { reference: string; source: string; status: string; order: { clientName: string } | null }; items: { quantity: number; requestItem: { inventoryItem: { name: string; unit: string | null } } }[] }[]
  orders: { id: string; clientName: string; status: string; total: number; createdAt: string; items: { name: string; quantity: number }[] }[]
}

const money = (value: number) => `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateTime = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function AdminOperationsPage() {
  const router = useRouter()
  const [data, setData] = useState<Operations | null>(null)
  const [tab, setTab] = useState<Tab>('ALL')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (manual = false) => {
    if (manual) setSyncing(true)
    try {
      const response = await fetch('/api/admin/operations', { cache: 'no-store' })
      if (response.status === 401) { router.push('/admin/login'); return }
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not synchronize records')
      setData(payload)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not synchronize records')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  const search = query.trim().toLowerCase()
  const filteredSales = useMemo(() => data?.sales.filter((sale) => !search || sale.reference.toLowerCase().includes(search) || (sale.customerName || '').toLowerCase().includes(search) || sale.items.some((item) => item.name.toLowerCase().includes(search))) || [], [data, search])
  const filteredMovements = useMemo(() => data?.movements.filter((movement) => !search || movement.inventoryItem.name.toLowerCase().includes(search) || movement.worker.name.toLowerCase().includes(search) || (movement.reason || '').toLowerCase().includes(search) || (movement.release?.receiptNumber || '').toLowerCase().includes(search)) || [], [data, search])
  const filteredOrders = useMemo(() => data?.orders.filter((order) => !search || order.clientName.toLowerCase().includes(search) || order.items.some((item) => item.name.toLowerCase().includes(search))) || [], [data, search])

  if (loading && !data) return <div className="space-y-4"><div className="h-28 animate-pulse rounded-3xl bg-slate-200/70" /><div className="h-96 animate-pulse rounded-3xl bg-slate-200/70" /></div>

  const summary = data?.summary
  const cards = [
    { label: 'Sales revenue', value: money(summary?.salesRevenue || 0), detail: `${summary?.salesTransactions || 0} POS transactions`, tone: 'from-amber-400 to-orange-500', icon: <CartIcon className="h-5 w-5" /> },
    { label: 'Warehouse stock', value: (summary?.warehouseUnits || 0).toLocaleString(), detail: `${summary?.warehouseItems || 0} products/materials`, tone: 'from-sky-400 to-blue-600', icon: <PackageIcon className="h-5 w-5" /> },
    { label: 'Warehouse releases', value: (summary?.warehouseReleases || 0).toLocaleString(), detail: 'Audited handovers', tone: 'from-emerald-400 to-teal-600', icon: <CheckCircleIcon className="h-5 w-5" /> },
    { label: 'Client orders', value: (summary?.clientOrders || 0).toLocaleString(), detail: `${summary?.pendingOrders || 0} pending review`, tone: 'from-violet-400 to-purple-600', icon: <ActivityIcon className="h-5 w-5" /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader icon={<ActivityIcon className="h-5 w-5" />} title="Operations command center" subtitle="One read-only view of Sales, Warehouse, and client activity." actions={<button onClick={() => void load(true)} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-yellow-300 shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:opacity-60"><ActivityIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing…' : 'Sync all records'}</button>} />
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-[#182b35] p-5 text-white shadow-xl shadow-slate-900/10 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">Live department sync</div><h2 className="max-w-2xl text-2xl font-black tracking-tight sm:text-3xl">Every sale, release, and stock movement in one place.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Admin has visibility across departments while inventory changes remain controlled by Warehouse and transactions remain recorded by Sales.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300"><span className="block font-black uppercase tracking-wide text-emerald-300">Last synchronized</span><span className="mt-1 block font-semibold">{data?.syncedAt ? dateTime(data.syncedAt) : 'Not yet synced'}</span></div></div>
      </div>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.tone}`} /><div className="flex items-start justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{card.label}</div><div className="mt-2 text-2xl font-black text-slate-900">{card.value}</div><div className="mt-1 text-xs font-semibold text-slate-400">{card.detail}</div></div><div className={`rounded-xl bg-gradient-to-br ${card.tone} p-3 text-white shadow-lg`}>{card.icon}</div></div></div>)}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{([['ALL', 'Overview'], ['SALES', 'Sales transactions'], ['WAREHOUSE', 'Warehouse activity'], ['ORDERS', 'Client orders']] as [Tab, string][]).map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`rounded-xl px-3 py-2 text-xs font-black transition ${tab === value ? 'bg-slate-950 text-yellow-300 shadow' : 'text-slate-500 hover:bg-slate-100'}`}>{label}</button>)}</div><div className="relative w-full lg:max-w-sm"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions, products, clients…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" /></div></div></div>
      {(tab === 'ALL' || tab === 'SALES') && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Sales transaction ledger</h2><p className="mt-1 text-xs text-slate-400">POS sales recorded by Sales officers. Admin view only.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700">{filteredSales.length} records</span></div>{filteredSales.length === 0 ? <EmptyState icon={<CartIcon className="h-5 w-5" />} title="No Sales transactions" message="Completed Sales POS transactions will appear here after synchronization." /> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-3">Reference</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Recorded by</th><th className="px-3 py-3">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredSales.slice(0, 50).map((sale) => <tr key={sale.id} className="hover:bg-amber-50/40"><td className="px-3 py-3 font-black text-slate-800">{sale.reference}</td><td className="px-3 py-3 text-slate-600">{sale.customerName || 'Walk-in customer'}</td><td className="max-w-[240px] truncate px-3 py-3 text-slate-500">{sale.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</td><td className="px-3 py-3 font-black text-amber-700">{money(sale.total)}</td><td className="px-3 py-3 font-semibold text-slate-600">{sale.createdBy.name}</td><td className="px-3 py-3 text-slate-400">{dateTime(sale.createdAt)}</td></tr>)}</tbody></table></div>}</section>}
      {(tab === 'ALL' || tab === 'WAREHOUSE') && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Warehouse activity ledger</h2><p className="mt-1 text-xs text-slate-400">Receipts, releases, adjustments, responsible staff, and references.</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black text-sky-700">{filteredMovements.length} movements</span></div>{filteredMovements.length === 0 ? <EmptyState icon={<PackageIcon className="h-5 w-5" />} title="No warehouse activity" message="Warehouse stock activity will appear here." /> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Material / product</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Change</th><th className="px-3 py-3">Stock</th><th className="px-3 py-3">Staff</th><th className="px-3 py-3">Reference</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredMovements.slice(0, 50).map((movement) => <tr key={movement.id} className="hover:bg-sky-50/40"><td className="px-3 py-3 text-slate-400">{dateTime(movement.createdAt)}</td><td className="px-3 py-3 font-bold text-slate-800">{movement.inventoryItem.name}<span className="block text-[10px] font-normal text-slate-400">{movement.inventoryItem.sku || 'No SKU'}</span></td><td className="px-3 py-3 font-bold text-slate-600">{movement.type.replace(/_/g, ' ')}</td><td className={`px-3 py-3 font-black ${movement.quantity < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</td><td className="px-3 py-3 text-slate-600">{movement.stockBefore} → {movement.stockAfter}</td><td className="px-3 py-3 font-semibold text-slate-600">{movement.worker.name}<span className="block text-[10px] font-normal text-slate-400">{movement.worker.role}</span></td><td className="px-3 py-3 text-slate-500">{movement.release?.receiptNumber || movement.request?.reference || '—'}</td></tr>)}</tbody></table></div>}</section>}
      {(tab === 'ALL' || tab === 'ORDERS') && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Client order pipeline</h2><p className="mt-1 text-xs text-slate-400">Orders from clients and their current Sales/Warehouse status.</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black text-violet-700">{filteredOrders.length} orders</span></div>{filteredOrders.length === 0 ? <EmptyState icon={<ActivityIcon className="h-5 w-5" />} title="No client orders" message="Client product/material orders will appear here." /> : <div className="grid gap-3 lg:grid-cols-2">{filteredOrders.slice(0, 20).map((order) => <div key={order.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black text-slate-800">{order.clientName}</div><div className="mt-1 text-[10px] text-slate-400">{dateTime(order.createdAt)}</div></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-600 shadow-sm">{order.status.replace(/_/g, ' ')}</span></div><div className="mt-3 text-xs text-slate-600">{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</div><div className="mt-3 border-t border-slate-200 pt-3 text-right text-sm font-black text-violet-700">{money(order.total)}</div></div>)}</div>}</section>}
      {(tab === 'ALL' || tab === 'WAREHOUSE') && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Warehouse stock snapshot</h2><p className="mt-1 text-xs text-slate-400">Read-only stock visibility. Additions and adjustments stay with Warehouse.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">{summary?.lowStock || 0} low stock</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(data?.inventory || []).slice(0, 12).map((item) => <div key={item.id} className="rounded-xl border border-slate-100 p-3"><div className="truncate text-xs font-black text-slate-800">{item.name}</div><div className="mt-2 flex items-end justify-between"><span className={`text-lg font-black ${item.quantity <= item.reorderLevel ? 'text-amber-600' : 'text-emerald-700'}`}>{item.quantity}</span><span className="text-[10px] font-bold text-slate-400">{item.unit || 'pcs'} · {item.sku || 'No SKU'}</span></div></div>)}</div></section>}
    </div>
  )
}
