import type { OrderObj } from '../admin/types'
import SalesLetterhead from './SalesLetterhead'

type PrintSelection =
  | { kind: 'list'; orders: OrderObj[]; criteria: string[] }
  | { kind: 'order'; order: OrderObj }

const money = (amount: number) => amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })
const date = (value: string) => new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const label = (value?: string | null) => value ? value.replaceAll('_', ' ').toLowerCase() : 'Not specified'
const orderTotal = (order: OrderObj) => Number(order.total || 0) + Number(order.shipping || 0)

export default function SalesOrderPrint({ selection }: { selection: PrintSelection }) {
  const order = selection.kind === 'order' ? selection.order : null
  return (
    <section className="sales-orders-print hidden">
      <style jsx global>{`
        @media print {
          html:has(.sales-orders-print), body:has(.sales-orders-print) { height: auto; overflow: visible; background: white; }
          div:has(> div > main > .sales-orders-page .sales-orders-print) { min-height: 0; background: white; }
          div:has(> div > main > .sales-orders-page .sales-orders-print) > aside,
          div:has(> main > .sales-orders-page .sales-orders-print) > :is(header, footer),
          .sales-orders-page:has(.sales-orders-print) > :not(.sales-orders-print) { display: none !important; }
          div:has(> main > .sales-orders-page .sales-orders-print) { display: block; min-height: 0; margin: 0 !important; }
          main:has(> .sales-orders-page .sales-orders-print) { padding: 0; }
          .sales-orders-print { display: block; margin: 0 !important; color: #111; font: 10pt/1.4 Arial, sans-serif; }
          .sales-orders-print header, .sales-orders-print dl { break-inside: avoid; }
          .sales-orders-print table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 5mm; }
          .sales-orders-print thead { display: table-header-group; }
          .sales-orders-print tr { break-inside: avoid; }
          .sales-orders-print :is(th, td) { padding: 2mm 1.5mm; border-bottom: 1px solid #bbb; font-size: 9pt; overflow-wrap: anywhere; }
          .sales-orders-print thead th { border-block: 1px solid #555; }
        }
      `}</style>
      <header>
        <SalesLetterhead />
        <h1 className="elettro-document-title">{order ? 'Client Order Details' : 'Client Orders Register'}</h1>
        {selection.kind === 'list' && (
          <p className="break-words">{selection.orders.length.toLocaleString()} orders. {selection.criteria.join(' / ')}</p>
        )}
      </header>

      {selection.kind === 'list' ? (
        <table className="text-left">
          <thead><tr>
            <th scope="col">Order reference</th><th scope="col">Date placed</th><th scope="col">Client</th>
            <th scope="col">Status</th><th scope="col" className="text-right">Total</th>
          </tr></thead>
          <tbody>{selection.orders.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.reference}</th><td>{date(row.createdAt)}</td><td>{row.clientName || 'Unnamed client'}</td>
              <td className="capitalize">{label(row.status)}</td><td className="text-right">{money(orderTotal(row))}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : <OrderDetails order={selection.order} />}
    </section>
  )
}

function OrderDetails({ order }: { order: OrderObj }) {
  const delivery = order.fulfillmentMethod === 'DELIVERY'
  const address = [order.address, order.barangay, order.city, order.province, order.postalCode].filter(Boolean).join(', ')
  const details = [
    ['Order reference', order.reference],
    ['Date placed', date(order.createdAt)],
    ['Client', order.clientName || 'Unnamed client'],
    ['Status', label(order.status)],
    ['Email', order.email],
    ['Phone', order.phone],
    ['Fulfillment', delivery ? 'Delivery' : 'Pickup'],
    ['Payment method', label(order.paymentMethod)],
    ['Payment status', label(order.paymentStatus || 'UNPAID')],
    ['Delivery address', delivery ? address : ''],
    ['Delivery status', delivery ? label(order.deliveryStatus || 'AWAITING_ASSIGNMENT') : ''],
    ['Tracking number', order.trackingNumber],
    ['Assigned rider', order.riderName],
    ['Warehouse request', order.warehouseRequest?.reference],
    ['Delivery notes', order.deliveryNotes],
    ['Fulfillment notes', order.fulfillmentNote],
  ]

  return (
    <>
      <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2">
        {details.map(([key, value]) => value && (
          <div key={key} className="min-w-0">
            <dt className="text-xs font-bold">{key}</dt>
            <dd className="whitespace-pre-wrap break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <table className="text-left">
        <colgroup><col className="w-2/5" /><col /><col /><col /></colgroup>
        <thead><tr>
          <th scope="col">Material</th><th scope="col">Quantity</th>
          <th scope="col" className="text-right">Unit price</th><th scope="col" className="text-right">Amount</th>
        </tr></thead>
        <tbody>{(order.items || []).map((item) => (
          <tr key={item.id}>
            <th scope="row">{item.name}</th>
            <td>{item.quantity} {item.unit || 'pcs'}</td>
            <td className="text-right">{money(Number(item.unitPrice || 0))}</td>
            <td className="text-right">{money(Number(item.unitPrice || 0) * item.quantity)}</td>
          </tr>
        ))}</tbody>
      </table>
      <dl className="ml-auto mt-5 max-w-[75mm] space-y-2">
        <div className="flex justify-between gap-3"><dt>Items subtotal</dt><dd>{money(Number(order.total || 0))}</dd></div>
        {delivery && <div className="flex justify-between gap-3"><dt>Delivery fee</dt><dd>{money(Number(order.shipping || 0))}</dd></div>}
        <div className="flex justify-between gap-3 border-t border-slate-600 pt-2 font-bold"><dt>Grand total</dt><dd>{money(orderTotal(order))}</dd></div>
      </dl>
    </>
  )
}
