import Link from "next/link"
import CTASection from "@/components/client/CTASection"

export const metadata = { title: "Book a Service | Elettro Engineering" }

export default function BookServicePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#0b0f10] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,196,0,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <span className="inline-flex rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-yellow-400">Client booking</span>
          <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">Book a service through your <span className="text-yellow-400">client account</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">To protect your booking history and keep your requests connected to your account, service bookings can only be submitted by verified clients inside the client portal.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/client/login" className="inline-flex items-center justify-center rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300">Sign in to your client account</Link>
            <Link href="/client/register" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/15">Create a client account</Link>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      </section>

      <section className="bg-gradient-to-br from-[#eef6f8] via-white to-[#fff9e7]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="rounded-[1.75rem] border border-white bg-white/90 p-8 text-center shadow-[0_24px_60px_-35px_rgba(15,23,42,.7)] sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-100 text-3xl">🔐</div>
            <h2 className="mt-6 text-2xl font-black text-slate-900 sm:text-3xl">Your booking form is inside the client portal</h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">After signing in, open View Services, choose a service, and submit your request from its service details page.</p>
            <Link href="/services" className="mt-7 inline-flex items-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-800 hover:border-yellow-500">Browse services</Link>
          </div>
        </div>
      </section>

      <CTASection heading="Need help first?" subheading="Contact our team if you have questions about the right service for your project." primaryLabel="Contact Us" primaryHref="/contact" />
    </>
  )
}
