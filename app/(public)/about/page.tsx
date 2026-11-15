import Link from "next/link"
import Image from "next/image"
import CTASection from "@/components/client/CTASection"

const VALUES = [
  {
    icon: "🎯",
    title: "Our Mission",
    desc: "To deliver safe, reliable, and innovative electrical solutions that power homes, businesses, and industries — while building lasting relationships through honest workmanship and exceptional service.",
  },
  {
    icon: "🔭",
    title: "Our Vision",
    desc: "To be the most trusted electrical engineering enterprise in the region — recognized for quality, safety, and technical excellence in every project we touch.",
  },
  {
    icon: "💡",
    title: "Our Commitment",
    desc: "We measure success by the safety and satisfaction of our clients. Every installation, repair, and supply is backed by our commitment to quality materials and skilled technicians.",
  },
]

const WHY_CHOOSE = [
  {
    icon: "👷",
    title: "Skilled Technicians",
    desc: "Licensed, trained, and continuously updated on the latest electrical standards and technologies.",
  },
  {
    icon: "🥇",
    title: "Quality Materials",
    desc: "We use certified components and equipment from reputable brands — no shortcuts, no compromises.",
  },
  {
    icon: "🛡️",
    title: "Safety First",
    desc: "Every project follows strict safety protocols to protect people, property, and our team.",
  },
  {
    icon: "🤝",
    title: "Reliability",
    desc: "We show up when we say we will, communicate clearly, and stand behind our workmanship.",
  },
  {
    icon: "🏗️",
    title: "Experience",
    desc: "Years of hands-on engineering experience across residential, commercial, and industrial settings.",
  },
  {
    icon: "⭐",
    title: "Local Trusted Partner",
    desc: "A proudly local enterprise committed to the communities we serve — dependable and accountable.",
  },
]

const STATS = [
  { value: "5+", label: "Years Experience" },
  { value: "100+", label: "Projects Completed" },
  { value: "100%", label: "Commitment to Quality" },
  { value: "Local", label: "Trusted Partner" },
]

export default function AboutPage() {
  return (
    <>
      {/* Page header */}
      <section className="relative page-hero-bg bg-[#0b0f10] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(245,196,0,0.12),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold uppercase tracking-widest">
            About Us
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
            Engineering Trust,
            <br />
            <span className="text-yellow-400">Powering Progress</span>
          </h1>
          <p className="mt-5 text-gray-400 max-w-2xl text-lg leading-relaxed">
            Elettro Engineering Enterprises is a full-service electrical engineering company
            delivering installation, maintenance, and supply solutions for residential,
            commercial, and industrial clients.
          </p>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      </section>

      {/* Intro */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-yellow-400/10 text-yellow-600 text-xs font-bold uppercase tracking-wider rounded-full">
                Who We Are
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-black text-gray-900">
                About Elettro Engineering Enterprises
              </h2>
              <p className="mt-5 text-gray-600 leading-relaxed">
                What began as a small team of dedicated electricians has grown into Elettro
                Engineering Enterprises — a trusted electrical engineering partner for homes,
                businesses, and industries. We combine technical expertise, quality materials,
                and a genuine commitment to safety to deliver results that last.
              </p>
              <p className="mt-4 text-gray-600 leading-relaxed">
                From complete electrical installations and preventive maintenance to emergency
                repairs and renewable energy systems, our licensed technicians approach every
                project with professionalism and precision. We are proud to be a local partner
                our community relies on.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/25"
                >
                  Explore Our Services
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/book-service"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-bold hover:border-gray-900 hover:text-gray-900 transition-colors"
                >
                  Book a Service
                </Link>
              </div>
            </div>

            {/* Image panel */}
            <div className="relative">
              <div className="group relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#0b0f10] shadow-[0_24px_55px_-30px_rgba(15,23,42,.75)]">
                <Image src="/about.jpg" alt="Elettro electrical engineering work" fill className="object-cover object-center transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#071116]/90 via-[#071116]/45 to-yellow-500/20" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#071116]/90 to-transparent" />
                <div className="relative flex h-full flex-col justify-between p-7 sm:p-9">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300 backdrop-blur-sm">Built with precision</span>
                    <span className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-lg text-white backdrop-blur-sm">⚡</span>
                  </div>
                  <div>
                    <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={64} height={64} className="h-16 w-16 rounded-2xl object-cover shadow-xl shadow-black/30 ring-2 ring-white/20" />
                    <div className="mt-4 text-2xl font-black tracking-wide text-white">ELETTRO</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-300">Engineering Enterprises</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-yellow-400 text-black rounded-2xl px-6 py-4 shadow-xl shadow-yellow-400/30 max-w-[240px]">
                <div className="text-3xl font-black">100+</div>
                <div className="text-xs font-bold uppercase tracking-wide">Projects Completed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#0b0f10] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,196,0,0.1),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center py-4">
                <div className="text-4xl sm:text-5xl font-black text-yellow-400">{stat.value}</div>
                <div className="mt-2 text-sm text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Vision / Commitment */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="rounded-2xl border border-gray-200 p-8 hover:border-yellow-400/50 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-3xl">
                  {value.icon}
                </div>
                <h3 className="mt-5 text-xl font-bold text-gray-900">{value.title}</h3>
                <p className="mt-3 text-gray-600 leading-relaxed text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-3 py-1 bg-yellow-400/10 text-yellow-600 text-xs font-bold uppercase tracking-wider rounded-full">
              Why Choose Elettro
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-gray-900">Built on Trust, Backed by Quality</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_CHOOSE.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-gray-200 p-7 hover:border-yellow-400/50 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-2xl">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                </div>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        heading="Work With a Team You Can Trust"
        subheading="Partner with Elettro for your next electrical project. We'll get it done right."
        primaryLabel="Book a Service"
        primaryHref="/book-service"
        secondaryLabel="Contact Us"
        secondaryHref="/contact"
      />
    </>
  )
}
