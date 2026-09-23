'use client'

type SparklineProps = {
  data: number[]
  color?: string
  width?: number
  height?: number
  fill?: boolean
}

export default function Sparkline({ data, color = '#facc15', width = 96, height = 30, fill = true }: SparklineProps) {
  const max = Math.max(1, ...data)
  const min = Math.min(0, ...data)
  const span = max - min || 1
  const step = data.length > 1 ? width / (data.length - 1) : width
  // Add horizontal padding so the stroke isn't clipped.
  const pad = 2
  const innerW = width - pad * 2
  const innerStep = data.length > 1 ? innerW / (data.length - 1) : innerW

  const pts = data.map((d, i) => {
    const x = pad + i * innerStep
    const y = height - pad - ((d - min) / span) * (height - pad * 2)
    return [x, y] as const
  })

  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = pts.length > 0 ? `${line} L${pad + innerW},${height} L${pad},${height} Z` : ''

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {fill && area && <path d={area} fill={color} opacity="0.12" />}
      {line && (
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset="100"
          style={{ animation: 'dash-in 1.1s ease forwards' }}
        />
      )}
      {pts.length > 0 && (
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color}>
          <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}