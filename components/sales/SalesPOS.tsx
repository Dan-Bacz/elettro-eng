'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircleIcon, DocumentIcon, PackageIcon, SearchIcon } from '../admin/icons'
import type { SalesStockItem } from './SalesStock'

type SaleLine = { inventoryItemId: string; quantity: number }
const money = (value: number) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function printReceipt(sale: any) {
  const receipt = window.open('', '_blank', 'width=420,height=720')
  if (!receipt) return
  const rows = (sale.items || []).map((item: any) => `<tr><td>${item.quantity} × ${item.name}</td><td style="text-align:right">₱${Number(item.unitPrice * item.quantity).toFixed(2)}</td></tr>`).join('')
  receipt.document.write(`<html><head><title>${sale.reference}</title><style>body{font-family:Arial,sans-serif;width:320px;margin:24px auto;color:#111}h1{text-align:center;font-size:18px;margin:0}p{text-align:center;font-size:11px;color:#555}table{width:100%;border-collapse:collapse;margin:20px 0;font-size:12px}td{padding:7px 0;border-bottom:1px solid #ddd}.total{display:flex;justify-content:space-between;border-top:2px solid #111;padding-top:12px;font-weight:bold;font-size:16px}.meta{font-size:11px;color:#555;line-height:1.6}</style></head><body><h1>ELETTRO ENGINEERING</h1><p>SALES RECEIPT</p><div class="meta">Receipt: ${sale.reference}<br/>Date: ${new Date(sale.createdAt).toLocaleString()}<br/>Customer: ${sale.customerName || 'Walk-in customer'}</div><table>${rows}</table><div class="total"><span>TOTAL</span><span>₱${Number(sale.total).toFixed(2)}</span></div><p>Thank you for your purchase.</p><script>window.onload=function(){window.print()}</script></body></html>`)
  receipt.document.close()
  receipt.document.body?.insertAdjacentHTML('beforeend', `<div style="font-size:12px;line-height:1.8">Cash received: ₱${Number(sale.paymentAmount).toFixed(2)}<br/>Change: ₱${Number(sale.changeAmount).toFixed(2)}</div>`)
}

