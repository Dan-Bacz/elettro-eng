import Link from "next/link"
import Image from "next/image"
import ServiceCard from "@/components/client/ServiceCard"
import FeaturedProducts from "@/components/client/FeaturedProducts"
import CTASection from "@/components/client/CTASection"
import { SERVICES } from "@/components/client/siteData"

const serviceImage: Record<string, string> = {
  "electrical-installation": "/installation.png",
  "electrical-maintenance": "/maintenance.png",
  "electrical-repair": "/repair.png",
  "lighting-solutions": "/light.jpg",
  "industrial-electrical-works": "/industrial.jpg",
  "renewable-energy-systems": "/solar.jpg",
}

const trustPoints = [
  { number: "05+", label: "Years of experience" },
  { number: "100+", label: "Projects completed" },
  { number: "24/7", label: "Support when needed" },
]

const promises = [
  { icon: "◈", title: "Safety first", text: "Code-compliant work planned around the people and property we serve." },
  { icon: "✦", title: "Built to last", text: "Reliable materials and careful workmanship at every stage of the project." },
  { icon: "↗", title: "Clear delivery", text: "Practical recommendations, transparent communication, and dependable timelines." },
]

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#f7fafb] text-slate-900">
      <section className="relative isolate min-h-[650px] overflow-hidden bg-[#071116] text-white sm:min-h-[720px]">
        <Image src="/bgweb.png" alt="Electrical engineering background" fill priority className="object-cover object-center opacity-45" />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(3,10,14,.98)_12%,rgba(3,10,14,.78)_52%,rgba(3,10,14,.45)),radial-gradient(circle_at_80%_30%,rgba(16,185,190,.2),transparent_34%)]" />
        <div className="absolute -right-32 top-16 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-yellow-400 via-cyan-400 to-yellow-400" />

        <div className="relative mx-auto flex min-h-[650px] max-w-7xl items-center px-4 py-24 sm:min-h-[720px] sm:px-6 lg:px-8">
          <div className="grid w-full items-center gap-14 lg:grid-cols-[1.1fr_.9fr]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_16px_#facc15]" />
                Elettro Engineering Enterprises
              </div>
              <h1 className="mt-7 text-5xl font-black leading-[.98] tracking-[-0.05em] sm:text-6xl lg:text-8xl">
                Powering the places <span className="text-yellow-400">you call home.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">Dependable electrical installation, maintenance, repairs, and materials for homes, businesses, and industrial projects across Zamboanga del Sur.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/services" className="inline-flex items-center justify-center gap-3 rounded-xl bg-yellow-400 px-6 py-4 text-sm font-black text-black shadow-[0_14px_30px_-12px_rgba(250,204,21,.8)] transition hover:-translate-y-1 hover:bg-yellow-300">Explore our services <span>→</span></Link>
                <Link href="/products" className="inline-flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-sm font-black text-white backdrop-blur-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:bg-white/15">Browse materials <span>↗</span></Link>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-2"><span className="text-yellow-400">✓</span> Licensed workmanship</span>
                <span className="flex items-center gap-2"><span className="text-yellow-400">✓</span> Quality materials</span>
                <span className="flex items-center gap-2"><span className="text-yellow-400">✓</span> Local service team</span>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute -inset-8 rounded-[3rem] border border-cyan-300/10 bg-cyan-400/5 blur-sm" />
              <div className="relative rounded-[2rem] border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3"><Image src="/logo-elettro.jpg" alt="Elettro logo" width={42} height={42} className="rounded-xl" /><div><p className="text-sm font-black text-white">ELETTRO</p><p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">Engineering Enterprises</p></div></div>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">Ready to serve</span>
                </div>
                <div className="group relative mt-5 h-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b5360]">
                  <Image src="/about.jpg" alt="Elettro engineering workspace" fill className="object-cover object-center transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#071116]/85 via-[#071116]/35 to-[#071116]/10" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071116]/90 via-transparent to-transparent" />
                  <Image src="/engineer.png" alt="Elettro engineer" fill className="pointer-events-none object-contain object-right-bottom drop-shadow-[0_18px_18px_rgba(0,0,0,.45)] transition duration-700 group-hover:scale-[1.03]" />
                  <div className="absolute bottom-5 left-5 z-10 max-w-[58%]"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Power. Precision. Progress.</p><p className="mt-2 text-2xl font-black leading-tight text-white">Engineered for confidence.</p></div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {trustPoints.map((point) => <div key={point.label} className="rounded-xl border border-white/10 bg-black/15 p-3"><p className="text-xl font-black text-yellow-400">{point.number}</p><p className="mt-1 text-[10px] leading-4 text-slate-400">{point.label}</p></div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-[0_24px_60px_-35px_rgba(15,23,42,.7)] sm:grid-cols-3">
          {promises.map((promise, index) => <div key={promise.title} className={`p-6 sm:p-7 ${index ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""}`}><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-xl font-black text-cyan-700">{promise.icon}</span><div><h2 className="font-black text-slate-900">{promise.title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{promise.text}</p></div></div></div>)}
        </div>
      </section>

      <section className="px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">What we do</p><h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Solutions for every connection.</h2><p className="mt-4 max-w-xl leading-7 text-slate-500">From a single lighting upgrade to a complete industrial system, our team brings care and technical expertise to every job.</p></div><Link href="/services" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-yellow-400 hover:bg-yellow-50">View all services <span>→</span></Link></div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{SERVICES.slice(0, 6).map((service) => <ServiceCard key={service.slug} service={service} imageUrl={serviceImage[service.slug]} />)}</div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">Materials & equipment</p><h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">The right parts make the difference.</h2><p className="mt-5 max-w-lg leading-7 text-slate-500">Explore reliable electrical materials and equipment selected for quality, performance, and everyday project needs.</p><Link href="/products" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-cyan-800">Browse all products <span>→</span></Link></div>
          <div className="rounded-[2rem] bg-gradient-to-br from-cyan-50 via-white to-yellow-50 p-4 sm:p-6"><FeaturedProducts limit={3} /></div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0b1118] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
        <Image src="/bgweb1.png" alt="" fill className="object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071116] via-[#071116]/90 to-[#0b1118]/70" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.2fr_.8fr]">
          <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Why Elettro</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">A partner you can build with.</h2><p className="mt-5 max-w-2xl leading-8 text-slate-300">We combine practical field experience with disciplined engineering to make electrical work safer, cleaner, and easier to maintain for years to come.</p><Link href="/about" className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-black text-white backdrop-blur-sm transition hover:border-yellow-400 hover:text-yellow-300">Meet the team <span>→</span></Link></div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">{trustPoints.map((point) => <div key={point.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm sm:p-6"><p className="text-3xl font-black text-yellow-400 sm:text-4xl">{point.number}</p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{point.label}</p></div>)}<div className="col-span-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-bold text-cyan-100">Serving Mahayag and surrounding communities with dependable electrical solutions.</div></div>
        </div>
      </section>

      <CTASection heading="Let’s power your next project." subheading="Tell us what you need and our team will help you take the next step with confidence." primaryLabel="Explore services" primaryHref="/services" secondaryLabel="Contact Elettro" secondaryHref="/contact" />
    </main>
  )
}
