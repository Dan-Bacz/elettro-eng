"use client"
import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import CTASection from "@/components/client/CTASection"
import { SERVICES } from "@/components/client/siteData"

const SERVICE_OPTIONS = [
  ...SERVICES.map((s) => s.title),
  "Emergency Electrical Services",
  "Product / Material Order",
  "Other",
]

function BookingForm() {
  const searchParams = useSearchParams()
  const productParam = searchParams?.get("product")

  const [form, setForm] = useState({
    clientName: "",
    email: "",
    phone: "",
    service: productParam ? "Product / Material Order" : SERVICE_OPTIONS[0],
    preferredDate: "",
    preferredTime: "",
    projectLocation: "",
    description: productParam ? `I would like to order/request: ${productParam}` : "",
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ reference: string } | null>(null)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!form.clientName.trim()) next.clientName = "Please enter your full name."
    if (!form.phone.trim()) next.phone = "Please enter your phone number."
    if (!form.email.trim()) {
      next.email = "Please enter your email address."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Please enter a valid email address."
    }
    if (!form.service) next.service = "Please select a service."
    if (!form.preferredDate) next.preferredDate = "Please choose a preferred date."
    if (!form.projectLocation.trim()) next.projectLocation = "Please enter the project location."
    return next
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSending(true)
    setError("")
    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clientName: form.clientName,
          description: form.description || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit booking")
      }
      setResult({ reference: data.reference || data.id })
    } catch (err: any) {
      setError(err?.message || "Failed to submit booking. Please try again.")
    } finally {
      setSending(false)
    }
  }

  if (result) {
    return (
      <section className="bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-xl p-10">
            <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl sm:text-3xl font-black text-gray-900">Booking Submitted!</h1>
            <p className="mt-3 text-gray-600">
              Thank you for choosing Elettro Engineering Enterprises. Your service request has been
              received and our team will contact you shortly to confirm the schedule.
            </p>
            <div className="mt-6 inline-block rounded-xl bg-yellow-400/10 border border-yellow-400/40 px-6 py-4">
              <div className="text-xs font-bold uppercase tracking-wider text-yellow-700">Your Reference Number</div>
              <div className="mt-1 text-2xl font-black text-black">{result.reference}</div>
            </div>
            <p className="mt-5 text-sm text-gray-500">
              Keep this reference number for any future correspondence.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setResult(null)
                  setForm({
                    clientName: "",
                    email: "",
                    phone: "",
                    service: SERVICE_OPTIONS[0],
                    preferredDate: "",
                    preferredTime: "",
                    projectLocation: "",
                    description: "",
                  })
                }}
                className="px-6 py-3 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors"
              >
                Submit Another Booking
              </button>
              <a
                href="/"
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 text-sm font-bold hover:border-gray-900 transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Page header */}
      <section className="relative bg-[#0b0f10] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,196,0,0.12),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold uppercase tracking-widest">
            Online Booking
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight">
            Book a <span className="text-yellow-400">Service</span>
          </h1>
          <p className="mt-3 text-gray-400 max-w-xl">
            Schedule an electrical service or request a product. No account or login required —
            just fill out the form and we&apos;ll take it from there.
          </p>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      </section>

      <section className="bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 sm:px-8 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Service Request Form</h2>
                <p className="text-xs text-gray-500">Fields marked with * are required.</p>
              </div>
            </div>

            {error && (
              <div className="px-6 sm:px-8 pt-5">
                <div className="rounded-xl p-4 text-sm font-medium bg-red-50 text-red-800 border border-red-200">
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 sm:py-8">
              {/* Contact */}
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="bk-name">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bk-name"
                    value={form.clientName}
                    onChange={(e) => updateField("clientName", e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  />
                  {errors.clientName && <p className="mt-1 text-xs text-red-600">{errors.clientName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="bk-phone">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bk-phone"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+63 900 000 0000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="bk-email">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bk-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>
              </div>

              {/* Service + Schedule */}
              <h3 className="mt-8 text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Service & Schedule</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="bk-service">
                    Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="bk-service"
                    value={form.service}
                    onChange={(e) => updateField("service", e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  >
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {errors.service && <p className="mt-1 text-xs text-red-600">{errors.service}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="bk-date">
                    Preferred Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bk-date"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={form.preferredDate}
                    onChange={(e) => updateField("preferredDate", e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  />
                  {errors.preferredDate && <p className="mt-1 text-xs text-red-600">{errors.preferredDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="bk-time">
                    Preferred Time
                  </label>
                  <input
                    id="bk-time"
                    type="time"
                    value={form.preferredTime}
                    onChange={(e) => updateField("preferredTime", e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="bk-location">
                    Project Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bk-location"
                    value={form.projectLocation}
                    onChange={(e) => updateField("projectLocation", e.target.value)}
                    placeholder="Street, Barangay, City"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                  />
                  {errors.projectLocation && <p className="mt-1 text-xs text-red-600">{errors.projectLocation}</p>}
                </div>
              </div>

              {/* Description */}
              <h3 className="mt-8 text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Project Details</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="bk-desc">
                  Project Description
                </label>
                <textarea
                  id="bk-desc"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe the work needed, special requirements, or any other details..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors resize-y"
                />
              </div>

              {/* Optional attachment */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-gray-300 text-sm font-semibold text-gray-600 hover:border-yellow-400 hover:text-yellow-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Add Image / Attachment (optional)
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
                <p className="mt-2 text-xs text-gray-400">
                  Attach photos of your project site if helpful. Images are only used by our team to
                  prepare your quote.
                </p>
              </div>

              {/* Submit */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-10 py-4 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/25 disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Booking Request
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </>
                  )}
                </button>
                <p className="mt-3 text-xs text-gray-400">
                  No account needed. You&apos;ll receive a booking reference after submitting.
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <CTASection
        heading="Questions Before Booking?"
        subheading="Reach out to our team and we'll help you plan your project."
        primaryLabel="Contact Us"
        primaryHref="/contact"
      />
    </>
  )
}

export default function BookServicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <BookingForm />
    </Suspense>
  )
}