'use client'
import { useMemo, useState } from 'react'

type TrendPoint = { date: string; count: number }

type BookingTrendChartProps = {
  data: TrendPoint[]
  color?: string
  height?: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtLabel(key: string) {
  const d = new Date(`${key}T00:00:00`)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

function fmtFull(key: string) {
  const d = new Date(`${key}T00:00:00`)
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export default function BookingTrendChart({ data, color = '#facc15', height = 220 }: BookingTrendChartProps) {
  const [range, setRange] = useState<'7' | '30'>('30')
  const [hover, setHover] = useState<number | null>(null)

  const chartData = useMemo(() => (range === '7' ? data.slice(-7) : data), [range, data])
  const max = Math.max(1, ...chartData.map((d) => d.count))

  const W = 720
  const H = height
  const PAD = { top: 16, right: 12, bottom: 28, left: 34 }
  const iw = W - PAD.left - PAD.right
  const ih = H - PAD.top - PAD.bottom
  const n = chartData.length

  const xFor = (i: number) => PAD.left + (n === 1 ? iw / 2 : (i / (n - 1)) * iw)
  const yFor = (v: number) => PAD.top + ih - (v / max) * ih

  const linePath = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(2)},${yFor(d.count).toFixed(2)}`).join(' ')
  const areaPath =
    n > 1 ? `${linePath} L${xFor(n - 1).toFixed(2)},${(PAD.top + ih).toFixed(2)} L${xFor(0).toFixed(2)},${(PAD.top + ih).toFixed(2)} Z` : ''

  const yTicks = [0, 0.5, 1]
  const total = chartData.reduce((s, d) => s + d.count, 0)

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
          </span>
          <span className="text-[11px] font-bold text-slate-500">{total} bookings logged</span>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {(['30', '7'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors ${
                range === r ? 'bg-black text-yellow-400 shadow' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {yTicks.map((f) => (
            <g key={f}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yFor(max * f)}
                y2={yFor(max * f)}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray={f === 0 ? '' : '3 4'}
              />
              <text x={PAD.left - 8} y={yFor(max * f) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
                {Math.round(max * f)}
              </text>
            </g>
          ))}

          {areaPath && <path d={areaPath} fill="url(#trend-fill)" />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset="100"
              style={{ animation: 'dash-in 1.4s ease forwards' }}
            />
          )}

          {chartData.map((d, i) => (
            <g key={d.date}>
              <circle
                cx={xFor(i)}
                cy={yFor(d.count)}
                r={hover === i ? 5 : 3.5}
                fill={color}
                stroke="#fff"
                strokeWidth="1.5"
                style={{ transition: 'r 0.15s' }}
              />
              <rect
                x={xFor(i) - 12}
                y={PAD.top}
                width={24}
                height={ih}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(i)}
              />
            </g>
          ))}

          {hover !== null && chartData[hover] && (
            <g transform={`translate(${Math.min(Math.max(xFor(hover), 48), W - 52)}, ${yFor(chartData[hover].count) - 12})`}>
              <rect x="-46" y="-30" width="92" height="36" rx="8" fill="#0f172a" opacity="0.95" />
              <text x="0" y="-14" textAnchor="middle" fontSize="9" fill="#94a3b8">{fmtFull(chartData[hover].date)}</text>
              <text x="0" y="1" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>
                {chartData[hover].count} booking{chartData[hover].count === 1 ? '' : 's'}
              </text>
            </g>
          )}

          {chartData.map((d, i) =>
            i === 0 || i === n - 1 || i === Math.floor(n / 2) ? (
              <text
                key={d.date}
                x={xFor(i)}
                y={H - 8}
                textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                fontSize="9"
                fill="#94a3b8"
              >
                {fmtLabel(d.date)}
              </text>
            ) : null
          )}
        </svg>
      </div>

      {chartData.length === 0 && (
        <div className="py-10 text-center text-xs text-slate-400">No booking activity in this period yet</div>
      )}
    </div>
  )
}