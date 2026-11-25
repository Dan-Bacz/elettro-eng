'use client'

export default function WarehouseReportsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <h1 className="text-xl font-black text-red-900">Warehouse reports could not load</h1>
      <p className="mt-2 text-sm text-red-700">Please try again. Your warehouse records have not been changed.</p>
      <button type="button" onClick={() => reset()} className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800">
        Reload report
      </button>
    </div>
  )
}
