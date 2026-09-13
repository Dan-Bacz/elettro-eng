import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: string | number
  icon: string
  accent?: 'yellow' | 'blue' | 'green' | 'red' | 'violet' | 'slate'
  hint?: string
  href?: string
}

const ACCENTS: Record<string, string> = {
  yellow: 'bg-yellow-400 text-black shadow-yellow-400/30',
  blue: 'bg-blue-500 text-white shadow-blue-500/30',
  green: 'bg-emerald-500 text-white shadow-emerald-500/30',
  red: 'bg-red-500 text-white shadow-red-500/30',
  violet: 'bg-violet-500 text-white shadow-violet-500/30',
  slate: 'bg-slate-700 text-white shadow-slate-700/30',
}

export default function StatCard({ label, value, icon, accent = 'yellow', hint, href }: StatCardProps) {
  const inner = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide font-bold text-slate-400">{label}</div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{value}</div>
          {hint && <div className="mt-1 text-[11px] font-medium text-slate-400">{hint}</div>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg shadow-lg ${ACCENTS[accent]}`}>
          {icon}
        </div>
      </div>
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