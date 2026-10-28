import Link from 'next/link'

export default function SalesDashboardPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Sales Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Manage client orders, warehouse requests, and release receipts.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/sales/orders" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-yellow-400">
          <h2 className="font-black">Client Orders</h2>
          <p className="mt-2 text-sm text-slate-500">View and manage incoming client orders.</p>
        </Link>
        <Link href="/sales/requests" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-yellow-400">
          <h2 className="font-black">Warehouse Requests</h2>
          <p className="mt-2 text-sm text-slate-500">Track warehouse request status and releases.</p>
        </Link>
        <Link href="/sales/receipts" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-yellow-400">
          <h2 className="font-black">Release Receipts</h2>
          <p className="mt-2 text-sm text-slate-500">View and print warehouse release receipts.</p>
        </Link>
      </div>
    </div>
  )
}
