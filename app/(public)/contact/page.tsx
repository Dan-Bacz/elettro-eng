"use client"
import { useState } from "react"
import CTASection from "@/components/client/CTASection"
import { COMPANY } from "@/components/client/siteData"

const INFO_CARDS = [
  {
    icon: "📞",
    title: "Phone",
    lines: [COMPANY.phone, "Mon – Sat, 8AM – 6PM"],
  },
  {
    icon: "✉️",
    title: "Email",
    lines: [COMPANY.email, "We reply within 24 hours"],
  },
  {
    icon: "📍",
    title: "Visit Us",
    lines: [COMPANY.address, "By appointment preferred"],
  },
  {
    icon: "🕐",
    title: "Business Hours",
    lines: ["Mon – Sat: 8:00 AM – 6:00 PM", "Sunday: Emergency only"],
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!form.fullName.trim()) next.fullName = "Please enter your full name."
    if (!form.email.trim()) {
      next.email = "Please enter your email address."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Please enter a valid email address."
    }
    if (!form.message.trim()) next.message = "Please enter your message."
    else if (form.message.trim().length < 10) next.message = "Message should be at least 10 characters."
    return next
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSending(true)
    setStatus(null)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed to send")
      setStatus({ type: "success", text: "Your message has been sent. We'll get back to you shortly." })
      setForm({ fullName: "", email: "", phone: "", subject: "", message: "" })
    } catch (err) {
      setStatus({ type: "error", text: "Something went wrong sending your message. Please try again." })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Page header */}
      <section className="relative page-hero-bg bg-[#0b0f10] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(245,196,0,0.12),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold uppercase tracking-widest">
            Get in Touch
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight">
            Contact <span className="text-yellow-400">Elettro</span>
          </h1>
          <p className="mt-4 text-gray-400 max-w-xl text-lg">
            Have a question about our services or products? Send us a message and we&apos;ll get back
            to you quickly.
          </p>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      </section>

      {/* Info cards */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INFO_CARDS.map((card) => (
              <div key={card.title} className="bg-white rounded-2xl border border-gray-200 p-6 flex items-start gap-4 hover:border-yellow-400/50 transition-colors">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-2xl shrink-0">
                  {card.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{card.title}</h3>
                  {card.lines.map((line) => (
                    <p key={line} className="mt-1 text-sm text-gray-600">{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form + map */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Form */}
          <div>
            <span className="inline-block px-3 py-1 bg-yellow-400/10 text-yellow-600 text-xs font-bold uppercase tracking-wider rounded-full">
              Send a Message
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black text-gray-900">We&apos;d Love to Hear From You</h2>
            <p className="mt-2 text-gray-600">
              Fill out the form and our team will respond as soon as possible.
            </p>

            {status && (
              <div
                className={`mt-6 rounded-xl p-4 text-sm font-medium border ${
                  status.type === "success"
                    ? "bg-green-50 text-green-800 border-green-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {status.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="contact-name">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-name"
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  />
                  {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="contact-email">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="contact-phone">
                    Phone Number
                  </label>
                  <input
                    id="contact-phone"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+63 900 000 0000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="contact-subject">
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    value={form.subject}
                    onChange={(e) => updateField("subject", e.target.value)}
                    placeholder="How can we help?"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="contact-message">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="contact-message"
                  value={form.message}
                  onChange={(e) => updateField("message", e.target.value)}
                  placeholder="Tell us about your project or inquiry..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors resize-y"
                />
                {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
              </div>

              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/25 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send Message"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>

          {/* Location / Map */}
          <div>
            <span className="inline-block px-3 py-1 bg-yellow-400/10 text-yellow-600 text-xs font-bold uppercase tracking-wider rounded-full">
              Location
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black text-gray-900">Where to Find Us</h2>
            <p className="mt-2 text-gray-600">
              Visit our office in Zamboanga Del Sur or contact us through any of our channels.
            </p>

            <div className="mt-6 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-[4/3] relative">
              <iframe
                title="Elettro Engineering Enterprises location"
                src="https://www.google.com/maps?q=Zamboanga+del+Sur,+Philippines&output=embed"
                className="w-full h-full border-0"
                loading="lazy"
                allowFullScreen
              />
            </div>

            <div className="mt-6 rounded-2xl bg-[#0b0f10] text-white p-7">
              <h3 className="font-bold text-yellow-400">Connect With Us</h3>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={COMPANY.facebook}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-yellow-400 hover:text-black transition-colors"
                >
                  <span className="text-xl">📘</span>
                  <span className="text-sm font-semibold">Facebook</span>
                </a>
                <a
                  href={COMPANY.instagram}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-yellow-400 hover:text-black transition-colors"
                >
                  <span className="text-xl">📸</span>
                  <span className="text-sm font-semibold">Instagram</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        heading="Prefer to Book Directly?"
        subheading="Skip the back-and-forth — book a service online in just a minute."
        primaryLabel="Book a Service"
        primaryHref="/book-service"
      />
    </>
  )
}