"use client"

import { useEffect, useMemo, useState } from "react"
import { useCart } from "./CartContext"
import { CartIcon, CheckIcon, CloseIcon } from "./storeIcons"
import { formatPeso } from "./storeUtils"
import ClientSessionGate from "../ClientSessionGate"
import { loadMindanaoLocations, type MindanaoLocation } from "@/lib/mindanaoLocations"
import { findPostalCode } from "@/lib/postalCodes"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MANUAL_GCASH_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_GCASH_ACCOUNT_NAME && process.env.NEXT_PUBLIC_GCASH_ACCOUNT_NUMBER
)

type PaymentChoice = {
  id: string
  label: string
  hint: string
  note: string
}

const PAYMENT_METHODS: PaymentChoice[] = [
  {
    id: "GCASH",
    label: "GCash",
    hint: "Manual GCash transfer; our team verifies payment",
    note: "Place your order first. GCash instructions and payment reference submission are in your client dashboard.",
  },
  {
    id: "CASH_ON_DELIVERY",
    label: "Cash on Delivery",
    hint: "Pay when your order arrives",
    note: "Available for delivery orders. Pay in cash when your order arrives.",
  },
  {
    id: "CASH_ON_PICKUP",
    label: "Cash on Pickup",
    hint: "Pay in cash when you collect your order",
    note: "Available for pickup orders when your order is ready.",
  },
]

type FormField = "clientName" | "email" | "phone" | "address" | "barangay" | "city" | "province" | "postalCode" | "deliveryNotes"

type Confirmation = {
  reference: string
  total: number
  shipping: number
  distanceKm: number
  paymentMethod: string
  fulfillmentMethod: string
  status: string
  testPayment?: boolean
  checkoutUrl?: string | null
}

function isValidPhone(p: string) {
  const digits = (p || "").replace(/\D/g, "")
  return digits.length >= 8 && digits.length <= 15
}

