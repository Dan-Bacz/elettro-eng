'use client'
import { useEffect, useState } from 'react'

export type DonutSlice = {
  label: string
  value: number
  color: string
}

type AnimatedDonutProps = {
  data: DonutSlice[]
  centerLabel?: string
  size?: number
  stroke?: number
  showPercent?: boolean
}

export default function AnimatedDonut({ data, centerLabel, size = 176, stroke = 22, showPercent = true }: AnimatedDonutProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const total = data.reduce((s, d) => s + d.value, 0)
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const [hover, setHover] = useState<number | null>(null)

  let cumulative = 0
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const start = cumulative
      cumulative += d.value / total
      return {
        ...d,
        dash: (d.value / total) * circ,
        offset: circ * (1 - start),
      }
    })

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#eef2f7" strokeWidth={stroke} />
          {slices.map((s, i) => {
            const animated = mounted && s.dash > 2
            return (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${s.dash} ${circ - s.dash}`}
                strokeDashoffset={animated ? s.offset : circ}
                strokeLinecap="butt"
                style={{
                  transition: 'stroke-dashoffset 1s ease 0.2s',
                  opacity: hover === null || hover === i ? 1 : 0.35,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ width: size, height: size }}>
          <div className="text-2xl font-black text-slate-900">{total}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{centerLabel || 'Total'}</div>
        </div>
      </div>

      <div className="w-full space-y-1.5">
        {data.map((d, i) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0
          return (
            <div
              key={d.label}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors"
              style={{ background: hover === i ? '#f8fafc' : 'transparent' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="font-medium text-slate-600">{d.label}</span>
              <span className="ml-auto font-black text-slate-900">{d.value}</span>
              {showPercent && <span className="w-9 text-right text-[10px] font-bold text-slate-400">{pct}%</span>}
            </div>
          )
        })}
        {data.length === 0 && <div className="py-4 text-center text-xs text-slate-400">No data yet</div>}
      </div>
    </div>
  )
}