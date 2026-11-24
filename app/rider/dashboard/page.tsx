'use client'

import { useEffect, useMemo, useState } from 'react'

type Order = {
  id: string
  reference: string
  trackingNumber: string
  clientName?: string
  deliveryAddress?: string
  deliveryStatus: string
  updatedAt: string
  items?: { name: string; quantity: number; unit?: string }[]
}

const statusLabel = (status: string) => status.replace(/_/g, ' ')
const statusTone = (status: string) => status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : status === 'DELIVERY_FAILED' || status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'

export default function RiderDashboardPage() {
  const [rider, setRider] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<any>({ today: 0, pending: 0, inTransit: 0, completed: 0, failed: 0 })
  const [section, setSection] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/rider')
      if (!res.ok) throw new Error('Unable to load rider dashboard')
      const data = await res.json()
      setRider(data.rider); setOrders(data.orders || []); setStats(data.stats || stats)
    } catch (error: any) { setNotice(error.message || 'Unable to load rider dashboard') } finally { setLoading(false) }
  }

  useEffect(() => {
    const sync = () => setSection(window.location.hash.replace(/^#/, '') || 'dashboard')
    sync(); window.addEventListener('hashchange', sync); load()
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  async function updateStatus(orderId: string, status: string, reason?: string) {
    setBusy(orderId); setNotice('')
    try {
      const res = await fetch('/api/rider', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, status, reason }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to update delivery')
      setNotice('Delivery status updated.'); await load()
    } catch (error: any) { setNotice(error.message || 'Unable to update delivery') } finally { setBusy(null) }
  }

  const active = useMemo(() => orders.filter((order) => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.deliveryStatus)), [orders])
  if (loading) return <div className="min-h-screen bg-[#f5f7fa] p-6"><div className="mx-auto h-40 max-w-6xl animate-pulse rounded-3xl bg-slate-200" /></div>

  return <div className="min-h-screen bg-[#f5f7fa] text-slate-900"><aside className="fixed inset-y-0 left-0 hidden w-72 flex-col bg-slate-950 p-6 text-white lg:flex"><div className="text-xl font-black tracking-tight">ELETTRO<span className="text-yellow-400">.</span></div><p className="mt-1 text-xs text-slate-400">Delivery operations</p><div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-400 font-black text-black">{rider?.name?.charAt(0) || 'R'}</div><p className="mt-3 truncate text-sm font-black">{rider?.name || 'Rider'}</p><p className="text-xs text-slate-400">Rider account</p></div><nav className="mt-8 space-y-2">{[['dashboard','Dashboard'],['deliveries','My Deliveries'],['profile','My Profile']].map(([key,label]) => <a key={key} href={`#${key}`} className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${section === key ? 'bg-yellow-400 text-black' : 'text-slate-300 hover:bg-white/10'}`}>{label}</a>)}<a href="elettro://logout" className="mt-8 block rounded-xl px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10">Sign out</a></nav></aside><main className="lg:ml-72"><header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur sm:px-8"><div className="mx-auto flex max-w-6xl items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-yellow-600">Rider portal</p><h1 className="text-xl font-black sm:text-2xl">{section === 'deliveries' ? 'My Deliveries' : section === 'profile' ? 'My Profile' : 'Delivery Dashboard'}</h1></div><a href="elettro://logout" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 lg:hidden">Sign out</a></div></header><div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">{notice && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{notice}</div>}{section === 'profile' ? <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 text-3xl font-black">{rider?.name?.charAt(0) || 'R'}</div><h2 className="mt-5 text-2xl font-black">{rider?.name}</h2><p className="mt-1 text-sm text-slate-500">{rider?.email}</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-400">Role</p><p className="mt-1 font-black">Rider</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-400">Access</p><p className="mt-1 font-black">Android app only</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-400">Status</p><p className="mt-1 font-black text-emerald-600">Active</p></div></div></section> : <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Today',stats.today,'text-cyan-600'],['Pending',stats.pending,'text-amber-600'],['In transit',stats.inTransit,'text-violet-600'],['Completed',stats.completed,'text-emerald-600']].map(([label,value,tone]) => <div key={String(label)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-3 text-4xl font-black ${tone}`}>{value}</p></div>)}</section><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-yellow-600">Field queue</p><h2 className="mt-1 text-2xl font-black">{section === 'deliveries' ? 'All assigned deliveries' : 'Active deliveries'}</h2></div><a href="#deliveries" className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-yellow-400">View all</a></div><div className="mt-6 space-y-3">{(section === 'deliveries' ? orders : active).map((order) => <article key={order.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-yellow-400"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black text-slate-400">{order.reference} · {order.trackingNumber}</p><h3 className="mt-1 text-base font-black">{order.clientName || 'Customer delivery'}</h3><p className="mt-1 text-xs text-slate-500">{order.deliveryAddress || 'Delivery address available in order details'}</p></div><span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${statusTone(order.deliveryStatus)}`}>{statusLabel(order.deliveryStatus)}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{(order.items || []).map((item) => `${item.quantity} ${item.unit || 'pcs'} ${item.name}`).join(' · ') || 'Order items'}</p>{['ASSIGNED','PREPARING_DISPATCH'].includes(order.deliveryStatus) && <button disabled={busy === order.id} onClick={() => updateStatus(order.id, 'IN_TRANSIT')} className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-black text-black disabled:opacity-50">{busy === order.id ? 'Updating…' : 'Start delivery'}</button>}{order.deliveryStatus === 'IN_TRANSIT' && <button disabled={busy === order.id} onClick={() => updateStatus(order.id, 'DELIVERY_FAILED', 'Unable to complete delivery')} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-50">Report issue</button>}</div></article>)}{(section === 'deliveries' ? orders : active).length === 0 && <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">No deliveries assigned yet.</div>}</div></section></>}</div></main></div>
}