export default function CheckoutModal() {
  const { items, count, subtotal, checkoutOpen, closeCheckout, clear } = useCart()
  const [form, setForm] = useState<Record<FormField, string>>({
    clientName: "",
    email: "",
    phone: "",
    address: "",
    barangay: "",
    city: "",
    province: "",
    postalCode: "",
    deliveryNotes: "",
  })
  const [gcashTestMode, setGcashTestMode] = useState(false)
  const [gcashTestAvailable, setGcashTestAvailable] = useState(false)
  const gcashAvailable = gcashTestMode ? gcashTestAvailable : MANUAL_GCASH_CONFIGURED
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY")
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY")
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [shippingEstimate, setShippingEstimate] = useState<{ distanceKm: number; shippingFee: number } | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState("")
  const [locations, setLocations] = useState<MindanaoLocation[]>([])
  const [locationLoading, setLocationLoading] = useState(true)
  const [locationError, setLocationError] = useState("")
  const [postalLoading, setPostalLoading] = useState(false)

  const selectedProvince = useMemo(
    () => locations.find((location) => location.province === form.province),
    [locations, form.province]
  )
  const municipalityOptions = selectedProvince?.municipalities || []
  const selectedMunicipality = selectedProvince?.municipalities.find((municipality) => municipality.name === form.city)
  const barangayOptions = useMemo(
    () => selectedMunicipality?.barangays || [],
    [selectedMunicipality]
  )

  useEffect(() => {
    const controller = new AbortController()
    setLocationLoading(true)
    loadMindanaoLocations(controller.signal)
      .then((data) => {
        setLocations(data)
        setLocationError("")
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setLocationError(error?.message || "Location directory unavailable")
      })
      .finally(() => setLocationLoading(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (fulfillmentMethod !== "DELIVERY" || !form.city || !form.barangay) {
      setPostalLoading(false)
      return
    }
    let active = true
    setPostalLoading(true)
    findPostalCode(form.city, form.barangay)
      .then((postalCode) => {
        if (active) setForm((current) => ({ ...current, postalCode }))
      })
      .catch((error) => console.error("Could not load postal code:", error))
      .finally(() => {
        if (active) setPostalLoading(false)
      })
    return () => { active = false }
  }, [fulfillmentMethod, form.city, form.barangay])

  useEffect(() => {
    if (!checkoutOpen) return
    let active = true
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !data?.user) return
        setGcashTestMode(data.sikatPayTestMode === true)
        setGcashTestAvailable(data.sikatPayTestAvailable === true)
        setForm((current) => ({
          ...current,
          clientName: data.user.name || current.clientName,
          email: data.user.email || current.email,
          phone: data.user.phone || current.phone,
          address: current.address || data.user.address || "",
        }))
      })
      .catch((reason) => console.error("Could not load client contact details:", reason))
    return () => { active = false }
  }, [checkoutOpen])

  const { address, barangay, city, province, postalCode } = form

  useEffect(() => {
    setShippingEstimate(null)
    setShippingError("")
    if (!checkoutOpen || fulfillmentMethod !== "DELIVERY" || !address.trim() || !barangay || !city || !province) {
      setShippingLoading(false)
      return
    }

    const controller = new AbortController()
    setShippingLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/public/shipping-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ address, barangay, city, province, postalCode }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || "Could not calculate shipping.")
        if (!controller.signal.aborted) {
          setShippingEstimate({ distanceKm: Number(data.distanceKm), shippingFee: Number(data.shippingFee) })
        }
      } catch (error) {
        if (!controller.signal.aborted) setShippingError(error instanceof Error ? error.message : "Could not calculate shipping.")
      } finally {
        if (!controller.signal.aborted) setShippingLoading(false)
      }
    }, 600)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [checkoutOpen, fulfillmentMethod, address, barangay, city, province, postalCode])

  const paymentLabel = useMemo(
    () => PAYMENT_METHODS.find((p) => p.id === paymentMethod)?.label || paymentMethod,
    [paymentMethod]
  )

  if (!checkoutOpen) return null

  function setField(key: FormField, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function selectProvince(value: string) {
    setForm((prev) => ({ ...prev, province: value, city: "", barangay: "", postalCode: "" }))
    setErrors((prev) => ({ ...prev, province: undefined, city: undefined, barangay: undefined }))
  }

  function selectCity(value: string) {
    setForm((prev) => ({ ...prev, city: value, barangay: "", postalCode: "" }))
    setErrors((prev) => ({ ...prev, city: undefined, barangay: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<FormField, string>> = {}
    if (!form.clientName.trim()) next.clientName = "Please enter your full name"
    if (!form.email.trim()) next.email = "Your email address is required"
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Please enter a valid email address"
    if (!form.phone.trim()) next.phone = "Your mobile number is required"
    else if (!isValidPhone(form.phone)) next.phone = "Please enter a valid mobile number"
    if (fulfillmentMethod === "DELIVERY") {
      if (!form.address.trim()) next.address = "Complete address is required"
      if (!form.barangay.trim()) next.barangay = "Select a barangay"
      if (!form.city.trim()) next.city = "Municipality / City is required"
      if (!form.province.trim()) next.province = "Province is required"
      if (form.postalCode.trim() && !/^\d{4}$/.test(form.postalCode.trim())) next.postalCode = "4-digit postal code"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || items.length === 0) return
    setServerError("")
    if (!validate()) return
    if (fulfillmentMethod === "DELIVERY" && !shippingEstimate) {
      setServerError(shippingError || "Complete the delivery address so we can calculate the shipping fee.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.clientName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          ...(fulfillmentMethod === "DELIVERY" ? {
            address: form.address.trim(),
            barangay: form.barangay.trim(),
            city: form.city.trim(),
            province: form.province.trim(),
            postalCode: form.postalCode.trim(),
            deliveryNotes: form.deliveryNotes.trim(),
          } : {}),
          fulfillmentMethod,
          paymentMethod: paymentMethod === "GCASH" && gcashTestMode ? "GCASH_TEST" : paymentMethod,
          items: items.map((it) => ({ inventoryItemId: it.id, quantity: it.quantity })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to place order")
      setConfirmation({
        reference: data.reference,
        total: Number(data.total ?? subtotal),
        shipping: Number(data.shipping ?? 0),
        distanceKm: Number(data.distanceKm ?? 0),
        paymentMethod: data.paymentMethod || paymentMethod,
        fulfillmentMethod: data.fulfillmentMethod || fulfillmentMethod,
        status: data.status || "PENDING",
        testPayment: data.testPayment === true,
        checkoutUrl: data.checkoutUrl,
      })
      clear()
    } catch (err: any) {
      setServerError(err?.message || "Failed to place order")
    } finally {
      setSubmitting(false)
    }
  }

  const delivery = fulfillmentMethod === "DELIVERY"
  const testCheckout = paymentMethod === "GCASH" && gcashTestMode
  const total = subtotal + (delivery ? shippingEstimate?.shippingFee || 0 : 0)
  const inputClass = "mt-1.5 block min-h-[42px] w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-600 aria-[invalid=true]:border-red-500"
  const sectionClass = "min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"

  function selectFulfillment(method: "DELIVERY" | "PICKUP") {
    setFulfillmentMethod(method)
    setPaymentMethod((current) => current === "GCASH" ? current : method === "DELIVERY" ? "CASH_ON_DELIVERY" : "CASH_ON_PICKUP")
    setServerError("")
  }

  return (
    <ClientSessionGate>
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label="Checkout">
      <div className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {confirmation ? (
          /* ---------- Order confirmation ---------- */
          <div className="p-6 sm:p-10">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckIcon className="w-8 h-8" />
              </div>
              <h2 className="mt-4 text-2xl font-black text-gray-900">{confirmation.testPayment ? "Test order saved" : confirmation.fulfillmentMethod === "PICKUP" ? "Item Reserved Successfully" : "Order Placed Successfully"}</h2>
              <p className="mt-2 text-sm text-gray-500">
                {confirmation.testPayment
                  ? "Continue to SikatPay to simulate a payment. No money will move and no products will be shipped."
                  : <>Thank you, <strong className="text-gray-800">{form.clientName.trim()}</strong>! We have received your order and our team will review it shortly.</>}
              </p>

              <div className="mt-6 w-full rounded-2xl border border-gray-200 bg-gray-50 p-5 text-left">
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Order Number</p>
                    <p className="text-sm font-black text-yellow-700">{confirmation.reference}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Total Amount</p>
                    <p className="text-sm font-black text-gray-900">{formatPeso(confirmation.total, 2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Shipping Fee</p>
                    <p className="text-sm font-black text-gray-900">{confirmation.shipping ? `${formatPeso(confirmation.shipping, 2)} · ${confirmation.distanceKm} km` : "No delivery fee"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Payment Method</p>
                    <p className="text-sm font-bold text-gray-800">{confirmation.testPayment ? "GCash (SikatPay test)" : paymentLabel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Order Status</p>
                    <p className="text-sm font-bold text-amber-600">{confirmation.testPayment ? "Test payment pending" : "Order Under Review"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{confirmation.fulfillmentMethod === "PICKUP" ? "Fulfillment" : "Deliver To"}</p>
                    <p className="text-sm font-medium text-gray-700">{confirmation.testPayment ? "Test order only" : confirmation.fulfillmentMethod === "PICKUP" ? "Pickup instructions will be shared when the order is ready." : `${form.address.trim()}${form.barangay ? `, ${form.barangay.trim()}` : ""}, ${form.city.trim()}, ${form.province.trim()}${form.postalCode.trim() ? ` ${form.postalCode.trim()}` : ""}`}</p>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-gray-500">
                {confirmation.testPayment ? "Check the test payment status in your client dashboard." : paymentMethod === "CASH_ON_DELIVERY"
                ? "Pay cash when your order is delivered. Follow the order status in your client dashboard."
                : paymentMethod === "CASH_ON_PICKUP"
                  ? "Pay cash when you collect your order after it is marked ready for pickup."
                  : "Our team will confirm the order and delivery fee first. Then pay by GCash from your client dashboard; the payment stays pending until verified."}{" "}
                Keep your order number for reference.
              </p>

              {confirmation.testPayment && (
                <a href={confirmation.checkoutUrl || "/client/dashboard#orders"} className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">
                  {confirmation.checkoutUrl ? "Continue to test checkout" : "Open your orders to resume test payment"}
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  closeCheckout()
                  setConfirmation(null)
                }}
                className="mt-7 w-full rounded-xl bg-yellow-400 px-4 py-3.5 text-sm font-black text-black shadow-lg shadow-yellow-400/25 transition-all hover:bg-yellow-300 sm:w-auto sm:px-10"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* ---------- Empty guard ---------- */
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-300">
              <CartIcon className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-gray-700">Your cart is empty</p>
            <button
              type="button"
              onClick={() => {
                closeCheckout()
                setConfirmation(null)
              }}
              className="rounded-lg bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/15 bg-gradient-to-r from-slate-950 to-[#0b5360] px-5 py-4 text-white sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-200/15 text-teal-100 sm:flex">
                  <CartIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight sm:text-2xl">Checkout</h2>
                  <p className="mt-0.5 text-xs text-slate-200">Review your details and place your order.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCheckout}
                disabled={submitting}
                aria-label="Close checkout"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 text-white hover:bg-white/10 disabled:opacity-50"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </header>

            <div className="grid min-w-0 gap-4 bg-slate-50 p-4 sm:gap-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <fieldset disabled={submitting} className="min-w-0 space-y-4">
                <section className={sectionClass} aria-labelledby="checkout-contact">
                  <h3 id="checkout-contact" className="text-base font-bold text-slate-950">Contact details</h3>
                  <p className="mt-1 text-xs text-slate-600">We use the details from your client account.</p>
                  <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                    <CheckoutField label="Full name" error={errors.clientName} className="sm:col-span-2">
                      <input value={form.clientName} readOnly autoComplete="name" aria-invalid={Boolean(errors.clientName)} className={inputClass} />
                    </CheckoutField>
                    <CheckoutField label="Email address" error={errors.email}>
                      <input type="email" value={form.email} readOnly autoComplete="email" aria-invalid={Boolean(errors.email)} className={inputClass} />
                    </CheckoutField>
                    <CheckoutField label="Mobile number" error={errors.phone}>
                      <input type="tel" value={form.phone} readOnly autoComplete="tel" aria-invalid={Boolean(errors.phone)} className={inputClass} />
                    </CheckoutField>
                  </div>
                </section>

                <section className={sectionClass} aria-labelledby="checkout-fulfillment">
                  <h3 id="checkout-fulfillment" className="text-base font-bold text-slate-950">Delivery or pickup</h3>
                  <div className="mt-4">
                    <CheckoutField label="Fulfillment method">
                      <select value={fulfillmentMethod} onChange={(event) => selectFulfillment(event.target.value === "PICKUP" ? "PICKUP" : "DELIVERY")} className={`${inputClass} border-teal-600/50 bg-teal-50 font-bold`}>
                        <option value="DELIVERY">Deliver to address</option>
                        <option value="PICKUP">Pick up</option>
                      </select>
                    </CheckoutField>
                  </div>

                  {delivery ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                      <h4 className="text-sm font-bold text-slate-950">Delivery address</h4>
                      <p className="mt-1 text-xs text-slate-600">Select your location, then enter your street address.</p>
                      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                        <CheckoutField label="Province" error={errors.province}>
                          <select value={form.province} onChange={(event) => selectProvince(event.target.value)} disabled={locationLoading} autoComplete="address-level1" required aria-invalid={Boolean(errors.province)} className={inputClass}>
                            <option value="">{locationLoading ? "Loading provinces..." : "Select province"}</option>
                            {locations.map((location) => <option key={location.code} value={location.province}>{location.province}</option>)}
                          </select>
                        </CheckoutField>
                        <CheckoutField label="City or municipality" error={errors.city}>
                          <select value={form.city} onChange={(event) => selectCity(event.target.value)} disabled={!form.province || locationLoading} autoComplete="address-level2" required aria-invalid={Boolean(errors.city)} className={inputClass}>
                            <option value="">{form.province ? "Select city or municipality" : "Select province first"}</option>
                            {municipalityOptions.map((municipality) => <option key={municipality.code} value={municipality.name}>{municipality.name}</option>)}
                          </select>
                        </CheckoutField>
                        <CheckoutField label="Barangay" error={errors.barangay}>
                          <select value={form.barangay} onChange={(event) => {
                            setForm((current) => ({ ...current, barangay: event.target.value, postalCode: "" }))
                            setErrors((current) => ({ ...current, barangay: undefined }))
                          }} disabled={!form.city} required aria-invalid={Boolean(errors.barangay)} className={inputClass}>
                            <option value="">{form.city ? "Select barangay" : "Select city first"}</option>
                            {barangayOptions.map((barangay) => <option key={barangay.code} value={barangay.name}>{barangay.name}</option>)}
                          </select>
                        </CheckoutField>
                        <CheckoutField label="Postal code" error={errors.postalCode}>
                          <input value={form.postalCode} readOnly placeholder={postalLoading ? "Finding code..." : "Filled automatically"} autoComplete="postal-code" aria-invalid={Boolean(errors.postalCode)} className={inputClass} />
                        </CheckoutField>
                        <CheckoutField label="Street address" error={errors.address} className="sm:col-span-2">
                          <input value={form.address} onChange={(event) => setField("address", event.target.value)} placeholder="House or unit number, street, subdivision" autoComplete="street-address" required aria-invalid={Boolean(errors.address)} className={inputClass} />
                        </CheckoutField>
                        <CheckoutField label="Delivery notes (optional)" className="sm:col-span-2">
                          <textarea value={form.deliveryNotes} onChange={(event) => setField("deliveryNotes", event.target.value)} placeholder="Landmark or instructions for the rider" rows={2} className={`${inputClass} resize-y`} />
                        </CheckoutField>
                        {locationError && <p role="alert" className="text-xs font-semibold text-red-700 sm:col-span-2">{locationError} Refresh the page to try again.</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
                      <p className="font-bold">Pickup at Elettro</p>
                      <p className="mt-1">Pickup instructions will appear in your client dashboard when your order is ready.</p>
                    </div>
                  )}
                </section>

                <section className={sectionClass} aria-labelledby="checkout-payment">
                  <h3 id="checkout-payment" className="text-base font-bold text-slate-950">Payment method</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {PAYMENT_METHODS.filter((method) => method.id === "GCASH" || method.id === (delivery ? "CASH_ON_DELIVERY" : "CASH_ON_PICKUP")).map((method) => {
                      const active = paymentMethod === method.id
                      const gcash = method.id === "GCASH"
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          disabled={gcash && !gcashAvailable}
                          aria-pressed={active}
                          className={`min-w-0 rounded-xl border p-3.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 ${active ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:border-teal-400"} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70`}
                        >
                          <span className="flex items-center justify-between gap-2 text-sm font-bold text-slate-950">
                            {gcash && gcashTestMode ? "GCash (test only)" : method.label}
                            {active && <CheckIcon className="h-4 w-4 shrink-0 text-teal-700" />}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-600">
                            {gcash && !gcashAvailable ? "Currently unavailable" : gcash && gcashTestMode ? "Simulate payment with SikatPay." : method.hint}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-600">
                    {testCheckout ? "Continue to SikatPay after saving your test order. The simulation will not move real money." : PAYMENT_METHODS.find((method) => method.id === paymentMethod)?.note}
                  </p>
                </section>
              </fieldset>

              <aside className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-24" aria-labelledby="checkout-summary">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="checkout-summary" className="text-lg font-black tracking-tight text-slate-950">Order summary</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{count} {count === 1 ? "item" : "items"}</span>
                </div>
                <ul className="mt-3 max-h-56 divide-y divide-slate-100 overflow-y-auto">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-900">{item.name}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{item.quantity} {item.unit || "pcs"} at {formatPeso(item.unitPrice, 2)}</p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-950">{formatPeso(Number(item.unitPrice) * item.quantity, 2)}</span>
                    </li>
                  ))}
                </ul>

                <dl className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-600">Subtotal</dt><dd className="font-semibold tabular-nums">{formatPeso(subtotal, 2)}</dd></div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-600">{delivery ? "Delivery fee" : "Pickup"}</dt>
                    <dd aria-live="polite" className="text-right text-xs font-semibold text-slate-700">
                      {!delivery ? "No delivery fee" : shippingLoading ? "Calculating..." : shippingEstimate ? formatPeso(shippingEstimate.shippingFee, 2) : "Enter delivery address"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 text-base font-black text-slate-950">
                    <dt>{delivery && !shippingEstimate ? "Estimated total" : "Total"}</dt><dd className="tabular-nums">{formatPeso(total, 2)}</dd>
                  </div>
                </dl>
                {delivery && shippingError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{shippingError}</p>}
                {serverError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{serverError}</p>}

                <button
                  type="submit"
                  disabled={submitting || (delivery && shippingLoading) || (paymentMethod === "GCASH" && !gcashAvailable)}
                  className="mt-4 w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-60"
                >
                  {submitting ? "Saving order..." : testCheckout ? "Save test order" : delivery ? "Place order" : "Reserve for pickup"}
                </button>
              </aside>
            </div>
          </form>
        )}
      </div>
    </div>
    </ClientSessionGate>
  )
}

function CheckoutField({ label, error, className = "", children }: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block min-w-0 text-xs font-semibold text-slate-700 ${className}`}>
      {label}
      {children}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  )
}
