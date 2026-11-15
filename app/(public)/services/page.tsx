import Hero from "@/components/client/Hero"
import ServiceCard from "@/components/client/ServiceCard"
import CTASection from "@/components/client/CTASection"
import { SERVICES } from "@/components/client/siteData"

export default function ServicesPage({ clientMode = false }: { clientMode?: boolean }) {
  return (
    <>
      <Hero
        title={
          <>
            Electrical Solutions
            <br />
            <span className="text-yellow-400">for Every Need</span>
          </>
        }
        subtitle="From residential wiring to heavy industrial systems, Elettro delivers safe, reliable, and code-compliant electrical services."
        primaryLabel={clientMode ? "Book a Service" : "Sign in to book a service"}
        primaryHref={clientMode ? "/book-service" : "/client/login"}
        secondaryLabel={clientMode ? "My Bookings" : "Create client account"}
        secondaryHref={clientMode ? "/client/bookings" : "/client/register"}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-[#eef6f8] via-white to-[#fff9e7]">
        <div className="pointer-events-none absolute -right-32 top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-20 h-80 w-80 rounded-full bg-yellow-300/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 bg-yellow-400/10 text-yellow-600 text-xs font-bold uppercase tracking-wider rounded-full">
              Our Services
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Complete electrical services</h2>
            <p className="mt-3 text-gray-600">
              Licensed technicians, quality materials, and dependable project delivery — for every
              type of electrical work.
            </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-2xl border border-white bg-white/80 px-4 py-3 shadow-sm"><p className="text-2xl font-black text-slate-900">{SERVICES.length}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Specialties</p></div>
              <div className="rounded-2xl border border-white bg-[#0b5360] px-4 py-3 text-white shadow-lg shadow-cyan-900/15"><p className="text-2xl font-black">100%</p><p className="text-[10px] font-bold uppercase tracking-wide text-cyan-100">Project focus</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service) => (
              <ServiceCard key={service.slug} service={service}
                detailsHref={clientMode ? `/client/services/${service.slug}` : undefined}
                imageUrl={service.slug === "electrical-installation" ? "/installation.png" : service.slug === "electrical-maintenance" ? "/maintenance.png" : service.slug === "electrical-repair" ? "/repair.png" : service.slug === "lighting-solutions" ? "/light.jpg" : service.slug === "industrial-electrical-works" ? "/industrial.jpg" : service.slug === "renewable-energy-systems" ? "/solar.jpg" : undefined} />
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  )
}
