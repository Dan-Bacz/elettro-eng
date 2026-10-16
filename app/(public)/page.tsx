import Link from "next/link"
import Hero from "@/components/client/Hero"
import ServiceCard from "@/components/client/ServiceCard"
import FeaturedProducts from "@/components/client/FeaturedProducts"
import CTASection from "@/components/client/CTASection"
import { SERVICES } from "@/components/client/siteData"

const TRUST_BADGES = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3 19 6v5c0 4.6-2.9 7.8-7 10-4.1-2.2-7-5.4-7-10V6l7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "Licensed & Insured",
    desc: "Fully licensed electricians and covered workmanship.",
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 14a9 9 0 0 1 18 0" />
        <path d="M3 14h18v3H3zM12 5v6M7 7l1.5 4M17 7l-1.5 4" />
      </svg>
    ),
    title: "Skilled Technicians",
    desc: "Trained professionals with years of field experience.",
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="10" r="7" />
        <path d="m9.5 10 1.7 1.7 3.5-3.5M8 16l-1 5 5-2 5 2-1-5" />
      </svg>
    ),
    title: "Quality Materials",
    desc: "Only certified, high-quality electrical components.",
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 1.5M9 2h6M12 2v3" />
      </svg>
    ),
    title: "On-Time Service",
    desc: "We show up on schedule and finish on budget.",
  },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <Hero
        title={
          <>
            Powering Your
            <br />
            <span className="text-yellow-400">Electrical Needs</span>
          </>
        }
        subtitle="We provide electrical installation, maintenance, and supply solutions for residential, commercial, and industrial projects."
        primaryLabel="View Our Services"
        primaryHref="/services"
        secondaryLabel="Browse Products"
        secondaryHref="/products"
      />

      {/* Trust badges */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST_BADGES.map((badge) => (
              <div
                key={badge.title}
                className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 hover:border-yellow-400/40 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-700 shrink-0">
                  {badge.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{badge.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="inline-block px-3 py-1 bg-yellow-400/10 text-yellow-600 text-xs font-bold uppercase tracking-wider rounded-full">
                What We Do
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-gray-900">Our Services</h2>
              <p className="mt-2 text-gray-600 max-w-lg">
                Complete electrical solutions delivered by licensed, experienced professionals.
              </p>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors shrink-0"
            >
              View All Services
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.slice(0, 6).map((service) => (
              <ServiceCard key={service.slug} service={service}
                imageUrl={service.slug === "electrical-installation" ? "/installation.png" : service.slug === "electrical-maintenance" ? "/maintenance.png" : service.slug === "electrical-repair" ? "/repair.png" : service.slug === "lighting-solutions" ? "/light.jpg" : service.slug === "industrial-electrical-works" ? "/industrial.jpg" : service.slug === "renewable-energy-systems" ? "/solar.jpg" : undefined} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="inline-block px-3 py-1 bg-yellow-400/10 text-yellow-600 text-xs font-bold uppercase tracking-wider rounded-full">
                Materials & Equipment
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-gray-900">Featured Products</h2>
              <p className="mt-2 text-gray-600 max-w-lg">
                High-quality electrical materials and equipment from trusted brands.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shrink-0"
            >
              Browse All Products
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <FeaturedProducts limit={3} />
        </div>
      </section>

      {/* About preview */}
      <section className="page-hero-bg bg-[#0b0f10] text-white overflow-hidden relative" style={{ backgroundImage: 'url(/bgweb1.png)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,196,0,0.12),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 bg-yellow-400/10 text-yellow-400 text-xs font-bold uppercase tracking-wider rounded-full border border-yellow-400/30">
              About Elettro
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
              Trusted Electrical
              <br />
              <span className="text-yellow-400">Engineering Partner</span>
            </h2>
            <p className="mt-5 text-gray-400 leading-relaxed">
              Elettro Engineering Enterprises provides dependable electrical installation,
              maintenance, and supply solutions. From homes to heavy industry, our licensed
              technicians deliver safe, code-compliant workmanship on every project.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Licensed & insured electrical contractors",
                "Residential, commercial, and industrial expertise",
                "Commitment to safety and quality materials",
              ].map((point) => (
                <li key={point} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black shrink-0">
                    ✓
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-white/20 text-white text-sm font-bold hover:border-yellow-400 hover:text-yellow-400 transition-colors bg-white/5"
            >
              Learn More About Us
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "5+", label: "Years Experience" },
              { value: "100+", label: "Projects Completed" },
              { value: "100%", label: "Commitment to Quality" },
              { value: "All", label: "Licensed Technicians" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-center hover:border-yellow-400/40 transition-colors"
              >
                <div className="text-4xl font-black text-yellow-400">{stat.value}</div>
                <div className="mt-2 text-sm text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection />
    </>
  )
}