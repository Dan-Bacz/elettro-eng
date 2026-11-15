import Link from "next/link"

type CTAProps = {
  heading?: string
  subheading?: string
  primaryLabel?: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
}

export default function CTASection({
  heading = "Ready to Get Started?",
  subheading = "Contact us today for a free consultation or book a service online.",
  primaryLabel = "Book a Service",
  primaryHref = "/book-service",
  secondaryLabel = "Contact Us",
  secondaryHref = "/contact",
}: CTAProps) {
  return (
    <section className="relative page-hero-bg overflow-hidden bg-[#0b1118] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(245,196,0,0.15),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.05] px-6 py-10 shadow-2xl shadow-black/20 backdrop-blur-sm sm:px-10">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Your next project starts here</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{heading}</h2>
        <p className="mx-auto mt-4 max-w-xl text-gray-400">{subheading}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-7 py-3.5 text-sm font-black text-black shadow-lg shadow-yellow-400/25 transition-all hover:-translate-y-0.5 hover:bg-yellow-300"
          >
            {primaryLabel}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:border-yellow-400 hover:text-yellow-400"
          >
            {secondaryLabel}
          </Link>
        </div>
        </div>
      </div>
    </section>
  )
}
