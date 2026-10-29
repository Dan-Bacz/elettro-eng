'use client'

import Link from 'next/link'

type Item = { id: string; name: string; quantity: number; reorderLevel: number; sku?: string | null; unit?: string | null }

export default function StockHealthPanel({ items }: { items: Item[] }) {
  const healthy = items.filter((item) => item.quantity > item.reorderLevel).length
  const low = items.filter((item) => item.quantity > 0 && item.quantity <= item.reorderLevel).length
  const out = items.filter((item) => item.quantity <= 0).length
  const total = Math.max(1, items.length)
  const healthyPct = healthy / total * 100
  const lowPct = low / total * 100
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Inventory health</p><h2 className="mt-1 text-lg font-black text-slate-900">Stock overview</h2><p className="mt-1 text-xs text-slate-500">Live status against each product&apos;s reorder threshold.</p></div><Link href="/warehouse/inventory" className="text-xs font-black text-yellow-700 hover:underline">View inventory →</Link></div>
      <div className="mt-5 flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(#22c55e 0 ${healthyPct}%, #f59e0b ${healthyPct}% ${healthyPct + low / total * 100}%, #ef4444 ${healthyPct + low / total * 100}% 100%)` }}><div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white"><strong className="text-2xl font-black text-slate-900">{items.length}</strong><span className="text-[9px] font-bold uppercase text-slate-400">Products</span></div></div>
        <div className="grid flex-1 gap-3 text-xs"><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-bold text-slate-600"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />In stock</span><strong className="text-slate-900">{healthy} <span className="font-medium text-slate-400">({Math.round(healthy / total * 100)}%)</span></strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-bold text-slate-600"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" />Low stock</span><strong className="text-slate-900">{low} <span className="font-medium text-slate-400">({Math.round(low / total * 100)}%)</span></strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-bold text-slate-600"><i className="h-2.5 w-2.5 rounded-full bg-red-500" />Out of stock</span><strong className="text-slate-900">{out} <span className="font-medium text-slate-400">({Math.round(out / total * 100)}%)</span></strong></div></div>
      </div>
    </section>
  )
}
