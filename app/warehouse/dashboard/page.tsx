import Link from 'next/link'

export default function WarehouseDashboardPage() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-black text-slate-900">Warehouse Dashboard</h1><p className="mt-1 text-sm text-slate-500">Review requests, release verified materials, and manage audited stock movements.</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/warehouse/requests" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-yellow-400"><h2 className="font-black">Requests & Releases</h2><p className="mt-2 text-sm text-slate-500">Review submitted requests and create release receipts.</p></Link>
        <Link href="/warehouse/inventory" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-yellow-400"><h2 className="font-black">Inventory & Stock</h2><p className="mt-2 text-sm text-slate-500">Receive products or record an explained stock adjustment.</p></Link>
        <Link href="/warehouse/receipts" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-yellow-400"><h2 className="font-black">Receipts</h2><p className="mt-2 text-sm text-slate-500">Find and print saved warehouse release receipts.</p></Link>
      </div>
    </div>
  )
}
