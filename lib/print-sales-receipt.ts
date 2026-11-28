export type PrintableSale = {
  reference: string
  customerName: string | null
  customerContact: string | null
  total: number
  paymentAmount: number
  changeAmount: number
  createdAt: string
  createdBy?: { name: string } | null
  items: { name: string; quantity: number; unit: string | null; unitPrice: number }[]
}

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => entities[character])

export function openSalesReceiptWindow() {
  const receipt = window.open('about:blank', '_blank', 'width=780,height=900')
  if (receipt) {
    receipt.opener = null
    receipt.document.title = 'Preparing sales receipt'
    receipt.document.body.textContent = 'Preparing sales receipt...'
  }
  return receipt
}

export function printSalesReceipt(sale: PrintableSale, receipt: Window | null): boolean {
  if (!receipt || receipt.closed) return false

  const rows = sale.items.map((item) => `<tr>
    <th scope="row">${escapeHtml(item.name)}</th>
    <td>${Number(item.quantity)} ${escapeHtml(item.unit || 'pcs')}</td>
    <td class="amount">${money.format(item.unitPrice)}</td>
    <td class="amount">${money.format(item.unitPrice * item.quantity)}</td>
  </tr>`).join('')
  const reference = escapeHtml(sale.reference)
  const logo = escapeHtml(new URL('/logo-elettro.jpg', window.location.origin).href)
  const stylesheet = escapeHtml(new URL('/print-document.css', window.location.origin).href)

  receipt.document.open()
  receipt.document.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sales Receipt ${reference}</title><link rel="stylesheet" href="${stylesheet}">
<style>
  body { margin: 0; background: white; color: #111; font: 10pt/1.4 Arial, sans-serif; }
  main { max-width: 180mm; margin: auto; }
  .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2mm 5mm; margin: 0 0 5mm; }
  dt { font-size: 8pt; font-weight: bold; }
  dd { margin: 0; overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
  thead { display: table-header-group; }
  th, td { border-bottom: 1px solid #bbb; padding: 2mm 1.5mm; text-align: left; overflow-wrap: anywhere; }
  thead th { border-block: 1px solid #555; }
  thead th:first-child { width: 40%; }
  .amount { text-align: right; }
  .totals { margin: 5mm 0 0 auto; max-width: 70mm; }
  .totals div { display: flex; justify-content: space-between; gap: 4mm; padding: 1mm 0; }
  .totals .total { border-bottom: 1px solid #555; font-weight: bold; }
  header, tr, .totals { break-inside: avoid; }
  @media screen {
    main { padding: 24px; }
    .elettro-letterhead { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #222; }
    .elettro-letterhead-company { font-weight: bold; }
  }
</style></head><body><main>
<header>
  <div class="elettro-letterhead">
    <img src="${logo}" class="sales-letterhead-logo" width="56" height="56" alt="">
    <p class="elettro-letterhead-company">ELETTRO Engineering Enterprises</p>
  </div>
  <h1 class="elettro-document-title">Sales Receipt</h1>
  <dl class="meta">
    <div><dt>Receipt reference</dt><dd>${reference}</dd></div>
    <div><dt>Issued on</dt><dd>${new Date(sale.createdAt).toLocaleString()}</dd></div>
    <div><dt>Customer</dt><dd>${escapeHtml(sale.customerName || 'Walk-in customer')}</dd></div>
    <div><dt>Sales Department Officer</dt><dd>${escapeHtml(sale.createdBy?.name || 'Sales staff')}</dd></div>
    ${sale.customerContact ? `<div><dt>Customer contact</dt><dd>${escapeHtml(sale.customerContact)}</dd></div>` : ''}
  </dl>
</header>
<table>
  <thead><tr><th scope="col">Material</th><th scope="col">Quantity</th><th scope="col" class="amount">Unit price</th><th scope="col" class="amount">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<dl class="totals">
  <div class="total"><dt>Total paid</dt><dd>${money.format(sale.total)}</dd></div>
  <div><dt>Cash received</dt><dd>${money.format(sale.paymentAmount)}</dd></div>
  <div><dt>Change</dt><dd>${money.format(sale.changeAmount)}</dd></div>
</dl>
</main></body></html>`)
  receipt.addEventListener('load', () => {
    receipt.focus()
    receipt.print()
  }, { once: true })
  receipt.document.close()
  return true
}
