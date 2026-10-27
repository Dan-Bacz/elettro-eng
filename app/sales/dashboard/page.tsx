import Link from 'next/link'

export default function SalesDashboardPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Sales Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Manage client orders, create material requests, and follow warehouse release activity.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/sales/orders" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-yellow-400">
          <h2 className="font-black text-slate-900">Client Orders</h2>
          <p className="mt-2 text-sm text-slate-500">Manage client orders, assign riders, and track order fulfillment.</p>
        </Link>
        <Link href="/sales/requests" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-yellow-400">
          <h2 className="font-black text-slate-900">Warehouse requests</h2>
          <p className="mt-2 text-sm text-slate-500">Create a request or follow its verification and release status.</p>
        </Link>
        <Link href="/sales/receipts" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-yellow-400">
          <h2 className="font-black text-slate-900">Release receipts</h2>
          <p className="mt-2 text-sm text-slate-500">View or print receipts for materials released to your requests.</p>
        </Link>
      </div>
    </div>
  )
}
