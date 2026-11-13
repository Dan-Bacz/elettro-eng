'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { CheckCircleIcon, DocumentIcon, PackageIcon, SearchIcon } from '../admin/icons'
import type { SalesStockItem } from './SalesStock'

type SaleLine = { inventoryItemId: string; quantity: number }
const money = (value: number) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function printReceipt(sale: any) {
  const receipt = window.open('', '_blank', 'width=420,height=720')
  if (!receipt) return
  const rows = (sale.items || []).map((item: any) => `<tr><td>${item.quantity} × ${item.name}</td><td style="text-align:right">₱${Number(item.unitPrice * item.quantity).toFixed(2)}</td></tr>`).join('')
  receipt.document.write(`<html><head><title>${sale.reference}</title><style>body{font-family:Arial,sans-serif;width:320px;margin:24px auto;color:#111}h1{text-align:center;font-size:18px;margin:0}p{text-align:center;font-size:11px;color:#555}table{width:100%;border-collapse:collapse;margin:20px 0;font-size:12px}td{padding:7px 0;border-bottom:1px solid #ddd}.total{display:flex;justify-content:space-between;border-top:2px solid #111;padding-top:12px;font-weight:bold;font-size:16px}.meta{font-size:11px;color:#555;line-height:1.6}.payment{font-size:12px;line-height:1.8;margin-top:14px}</style></head><body><h1>ELETTRO ENGINEERING</h1><p>SALES RECEIPT</p><div class="meta">Receipt: ${sale.reference}<br/>Date: ${new Date(sale.createdAt).toLocaleString()}<br/>Customer: ${sale.customerName || 'Walk-in customer'}</div><table>${rows}</table><div class="total"><span>TOTAL</span><span>₱${Number(sale.total).toFixed(2)}</span></div><div class="payment">Cash received: ₱${Number(sale.paymentAmount).toFixed(2)}<br/>Change: ₱${Number(sale.changeAmount).toFixed(2)}</div><p>Thank you for your purchase.</p><script>window.onload=function(){window.print()}</script></body></html>`)
  receipt.document.close()
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
    try {
      setLoading(true)
      const response = await fetch('/api/sales-sales')
      if (!response.ok) throw new Error('Could not load Sales stock.')
      setStock((await response.json()).stock || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Sales stock.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const stockById = useMemo(() => new Map(stock.map((item) => [item.id, item])), [stock])
  const categories = useMemo(() => ['ALL', ...Array.from(new Set(stock.map((item) => item.category).filter(Boolean) as string[]))], [stock])
  const lines = sale.map((line) => ({ ...line, item: stockById.get(line.inventoryItemId) })).filter((line) => line.item)
  const total = lines.reduce((sum, line) => sum + Number(line.item?.sellPrice || 0) * line.quantity, 0)
  const itemCount = sale.reduce((sum, line) => sum + line.quantity, 0)
  const payment = Number(paymentAmount)
  const hasPayment = paymentAmount.trim() !== '' && Number.isFinite(payment)
  const change = hasPayment ? Math.max(0, payment - total) : 0
  const paymentSufficient = hasPayment && payment >= total
  const filtered = stock.filter((item) => (category === 'ALL' || item.category === category) && `${item.name} ${item.sku || ''} ${item.category || ''}`.toLowerCase().includes(query.trim().toLowerCase()))

  function add(item: SalesStockItem) {
    if (!item.availableQuantity || item.sellPrice == null) return
    setError(''); setNotice('')
    setSale((current) => {
      const existing = current.find((line) => line.inventoryItemId === item.id)
      return existing ? current.map((line) => line.inventoryItemId === item.id ? { ...line, quantity: Math.min(item.availableQuantity, line.quantity + 1) } : line) : [...current, { inventoryItemId: item.id, quantity: 1 }]
    })
  }
  function update(id: string, quantity: number) {
    const max = stockById.get(id)?.availableQuantity || 0
    setSale((current) => quantity < 1 ? current.filter((line) => line.inventoryItemId !== id) : current.map((line) => line.inventoryItemId === id ? { ...line, quantity: Math.min(max, quantity) } : line))
  }
  function handleScan(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    const item = stock.find((entry) => entry.sku?.toLowerCase() === query.trim().toLowerCase() || entry.name.toLowerCase() === query.trim().toLowerCase())
    if (item) { add(item); setQuery('') }
  }
  async function completeSale(event: FormEvent) {
    event.preventDefault()
    if (!sale.length) { setError('Scan or add at least one product.'); return }
    if (!paymentSufficient) { setError('Enter an amount equal to or greater than the sale total.'); return }
    setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/sales-sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: sale, customerName, customerContact, paymentAmount: payment }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not complete sale.')
      setNotice(`Receipt ${data.sale.reference} saved. The print dialog is ready.`)
      printReceipt(data.sale); setSale([]); setCustomerName(''); setCustomerContact(''); setPaymentAmount(''); await load(); searchRef.current?.focus()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not complete sale.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-200 sm:px-7">
        <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Sales counter online</div><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Point of Sale</h1><p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-300">Find an available product, collect payment, and print a polished receipt.</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/sales/sales-receipts" className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"><DocumentIcon className="h-4 w-4" /> Sales receipts</Link><button type="button" onClick={() => { setSale([]); setError('') }} disabled={!sale.length} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">Clear counter</button></div>
        </div>
        <div className="relative mt-6 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ready stock</div><div className="mt-1 text-xl font-black">{stock.length}</div></div><div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cart items</div><div className="mt-1 text-xl font-black">{itemCount}</div></div><div className="col-span-2 rounded-2xl bg-yellow-400 p-3 text-slate-950 sm:col-span-1"><div className="text-[10px] font-black uppercase tracking-wider text-slate-700">Current total</div><div className="mt-1 text-xl font-black">{money(total)}</div></div></div>
      </section>

      {error && <div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100">!</span>{error}</div>}
      {notice && <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700"><CheckCircleIcon className="h-5 w-5 shrink-0" />{notice}</div>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600">Product catalogue</div><h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Choose products</h2><p className="mt-1 text-xs font-medium text-slate-500">Only stock received by Sales is shown at the counter.</p></div><div className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-500">{filtered.length} available</div></div><div className="relative mt-5"><SearchIcon className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" /><input ref={searchRef} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleScan} placeholder="Scan barcode or search name, SKU, or category" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-xs font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100" /></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-black transition ${category === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{item === 'ALL' ? 'All products' : item}</button>)}</div></div>
          <div className="bg-slate-50/70 p-5 sm:p-6">{loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />)}</div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><PackageIcon className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">No products ready at the counter</p><p className="mt-1 text-xs font-medium text-slate-400">Try another search or request stock from Warehouse.</p><Link href="/sales/requests" className="mt-4 inline-block rounded-lg bg-yellow-100 px-3 py-2 text-xs font-black text-yellow-800 hover:bg-yellow-200">Request stock</Link></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <button key={item.id} type="button" onClick={() => add(item)} disabled={!item.availableQuantity || item.sellPrice == null} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-100/60 disabled:cursor-not-allowed disabled:opacity-50"><div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-white p-4"><span className="absolute left-3 top-3 rounded-full bg-white/85 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 shadow-sm">{item.category || 'Product'}</span>{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="h-full max-w-full object-contain transition duration-300 group-hover:scale-110" /> : <PackageIcon className="h-12 w-12 text-slate-300" />}</div><div className="p-4"><div className="truncate text-sm font-black text-slate-900">{item.name}</div><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate font-mono text-[10px] text-slate-400">{item.sku || 'No SKU'}</span><span className="shrink-0 text-sm font-black text-yellow-700">{item.sellPrice != null ? money(Number(item.sellPrice)) : 'No price'}</span></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className={`text-[10px] font-black ${item.availableQuantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{item.availableQuantity > 0 ? `${item.availableQuantity} ${item.unit || 'pcs'} ready` : 'Out of stock'}</span><span className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-black text-white transition group-hover:bg-yellow-400 group-hover:text-slate-950">Add</span></div></div></button>)}</div>}</div>
        </section>

        <form onSubmit={completeSale} className="sticky top-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-slate-900 px-5 py-5 text-white sm:px-6"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">Checkout</div><h2 className="mt-1 text-xl font-black">Current sale</h2><p className="mt-1 text-xs font-medium text-slate-400">Review the basket before completing.</p></div><div className="rounded-2xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/10"><div className="text-lg font-black">{itemCount}</div><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">items</div></div></div></div>
          <div className="max-h-[min(46vh,460px)] min-h-[190px] space-y-3 overflow-y-auto p-5 sm:p-6">{lines.length === 0 ? <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">🛒</div><p className="mt-3 text-xs font-black text-slate-700">Ready for the next customer</p><p className="mt-1 max-w-[210px] text-[10px] font-medium leading-5 text-slate-400">Tap a product or scan its SKU to add it to this sale.</p></div> : lines.map(({ item, inventoryItemId, quantity }) => <div key={inventoryItemId} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">{item?.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <PackageIcon className="h-6 w-6 text-slate-300" />}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-slate-800">{item?.name}</div><div className="mt-1 text-[10px] font-medium text-slate-500">{money(Number(item?.sellPrice || 0))} each</div><div className="mt-2 flex items-center gap-1"><button type="button" aria-label={`Decrease ${item?.name}`} onClick={() => update(inventoryItemId, quantity - 1)} className="h-6 w-6 rounded-lg bg-white font-black text-slate-600 shadow-sm hover:bg-slate-200">−</button><span className="w-7 text-center text-xs font-black">{quantity}</span><button type="button" aria-label={`Increase ${item?.name}`} onClick={() => update(inventoryItemId, quantity + 1)} className="h-6 w-6 rounded-lg bg-white font-black text-slate-600 shadow-sm hover:bg-slate-200">+</button></div></div><div className="shrink-0 text-right text-xs font-black text-slate-900">{money(Number(item?.sellPrice || 0) * quantity)}</div></div>)}</div>
          <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Customer name <span className="font-medium normal-case tracking-normal text-slate-400">optional</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Walk-in customer" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" /></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Contact number <span className="font-medium normal-case tracking-normal text-slate-400">optional</span><input value={customerContact} onChange={(event) => setCustomerContact(event.target.value)} placeholder="09XX XXX XXXX" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" /></label></div>
            <div className="flex items-end justify-between border-y border-slate-200 py-4"><span className="text-xs font-bold text-slate-500">Amount due</span><span className="text-2xl font-black text-slate-950">{money(total)}</span></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Payment summary</div><div className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-600">Cash sale</div></div><label className="block text-xs font-black text-slate-600">Amount received<div className="relative mt-1.5"><span className="pointer-events-none absolute left-3 top-2.5 text-xs font-black text-slate-400">₱</span><input type="number" min="0" step="0.01" inputMode="decimal" value={paymentAmount} onChange={(event) => { setPaymentAmount(event.target.value); setError('') }} placeholder="0.00" className="w-full rounded-xl border border-slate-200 py-2.5 pl-7 pr-3 text-sm font-black text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" /></div></label><div className={`mt-3 flex items-center justify-between rounded-xl px-3 py-3 ${paymentSufficient ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className="text-xs font-black">Change</span><span className="text-lg font-black">{money(change)}</span></div></div>
            <button disabled={saving || !sale.length} className="w-full rounded-2xl bg-yellow-400 px-4 py-4 text-xs font-black text-slate-950 shadow-lg shadow-yellow-200/60 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Saving receipt...' : 'Complete sale & print receipt'}</button><p className="text-center text-[10px] font-medium text-slate-400">The receipt is saved in Sales receipts and sent to print automatically.</p>
          </div>
        </form>
      </div>
    </div>
  )
}

