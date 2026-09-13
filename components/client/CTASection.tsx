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
    <section className="relative bg-[#0b0f10] text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(245,196,0,0.15),transparent_60%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">{heading}</h2>
        <p className="mt-4 text-gray-400 max-w-xl mx-auto">{subheading}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/25"
          >
            {primaryLabel}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg border border-white/20 text-white text-sm font-bold hover:border-yellow-400 hover:text-yellow-400 transition-colors bg-white/5"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}