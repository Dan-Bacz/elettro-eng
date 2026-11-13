'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DocumentIcon, SearchIcon } from '../admin/icons'

type Sale = {
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

const money = (value: number) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character)

function printReceipt(sale: Sale) {
  const printWindow = window.open('', '_blank', 'width=460,height=760')
  if (!printWindow) return false

  const rows = sale.items.map((item) => `<tr><td><strong>${item.quantity} × ${escapeHtml(item.name)}</strong><small>${escapeHtml(item.unit || 'pcs')} · ${money(Number(item.unitPrice))} each</small></td><td class="amount">${money(Number(item.unitPrice) * item.quantity)}</td></tr>`).join('')
  const customer = escapeHtml(sale.customerName || 'Walk-in customer')
  const contact = sale.customerContact ? `<br/>${escapeHtml(sale.customerContact)}` : ''

  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(sale.reference)}</title><style>
    @page{size:80mm auto;margin:8mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#172033;font-family:Arial,Helvetica,sans-serif;font-size:12px}.receipt{width:100%;max-width:420px;margin:0 auto}.brand{text-align:center;border-bottom:2px solid #172033;padding-bottom:16px}.mark{display:inline-flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:12px;background:#facc15;color:#172033;font-weight:900;font-size:20px;margin-bottom:8px}.brand h1{font-size:18px;letter-spacing:.04em;margin:0;font-weight:900}.brand p{margin:5px 0 0;color:#667085;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700}.meta{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #d9dee8;padding:14px 0;color:#667085;font-size:10px;line-height:1.7}.meta strong{display:block;color:#172033;font-size:11px}.items{width:100%;border-collapse:collapse;margin:16px 0}.items th{text-align:left;color:#98a2b3;font-size:9px;text-transform:uppercase;letter-spacing:.12em;padding-bottom:8px}.items th:last-child{text-align:right}.items td{border-top:1px solid #edf0f5;padding:10px 0;vertical-align:top}.items small{display:block;color:#667085;font-size:10px;margin-top:3px}.amount{text-align:right;white-space:nowrap;font-weight:700}.summary{border-top:2px solid #172033;padding-top:10px}.line{display:flex;justify-content:space-between;padding:4px 0;color:#667085}.line strong{color:#172033}.grand{font-size:17px;padding-top:9px;margin-top:5px;border-top:1px dashed #b9c1cf}.change{margin-top:12px;border-radius:10px;background:#ecfdf3;padding:10px;color:#087443}.footer{text-align:center;border-top:1px solid #d9dee8;margin-top:18px;padding-top:16px;color:#667085;font-size:10px;line-height:1.7}.footer strong{display:block;color:#172033;font-size:11px;margin-bottom:4px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body><main class="receipt"><header class="brand"><div class="mark">E</div><h1>ELETTRO ENGINEERING</h1><p>Official Sales Receipt</p></header><section class="meta"><div><strong>Receipt</strong>${escapeHtml(sale.reference)}<br/><strong>Date</strong>${new Date(sale.createdAt).toLocaleString()}</div><div style="text-align:right"><strong>Customer</strong>${customer}${contact}</div></section><table class="items"><thead><tr><th>Item</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><section class="summary"><div class="line"><span>Subtotal</span><strong>${money(Number(sale.total))}</strong></div><div class="line"><span>Cash received</span><strong>${money(Number(sale.paymentAmount))}</strong></div><div class="line grand"><span>Total paid</span><strong>${money(Number(sale.total))}</strong></div><div class="line change"><span>Change</span><strong>${money(Number(sale.changeAmount))}</strong></div></section><footer class="footer"><strong>Thank you for your purchase.</strong>Please keep this receipt for your records.<br/>ELETTRO Engineering Enterprises</footer></main><script>window.onload=function(){window.focus();window.print()}</script></body></html>`)
  printWindow.document.close()
  return true
}

export default function SalesReceipts() {
  const [sales, setSales] = useState<Sale[]>([])
  const [preset, setPreset] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ preset })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const response = await fetch(`/api/sales-sales?${params}`)
      if (!response.ok) throw new Error('Could not load sales receipts.')
      setSales((await response.json()).sales || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sales receipts.')
    } finally {
      setLoading(false)
    }
  }, [from, preset, to])

  useEffect(() => { void load() }, [load])

  const visibleSales = useMemo(() => sales.filter((sale) => {
    const value = `${sale.reference} ${sale.customerName || ''} ${sale.items.map((item) => item.name).join(' ')}`.toLowerCase()
    return value.includes(query.trim().toLowerCase())
  }), [query, sales])
  const total = visibleSales.reduce((sum, sale) => sum + Number(sale.total), 0)

  function handlePrint(sale: Sale) {
    setNotice(printReceipt(sale) ? `Receipt ${sale.reference} is ready to print.` : 'Please allow pop-ups to print the receipt.')
  }

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8"><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl" /><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300"><span className="h-1.5 w-1.5 rounded-full bg-yellow-300" /> Receipt archive</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Sales receipts</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Professional records of every completed counter sale, ready to search, review, and print.</p></div><Link href="/sales/pos" className="inline-flex items-center justify-center rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black text-slate-900 transition hover:bg-yellow-300">New counter sale <span className="ml-2 text-base">→</span></Link></div></section>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</div>}
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto_auto_auto] lg:items-center"><div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search receipt, customer, or product" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-bold outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100" /></div><select value={preset} onChange={(event) => setPreset(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-600 outline-none"><option value="all">All dates</option><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option></select><div className="flex items-center gap-2"><input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPreset('all') }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600" /><span className="text-xs text-slate-400">to</span><input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPreset('all') }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600" /></div><div className="rounded-xl bg-slate-900 px-4 py-2.5 text-right"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Filtered sales</div><div className="text-sm font-black text-yellow-400">${money(total)}</div></div></section>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4"><div><h2 className="text-sm font-black text-slate-900">Completed transactions</h2><p className="mt-1 text-[11px] text-slate-500">{visibleSales.length} receipt{visibleSales.length === 1 ? '' : 's'} · Newest first</p></div><div className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">Paid and recorded</div></div>{loading ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div> : visibleSales.length === 0 ? <div className="px-6 py-16 text-center"><DocumentIcon className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-4 text-sm font-black text-slate-700">No sales receipts found</p><p className="mt-1 text-xs text-slate-400">Completed counter sales will appear here.</p></div> : <div className="divide-y divide-slate-100">{visibleSales.map((sale) => <article key={sale.id} className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700"><DocumentIcon className="h-5 w-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-mono text-xs font-black text-slate-900">{sale.reference}</h3><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700">Paid</span></div><p className="mt-2 truncate text-xs text-slate-600">{sale.items.map((item) => `${item.quantity} × ${item.name}`).join(' · ')}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{sale.customerName || 'Walk-in customer'} · {new Date(sale.createdAt).toLocaleString()}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Cash ${money(Number(sale.paymentAmount))} · Change ${money(Number(sale.changeAmount))}</p></div></div><div className="flex items-center justify-between gap-5 sm:justify-end"><div className="text-right"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total</div><div className="text-lg font-black text-slate-900">${money(Number(sale.total))}</div></div><button type="button" onClick={() => handlePrint(sale)} className="rounded-xl bg-slate-900 px-3.5 py-2.5 text-[10px] font-black text-white shadow-sm transition hover:bg-slate-700">Print receipt</button></div></article>)}</div>}</section>
  </div>
}

