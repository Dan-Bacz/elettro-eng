import type { CSSProperties } from "react"

type Props = {
  src?: string | null
  alt: string
  className?: string
  imgClassName?: string
  iconSize?: number
  style?: CSSProperties
}

export default function ProductImage({ src, alt, className = "", imgClassName = "", iconSize = 56, style }: Props) {
  if (src) {
    return (
      <div className={`flex items-center justify-center overflow-hidden ${className}`} style={style}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-contain ${imgClassName}`}
          onError={(e) => {
            const t = e.currentTarget
            const parent = t.parentElement
            if (parent && !t.dataset.fallback) {
              t.dataset.fallback = "1"
              t.style.display = "none"
              const ph = document.createElement("div")
              ph.className = "h-full w-full bg-gray-100"
              ph.innerHTML = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:auto;color:#9ca3af"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
              t.replaceWith(ph)
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={style}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-300"
        aria-hidden
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    </div>
  )
}