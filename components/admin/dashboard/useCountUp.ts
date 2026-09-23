'use client'
import { useEffect, useState } from 'react'

export function useCountUp(target: number, duration = 900, start = 0) {
  const [value, setValue] = useState(start)

  useEffect(() => {
    let raf: number
    let from = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const ease = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(from + (target - from) * ease))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    setValue(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}