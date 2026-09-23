import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: string | number
  hint?: string
  href?: string
}

export default function StatCard({ label, value, hint, href }: StatCardProps) {
  const inner = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-[11px] uppercase tracking-wide font-bold text-slate-400">{label}</div>
      <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-[11px] font-medium text-slate-400">{hint}</div>}
    </div>
  )
  if (href) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    )
  }
  return inner
}