import Link from "next/link"
import CTASection from "@/components/client/CTASection"
import { SERVICES } from "@/components/client/siteData"
import { notFound } from "next/navigation"

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = SERVICES.find((s) => s.slug === slug)
  return {
    title: service ? `${service.title} | Elettro` : "Service | Elettro",
  }
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = SERVICES.find((s) => s.slug === slug)
  if (!service) notFound()

  const others = SERVICES.filter((s) => s.slug !== slug).slice(0, 3)

  return (
    <>
      {/* Breadcrumb + header */}
      <section className="bg-[#0b0f10] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,196,0,0.12),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <nav className="text-sm text-gray-400 mb-6">
            <Link href="/" className="hover:text-yellow-400 transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/services" className="hover:text-yellow-400 transition-colors">Services</Link>
            <span className="mx-2">/</span>
            <span className="text-yellow-400">{service.title}</span>
          </nav>
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400 text-black text-4xl shadow-lg shadow-yellow-400/25 shrink-0">
              {service.icon}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">{service.title}</h1>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      </section>

      {/* Content */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Overview</h2>
            <p className="mt-4 text-gray-600 leading-relaxed text-lg">{service.description}</p>

            <div className="mt-10">
              <h3 className="text-xl font-bold text-gray-900">What&apos;s Included</h3>
              <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {service.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50 text-sm font-medium text-gray-800"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400 text-black text-xs font-black shrink-0">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/book-service"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/25"
              >
                Book This Service
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-bold hover:border-gray-900 hover:text-gray-900 transition-colors"
              >
                Ask a Question
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <aside>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 lg:sticky lg:top-24">
              <h3 className="font-bold text-gray-900">Other Services</h3>
              <ul className="mt-4 space-y-2">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/services/${other.slug}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 hover:border-yellow-400 hover:shadow-sm transition-all group"
                    >
                      <span className="text-xl">{other.icon}</span>
                      <span className="text-sm font-semibold text-gray-800 group-hover:text-black">
                        {other.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-5 rounded-xl bg-black text-white">
                <div className="text-sm font-bold text-yellow-400">Need a custom quote?</div>
                <p className="mt-1 text-xs text-gray-400">
                  Tell us about your project and we&apos;ll get back to you quickly.
                </p>
                <Link
                  href="/book-service"
                  className="mt-4 inline-flex w-full items-center justify-center px-4 py-2.5 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors"
                >
                  Request a Quote
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <CTASection />
    </>
  )
}