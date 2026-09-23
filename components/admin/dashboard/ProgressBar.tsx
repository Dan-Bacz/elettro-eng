'use client'
import { useEffect, useState } from 'react'

type ProgressBarProps = {
  value: number
  color?: string
  height?: number
}

export default function ProgressBar({ value, color = '#facc15', height = 8 }: ProgressBarProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const pct = Math.max(0, Math.min(100, value))

  return (
    <div className="w-full overflow-hidden rounded-full bg-slate-100" style={{ height }}>
      <div
        className="rounded-full transition-all duration-1000 ease-out"
        style={{
          width: mounted ? `${pct}%` : '0%',
          height,
          background: `linear-gradient(90deg, ${color}, ${color})`,
        }}
      />
    </div>
  )
}