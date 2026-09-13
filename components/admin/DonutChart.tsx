'use client'

const PIE_COLORS = ['#facc15', '#3b82f6', '#8b5cf6', '#22c55e', '#059669', '#ef4444']

type DonutSegment = { status: string; value: number }

export default function DonutChart({ data, centerLabel }: { data: DonutSegment[]; centerLabel: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1
  const size = 140
  const stroke = 18
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  let cumulative = 0
  const segments = data.map((d, i) => {
    const percent = d.value / total
    const dash = circumference * percent
    const offset = circumference * (1 - cumulative) + circumference * 0.25
    cumulative += percent
    return { ...d, dash, offset, color: PIE_COLORS[i % PIE_COLORS.length] }
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth={stroke} />
        {segments.map((s, i) =>
          s.dash > 0 ? (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={s.offset}
              strokeLinecap="round"
            />
          ) : null
        )}
      </svg>
      <div className="space-y-1.5">
        {segments.map((s, i) =>
          s.value > 0 ? (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="font-medium text-slate-600">{s.status}</span>
              <span className="ml-auto font-black text-slate-900">{s.value}</span>
            </div>
          ) : null
        )}
        <div className="border-t border-slate-100 pt-1.5 text-xs font-bold text-slate-400">
          Total: {total}
        </div>
        {centerLabel && (
          <div className="text-[10px] font-medium text-slate-400">{centerLabel}</div>
        )}
      </div>
    </div>
  )
}