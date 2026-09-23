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
  yellow: { bg: 'bg-yellow-50 border-yellow-200', icon: 'bg-yellow-400 text-black shadow-yellow-400/40', chart: '#facc15', text: 'text-yellow-600' },
  blue: { bg: 'bg-blue-50 border-blue-200', icon: 'bg-blue-500 text-white shadow-blue-500/40', chart: '#3b82f6', text: 'text-blue-600' },
  green: { bg: 'bg-emerald-50 border-emerald-200', icon: 'bg-emerald-500 text-white shadow-emerald-500/40', chart: '#22c55e', text: 'text-emerald-600' },
  purple: { bg: 'bg-violet-50 border-violet-200', icon: 'bg-violet-500 text-white shadow-violet-500/40', chart: '#8b5cf6', text: 'text-violet-600' },
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
    <div className={`group relative overflow-hidden rounded-2xl border ${a.bg} bg-white p-4 sm:p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg shadow-lg ${a.icon}`}>{icon}</div>
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
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-1 text-3xl font-black text-slate-900 tabular-nums">{animated.toLocaleString()}</div>
          </div>
          <div className="shrink-0 opacity-90">
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