type HeroProps = {
  title: React.ReactNode
  subtitle: string
  primaryLabel?: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
  backgroundImage?: string
}

export default function Hero({
  title,
  subtitle,
  primaryLabel,
  primaryHref = "/services",
  secondaryLabel,
  secondaryHref = "/contact",
  backgroundImage,
}: HeroProps) {
  return (
    <section className="relative bg-[#0b0f10] text-white overflow-hidden">
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${backgroundImage}')` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/70 to-black/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,196,0,0.12),transparent_55%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Elettro Engineering Enterprises
          </div>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
            {title}
          </h1>

          <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-xl leading-relaxed">
            {subtitle}
          </p>

          {(primaryLabel || secondaryLabel) && (
            <div className="mt-10 flex flex-wrap gap-4">
              {primaryLabel && (
                <a
                  href={primaryHref}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/25"
                >
                  {primaryLabel}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              )}
              {secondaryLabel && (
                <a
                  href={secondaryHref}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-white/20 text-white text-sm font-bold hover:border-yellow-400 hover:text-yellow-400 transition-colors bg-white/5 backdrop-blur-sm"
                >
                  {secondaryLabel}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
    </section>
  )
}