export default function SalesPOS() {
  const [stock, setStock] = useState<SalesStockItem[]>([])
  const [sale, setSale] = useState<SaleLine[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try { setLoading(true); const response = await fetch('/api/sales-sales'); if (!response.ok) throw new Error('Could not load Sales stock.'); setStock((await response.json()).stock || []) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load Sales stock.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const stockById = useMemo(() => new Map(stock.map((item) => [item.id, item])), [stock])
  const categories = useMemo(() => ['ALL', ...Array.from(new Set(stock.map((item) => item.category).filter(Boolean) as string[]))], [stock])
  const lines = sale.map((line) => ({ ...line, item: stockById.get(line.inventoryItemId) })).filter((line) => line.item)
  const total = lines.reduce((sum, line) => sum + Number(line.item?.sellPrice || 0) * line.quantity, 0)
  const payment = Number(paymentAmount)
  const hasPayment = paymentAmount.trim() !== '' && Number.isFinite(payment)
  const change = hasPayment ? Math.max(0, payment - total) : 0
  const paymentSufficient = hasPayment && payment >= total
  const filtered = stock.filter((item) => (category === 'ALL' || item.category === category) && `${item.name} ${item.sku || ''} ${item.category || ''}`.toLowerCase().includes(query.trim().toLowerCase()))

  function add(item: SalesStockItem) {
    if (!item.availableQuantity || item.sellPrice == null) return
    setError(''); setNotice('')
    setSale((current) => { const existing = current.find((line) => line.inventoryItemId === item.id); return existing ? current.map((line) => line.inventoryItemId === item.id ? { ...line, quantity: Math.min(item.availableQuantity, line.quantity + 1) } : line) : [...current, { inventoryItemId: item.id, quantity: 1 }] })
  }
  function update(id: string, quantity: number) { const max = stockById.get(id)?.availableQuantity || 0; setSale((current) => quantity < 1 ? current.filter((line) => line.inventoryItemId !== id) : current.map((line) => line.inventoryItemId === id ? { ...line, quantity: Math.min(max, quantity) } : line)) }
  function handleScan(event: React.KeyboardEvent<HTMLInputElement>) { if (event.key !== 'Enter') return; const item = stock.find((entry) => entry.sku?.toLowerCase() === query.trim().toLowerCase() || entry.name.toLowerCase() === query.trim().toLowerCase()); if (item) { add(item); setQuery('') } }
  async function completeSale(event: React.FormEvent) {
    event.preventDefault(); if (!sale.length) { setError('Scan or add at least one product.'); return }
    if (!paymentSufficient) { setError('Enter an amount equal to or greater than the sale total.'); return }
    setSaving(true); setError(''); setNotice('')
    try { const response = await fetch('/api/sales-sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: sale, customerName, customerContact, paymentAmount: payment }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not complete sale.'); setNotice(`Receipt ${data.sale.reference} saved. The print dialog is ready.`); printReceipt(data.sale); setSale([]); setCustomerName(''); setCustomerContact(''); setPaymentAmount(''); await load(); searchRef.current?.focus() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not complete sale.') }
    finally { setSaving(false) }
  }

  return <div className="space-y-5">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-end sm:justify-between sm:gap-4 xl:ml-auto xl:w-[360px]"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Complete sale &amp; print receipt</p><p className="mt-1 text-sm font-bold text-slate-700">Enter payment before completing this counter sale.</p></div><div className="mt-3 flex items-end gap-3 sm:mt-0"><label className="text-xs font-black text-slate-600">Amount received<input type="number" min="0" step="0.01" inputMode="decimal" value={paymentAmount} onChange={(event) => { setPaymentAmount(event.target.value); setError('') }} placeholder="0.00" className="mt-1 w-44 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-black outline-none focus:border-yellow-400" /></label><div className={`rounded-lg px-4 py-2.5 ${paymentSufficient ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><div className="text-[10px] font-black uppercase">Change</div><div className="text-lg font-black">{money(change)}</div></div></div></div>
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Counter open</div><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Point of Sale</h1><p className="mt-1 text-sm font-medium text-slate-500">Scan a product, take payment, and hand over the receipt.</p></div><div className="flex gap-2"><Link href="/sales/sales-receipts" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm hover:bg-slate-50"><DocumentIcon className="h-4 w-4" /> Sales receipts</Link><button type="button" onClick={() => setSale([])} disabled={!sale.length} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 disabled:opacity-40">Clear sale</button></div></div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}
    {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700"><CheckCircleIcon className="h-4 w-4" />{notice}</div>}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><SearchIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input ref={searchRef} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleScan} placeholder="Scan barcode or search product / SKU" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-xs font-bold outline-none focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-100" /></div><span className="self-center text-[11px] font-bold text-slate-400">{filtered.length} items available</span></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-black ${category === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>{item === 'ALL' ? 'All products' : item}</button>)}</div>{loading ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-52 animate-pulse rounded-xl bg-slate-100" />)}</div> : filtered.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-12 text-center"><PackageIcon className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-2 text-sm font-black text-slate-600">No products ready at the counter</p><Link href="/sales/requests" className="mt-2 inline-block text-xs font-black text-yellow-700">Request stock from Warehouse →</Link></div> : <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <button key={item.id} type="button" onClick={() => add(item)} disabled={!item.availableQuantity || item.sellPrice == null} className="group rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-yellow-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"><div className="flex h-24 items-center justify-center rounded-lg bg-slate-50 p-2">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full max-w-full object-contain group-hover:scale-105" /> : <PackageIcon className="h-9 w-9 text-slate-300" />}</div><div className="mt-3 truncate text-xs font-black text-slate-900">{item.name}</div><div className="mt-1 flex items-center justify-between gap-2"><span className="font-mono text-[10px] text-slate-400">{item.sku || 'No SKU'}</span><span className="text-xs font-black text-yellow-700">{item.sellPrice != null ? money(Number(item.sellPrice)) : 'No price'}</span></div><div className="mt-2 text-[10px] font-bold text-slate-500">{item.availableQuantity > 0 ? `${item.availableQuantity} ${item.unit || 'pcs'} ready` : 'Out of stock'}</div></button>)}</div>}</section>
      <form onSubmit={completeSale} className="sticky top-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60"><div className="bg-slate-900 px-5 py-4 text-white"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400">Checkout counter</div><h2 className="mt-1 text-lg font-black">Current sale</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black">{sale.reduce((sum, line) => sum + line.quantity, 0)} items</span></div></div><div className="max-h-[min(48vh,440px)] min-h-[180px] space-y-3 overflow-y-auto p-4">{lines.length === 0 ? <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center"><div className="text-3xl">🧾</div><p className="mt-2 text-xs font-black text-slate-700">Ready for the next customer</p><p className="mt-1 text-[10px] text-slate-400">Tap an item or scan its SKU to begin.</p></div> : lines.map(({ item, inventoryItemId, quantity }) => <div key={inventoryItemId} className="flex gap-2 border-b border-slate-100 pb-3"><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{item?.name}</div><div className="mt-1 text-[10px] text-slate-500">{money(Number(item?.sellPrice || 0))} each</div><div className="mt-1.5 flex items-center gap-1"><button type="button" onClick={() => update(inventoryItemId, quantity - 1)} className="h-6 w-6 rounded-md bg-slate-100 font-black">−</button><span className="w-6 text-center text-xs font-black">{quantity}</span><button type="button" onClick={() => update(inventoryItemId, quantity + 1)} className="h-6 w-6 rounded-md bg-slate-100 font-black">+</button></div></div><div className="text-right text-xs font-black text-slate-900">{money(Number(item?.sellPrice || 0) * quantity)}</div></div>)}</div><div className="space-y-3 border-t border-slate-100 bg-slate-50 p-4"><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name (optional)" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-yellow-400" /><input value={customerContact} onChange={(event) => setCustomerContact(event.target.value)} placeholder="Contact number (optional)" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-yellow-400" /><div className="flex items-end justify-between border-t border-slate-200 pt-3"><span className="text-xs font-bold text-slate-500">Amount due</span><span className="text-2xl font-black text-slate-900">{money(total)}</span></div><button disabled={saving || !sale.length} className="w-full rounded-xl bg-yellow-400 px-4 py-3.5 text-xs font-black text-slate-900 shadow-sm hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Saving receipt…' : 'Complete sale & print receipt'}</button><p className="text-center text-[10px] text-slate-400">The receipt is saved in Sales receipts and sent to print.</p></div></form>
    </div>
  </div>
}
