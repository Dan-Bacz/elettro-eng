import Link from "next/link"
import CTASection from "../../../../../components/client/CTASection"
import ServiceBookingSection from "../../../../../components/client/ServiceBookingSection"
import { SERVICES } from "../../../../../components/client/siteData"
import { notFound } from "next/navigation"

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = SERVICES.find((item) => item.slug === slug)
  return { title: service ? `${service.title} | Client Portal | Elettro Engineering` : "Service | Client Portal" }
}

export default async function ClientServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = SERVICES.find((item) => item.slug === slug)
  if (!service) notFound()

  const others = SERVICES.filter((item) => item.slug !== slug).slice(0, 3)

  return (
    <>
      <section className="relative overflow-hidden bg-[#0b0f10] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,196,0,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <nav className="mb-6 text-sm text-gray-400">
            <Link href="/client/services" className="transition-colors hover:text-yellow-400">Client services</Link>
            <span className="mx-2">/</span>
            <span className="text-yellow-400">{service.title}</span>
          </nav>
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-4xl text-black shadow-lg shadow-yellow-400/25">{service.icon}</div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Service details</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{service.title}</h1>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8 lg:py-20">
          <div className="lg:col-span-2">
            <div className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white to-cyan-50/40 p-6 shadow-sm sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">What&apos;s included</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">Everything your project needs</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">{service.description}</p>
            </div>
            <div id="booking" className="scroll-mt-24">
              <ServiceBookingSection service={service} />
            </div>
          </div>

          <aside>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:sticky lg:top-24">
              <h3 className="font-black text-slate-900">Explore other services</h3>
              <ul className="mt-4 space-y-2">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link href={`/client/services/${other.slug}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-yellow-400 hover:shadow-sm">
                      <span className="text-xl">{other.icon}</span>
                      <span className="text-sm font-semibold text-slate-800">{other.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl bg-[#0b0f10] p-5 text-white">
                <div className="text-sm font-bold text-yellow-400">Ready to get started?</div>
                <p className="mt-1 text-xs text-gray-400">Submit your request from your verified client account.</p>
                <Link href="#booking" className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-yellow-300">Book this service</Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <CTASection heading="Need help choosing a service?" subheading="Our team can help you find the right electrical solution for your project." primaryLabel="View all services" primaryHref="/client/services" />
    </>
  )
}
