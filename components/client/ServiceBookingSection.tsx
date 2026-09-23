"use client"
import { useRef, useState } from "react"
import type { Service } from "./siteData"

type FormState = {
  clientName: string
  email: string
  phone: string
  address: string
  buildingType: string
  preferredDate: string
  preferredTime: string
  description: string
}

const INITIAL_FORM: FormState = {
  clientName: "",
  email: "",
  phone: "",
  address: "",
  buildingType: "Residential",
  preferredDate: "",
  preferredTime: "",
  description: "",
}

export default function ServiceBookingSection({ service }: { service: Service }) {
  const [selectedOfferings, setSelectedOfferings] = useState<string[]>([])
  const [otherSelected, setOtherSelected] = useState(false)
  const [otherSpecified, setOtherSpecified] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [attachment, setAttachment] = useState<string>("")
  const [attachmentName, setAttachmentName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{ reference: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function toggleOffering(offering: string) {
    setSelectedOfferings((prev) =>
      prev.includes(offering) ? prev.filter((t) => t !== offering) : [...prev, offering]
    )
  }

  function selectedOfferingList(): string[] {
    const list = [...selectedOfferings]
    if (otherSelected && otherSpecified.trim()) list.push(`Other: ${otherSpecified.trim()}`)
    return list
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please attach an image file.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAttachment(String(reader.result || ""))
      setAttachmentName(file.name)
    }
    reader.readAsDataURL(file)
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!form.clientName.trim()) next.clientName = "Please enter your full name."
    if (!form.email.trim()) next.email = "Please enter your email address."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Please enter a valid email address."
    if (!form.phone.trim()) next.phone = "Please enter your mobile number."
    if (!form.address.trim()) next.address = "Please enter your building / project address."
    if (!form.buildingType) next.buildingType = "Please select a building type."
    if (selectedOfferings.length === 0 && !otherSelected) next.offerings = "Please select at least one offering."
    if (otherSelected && !otherSpecified.trim()) next.other = "Please specify your requirement."
    if (!form.preferredDate) next.preferredDate = "Please choose a preferred date."
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
          clientName: form.clientName,
          email: form.email,
          phone: form.phone,
          service: service.title,
          projectLocation: form.address,
          preferredDate: form.preferredDate,
          preferredTime: form.preferredTime,
          description: form.description || undefined,
          buildingType: form.buildingType,
          offerings: selectedOfferingList(),
          attachment: attachment || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to submit booking")
      setResult({ reference: data.reference || data.id })
    } catch (err: any) {
      setError(err?.message || "Failed to submit booking. Please try again.")
    } finally {
      setSending(false)
    }
  }

  if (result) {
    return (
      <section className="mt-10">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-xl p-8 sm:p-10 text-center">
          <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-black text-gray-900">Booking Request Submitted</h2>
          <p className="mt-4 text-gray-600 leading-relaxed max-w-xl mx-auto">
            Your booking is currently under review. Our team will review your request and contact
            you through your email or mobile number for confirmation.
          </p>
          <div className="mt-6 inline-block rounded-xl bg-yellow-400/10 border border-yellow-400/40 px-6 py-4">
            <div className="text-xs font-bold uppercase tracking-wider text-yellow-700">Your Reference Number</div>
            <div className="mt-1 text-2xl font-black text-black">{result.reference}</div>
          </div>
          <p className="mt-5 text-sm text-gray-500">
            A confirmation email has been sent to {form.email}. Keep this reference number for any
            future correspondence.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setForm(INITIAL_FORM)
                setSelectedOfferings([])
                setOtherSelected(false)
                setOtherSpecified("")
                setAttachment("")
                setAttachmentName("")
                setFormOpen(false)
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
      </section>
    )
  }

  return (
    <>
      {/* Selectable offerings */}
      <div className="mt-10">
        <h3 className="text-xl font-bold text-gray-900">Select the offerings you need</h3>
        <p className="mt-1 text-xs text-gray-500">
          Choose one or multiple {service.title.toLowerCase()} offerings below.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {service.offerings.map((offering) => {
            const active = selectedOfferings.includes(offering)
            return (
              <button
                key={offering}
                type="button"
                onClick={() => toggleOffering(offering)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  active
                    ? "border-yellow-400 bg-yellow-400 text-black shadow-md shadow-yellow-400/20"
                    : "border-gray-300 bg-white text-gray-700 hover:border-yellow-400 hover:text-yellow-600"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    active ? "border-black bg-black text-yellow-400" : "border-gray-400 text-transparent"
                  } text-[10px] font-black`}
                >
                  ✓
                </span>
                {offering}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setOtherSelected((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              otherSelected
                ? "border-yellow-400 bg-yellow-400 text-black shadow-md shadow-yellow-400/20"
                : "border-gray-300 bg-white text-gray-700 hover:border-yellow-400 hover:text-yellow-600"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                otherSelected ? "border-black bg-black text-yellow-400" : "border-gray-400 text-transparent"
              } text-[10px] font-black`}
            >
              ✓
            </span>
            Other
          </button>
        </div>
        {otherSelected && (
          <div className="mt-4 max-w-lg">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="ib-other">
              Please specify your requirement
            </label>
            <input
              id="ib-other"
              value={otherSpecified}
              onChange={(e) => {
                setOtherSpecified(e.target.value)
                setErrors((prev) => ({ ...prev, other: "" }))
              }}
              placeholder="Describe the offering you need..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
            />
            {errors.other && <p className="mt-1 text-xs text-red-600">{errors.other}</p>}
          </div>
        )}
        {errors.offerings && <p className="mt-1.5 text-xs text-red-600">{errors.offerings}</p>}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/25"
        >
          {formOpen ? "Close Booking Form" : "Book This Service"}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
        <a
          href="/contact"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-bold hover:border-gray-900 hover:text-gray-900 transition-colors"
        >
          Ask a Question
        </a>
      </div>

      {/* Booking form */}
      {formOpen && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Complete Your Booking</h3>
              <p className="text-xs text-gray-500">Fields marked with * are required.</p>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl p-4 text-sm font-medium bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Contact */}
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Contact Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="ib-name">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="ib-name"
                  value={form.clientName}
                  onChange={(e) => updateField("clientName", e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                />
                {errors.clientName && <p className="mt-1 text-xs text-red-600">{errors.clientName}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="ib-email">
                  Gmail / Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="ib-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john@gmail.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="ib-phone">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="ib-phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+63 900 000 0000"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="ib-address">
                  Building / Project Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="ib-address"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Street, Barangay, City"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                />
                {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="ib-building">
                  Building Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="ib-building"
                  value={form.buildingType}
                  onChange={(e) => updateField("buildingType", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                >
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                </select>
                {errors.buildingType && <p className="mt-1 text-xs text-red-600">{errors.buildingType}</p>}
              </div>

              {/* Selected offerings */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Selected Offerings <span className="text-red-500">*</span>
                </label>
                <div className="min-h-[46px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700">
                  {selectedOfferingList().length === 0 ? (
                    <span className="text-gray-400 font-normal">Select from the options above</span>
                  ) : (
                    selectedOfferingList().join(", ")
                  )}
                </div>
              </div>
            </div>

            {/* Schedule */}
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Preferred Schedule</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="ib-date">
                  Preferred Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="ib-date"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={form.preferredDate}
                  onChange={(e) => updateField("preferredDate", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                />
                {errors.preferredDate && <p className="mt-1 text-xs text-red-600">{errors.preferredDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="ib-time">
                  Preferred Time
                </label>
                <input
                  id="ib-time"
                  type="time"
                  value={form.preferredTime}
                  onChange={(e) => updateField("preferredTime", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="ib-desc">
                Project Description
              </label>
              <textarea
                id="ib-desc"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe the work needed, special requirements, or any other details..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors resize-y"
              />
            </div>

            {/* Optional attachment */}
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-gray-400 text-sm font-semibold text-gray-600 hover:border-yellow-400 hover:text-yellow-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {attachmentName || "Add Photo / Attachment (optional)"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <p className="mt-2 text-xs text-gray-400">
                Attach photos of your project site if helpful. Images are only used by our team to prepare your quote.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-gray-200">
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
            </div>
          </form>
        </div>
      )}
    </>
  )
}