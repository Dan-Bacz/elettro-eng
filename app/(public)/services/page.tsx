import Hero from "@/components/client/Hero"
import ServiceCard from "@/components/client/ServiceCard"
import CTASection from "@/components/client/CTASection"
import { SERVICES } from "@/components/client/siteData"

export default function ServicesPage() {
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
        primaryLabel="Book a Service"
        primaryHref="/book-service"
        secondaryLabel="Contact Us"
        secondaryHref="/contact"
      />

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-3 py-1 bg-yellow-400/10 text-yellow-600 text-xs font-bold uppercase tracking-wider rounded-full">
              Our Services
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-gray-900">Complete Electrical Services</h2>
            <p className="mt-3 text-gray-600">
              Licensed technicians, quality materials, and dependable project delivery — for every
              type of electrical work.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service) => (
              <ServiceCard key={service.slug} service={service}
                imageUrl={service.slug === "electrical-installation" ? "/installation.png" : service.slug === "electrical-maintenance" ? "/maintenance.png" : service.slug === "electrical-repair" ? "/repair.png" : undefined} />
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  )
}