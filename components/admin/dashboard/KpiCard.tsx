'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCountUp } from './useCountUp'
import Sparkline from './Sparkline'

type KpiCardProps = {
  label: string
  value: number
  icon: ReactNode
  accent: 'yellow' | 'blue' | 'green' | 'purple'
  description: string
  spark?: number[]
  change?: number | null
  href?: string
}

const ACCENTS = {
  yellow: { bg: 'border-yellow-200', icon: 'bg-yellow-400 text-black shadow-yellow-400/40', chart: '#facc15', text: 'text-yellow-600', bar: 'from-yellow-300 to-orange-400', tint: 'bg-yellow-50' },
  blue: { bg: 'border-blue-200', icon: 'bg-blue-500 text-white shadow-blue-500/40', chart: '#3b82f6', text: 'text-blue-600', bar: 'from-blue-400 to-cyan-500', tint: 'bg-blue-50' },
  green: { bg: 'border-emerald-200', icon: 'bg-emerald-500 text-white shadow-emerald-500/40', chart: '#22c55e', text: 'text-emerald-600', bar: 'from-emerald-400 to-teal-500', tint: 'bg-emerald-50' },
  purple: { bg: 'border-violet-200', icon: 'bg-violet-500 text-white shadow-violet-500/40', chart: '#8b5cf6', text: 'text-violet-600', bar: 'from-violet-400 to-indigo-500', tint: 'bg-violet-50' },
}

function fmtChange(change: number) {
  const v = Math.round(change)
  return `${v > 0 ? '+' : ''}${v}%`
}

export default function KpiCard({ label, value, icon, accent, description, spark = [], change = null, href }: KpiCardProps) {
  const a = ACCENTS[accent]
  const animated = useCountUp(value)
  const trendingUp = change === null || change >= 0
  const inner = (
    <div className={`dashboard-depth group relative overflow-hidden rounded-[1.5rem] border ${a.bg} bg-gradient-to-br from-white via-white to-slate-50 p-4 sm:p-5 shadow-[0_18px_36px_-24px_rgba(15,23,42,.55)]`}>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${a.bar}`} />
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/70 blur-2xl transition-transform duration-500 group-hover:scale-125" />
      <div className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg shadow-lg ring-4 ring-white ${a.icon}`}>{icon}</div>
        <div className="flex items-center gap-1.5">
          {change !== null && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black ${
                trendingUp ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
              }`}
            >
              {trendingUp ? '▲' : '▼'} {fmtChange(change)}
            </span>
          )}
          {!href && change === null && <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Live</span>}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
            <div className="mt-1 text-3xl font-black tracking-tight text-slate-950 tabular-nums">{animated.toLocaleString()}</div>
          </div>
          <div className={`shrink-0 rounded-xl ${a.tint} px-1.5 py-1 opacity-90`}>
            <Sparkline data={spark.length ? spark : [0]} color={a.chart} width={88} height={34} />
          </div>
        </div>
        <div className={`mt-1.5 text-[11px] font-medium ${a.text}`}>{description}</div>
      </div>

      {href && (
        <Link href={href} className="absolute inset-0" aria-label={`View ${label.toLowerCase()}`} />
      )}
    </div>
  )
  return inner
}
