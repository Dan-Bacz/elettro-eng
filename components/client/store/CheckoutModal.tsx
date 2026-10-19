"use client"

import { useEffect, useMemo, useState } from "react"
import { useCart } from "./CartContext"
import { CartIcon, CheckIcon, CloseIcon } from "./storeIcons"
import { formatPeso } from "./storeUtils"
import ClientSessionGate from "../ClientSessionGate"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const GCASH_CONFIGURED = Boolean(
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
  paymentMethod: string
  fulfillmentMethod: string
  status: string
}

function isValidPhone(p: string) {
  const digits = (p || "").replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 15
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
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY")
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY")
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  useEffect(() => {
    if (!checkoutOpen) return
    let active = true
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !data?.user) return
        setForm((current) => ({
          ...current,
          clientName: data.user.name || current.clientName,
          email: data.user.email || current.email,
          phone: data.user.phone || current.phone,
        }))
      })
      .catch((reason) => console.error("Could not load client contact details:", reason))
    return () => { active = false }
  }, [checkoutOpen])

  const paymentLabel = useMemo(
    () => PAYMENT_METHODS.find((p) => p.id === paymentMethod)?.label || paymentMethod,
    [paymentMethod]
  )

  if (!checkoutOpen) return null

  function setField(key: FormField, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
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
      if (!form.city.trim()) next.city = "Municipality / City is required"
      if (!form.province.trim()) next.province = "Province is required"
      if (form.postalCode.trim() && !/^\d{4}$/.test(form.postalCode.trim())) next.postalCode = "4-digit postal code"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) return
    setServerError("")
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.clientName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          barangay: form.barangay.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          postalCode: form.postalCode.trim(),
          deliveryNotes: form.deliveryNotes.trim(),
          fulfillmentMethod,
          paymentMethod,
          items: items.map((it) => ({ inventoryItemId: it.id, quantity: it.quantity })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to place order")
      setConfirmation({
        reference: data.reference,
        total: Number(data.total ?? subtotal),
        paymentMethod: data.paymentMethod || paymentMethod,
        fulfillmentMethod: data.fulfillmentMethod || fulfillmentMethod,
        status: data.status || "PENDING",
      })
      clear()
    } catch (err: any) {
      setServerError(err?.message || "Failed to place order")
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"

  return (
    <ClientSessionGate>
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {confirmation ? (
          /* ---------- Order confirmation ---------- */
          <div className="p-6 sm:p-10">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckIcon className="w-8 h-8" />
              </div>
              <h2 className="mt-4 text-2xl font-black text-gray-900">Order Placed Successfully</h2>
              <p className="mt-2 text-sm text-gray-500">
                Thank you, <strong className="text-gray-800">{form.clientName.trim()}</strong>! We have received your
                order and our team will review it shortly.
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
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Payment Method</p>
                    <p className="text-sm font-bold text-gray-800">{paymentLabel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Order Status</p>
                    <p className="text-sm font-bold text-amber-600">Order Under Review</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{confirmation.fulfillmentMethod === "PICKUP" ? "Fulfillment" : "Deliver To"}</p>
                    <p className="text-sm font-medium text-gray-700">{confirmation.fulfillmentMethod === "PICKUP" ? "Pickup instructions will be shared when the order is ready." : `${form.address.trim()}${form.barangay ? `, ${form.barangay.trim()}` : ""}, ${form.city.trim()}, ${form.province.trim()}${form.postalCode.trim() ? ` ${form.postalCode.trim()}` : ""}`}</p>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-gray-500">
                {paymentMethod === "CASH_ON_DELIVERY"
                ? "Pay cash when your order is delivered. Follow the order status in your client dashboard."
                : paymentMethod === "CASH_ON_PICKUP"
                  ? "Pay cash when you collect your order after it is marked ready for pickup."
                  : "Our team will confirm the order and delivery fee first. Then pay by GCash from your client dashboard; the payment stays pending until verified."}{" "}
                Keep your order number for reference.
              </p>

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
          /* ---------- Checkout form ---------- */
          <form onSubmit={handleSubmit} noValidate>
            <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">Checkout</h2>
                <p className="text-xs text-gray-500">{count} item{count === 1 ? "" : "s"} in your order</p>
              </div>
              <button
                type="button"
                onClick={closeCheckout}
                aria-label="Close checkout"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
              {/* Left: forms */}
              <div className="space-y-7 px-6 py-6">
                <section>
                  <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">Customer Information</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-gray-700">Full Name *</label>
                      <input value={form.clientName} readOnly autoComplete="name" className={`${inputClass} bg-gray-50`} />
                      {errors.clientName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.clientName}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Email Address *</label>
                      <input type="email" value={form.email} readOnly autoComplete="email" className={`${inputClass} bg-gray-50`} />
                      {errors.email && <p className="mt-1 text-xs font-semibold text-red-600">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Mobile Number *</label>
                      <input type="tel" value={form.phone} readOnly autoComplete="tel" className={`${inputClass} bg-gray-50`} />
                      {errors.phone && <p className="mt-1 text-xs font-semibold text-red-600">{errors.phone}</p>}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">Fulfillment</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(["DELIVERY", "PICKUP"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setFulfillmentMethod(method)
                          setPaymentMethod(method === "DELIVERY" ? "CASH_ON_DELIVERY" : "CASH_ON_PICKUP")
                        }}
                        aria-pressed={fulfillmentMethod === method}
                        className={`rounded-xl border-2 p-3 text-left text-sm font-bold ${fulfillmentMethod === method ? "border-yellow-400 bg-yellow-50" : "border-gray-200"}`}
                      >
                        {method === "DELIVERY" ? "Deliver to address" : "Pick up"}
                      </button>
                    ))}
                  </div>
                  {fulfillmentMethod === "DELIVERY" ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-gray-700">Complete Address *</label>
                      <input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="House no., street, subdivision, barangay" autoComplete="street-address" className={inputClass} />
                      {errors.address && <p className="mt-1 text-xs font-semibold text-red-600">{errors.address}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Barangay</label>
                      <input value={form.barangay} onChange={(e) => setField("barangay", e.target.value)} placeholder="Barangay" className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Municipality / City *</label>
                      <input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="e.g. Pagadian City" autoComplete="address-level2" className={inputClass} />
                      {errors.city && <p className="mt-1 text-xs font-semibold text-red-600">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Province *</label>
                      <input value={form.province} onChange={(e) => setField("province", e.target.value)} placeholder="e.g. Zamboanga del Sur" autoComplete="address-level1" className={inputClass} />
                      {errors.province && <p className="mt-1 text-xs font-semibold text-red-600">{errors.province}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-700">Postal Code</label>
                      <input value={form.postalCode} onChange={(e) => setField("postalCode", e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="e.g. 7016" inputMode="numeric" autoComplete="postal-code" className={inputClass} />
                      {errors.postalCode && <p className="mt-1 text-xs font-semibold text-red-600">{errors.postalCode}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-gray-700">Delivery Notes (optional)</label>
                      <textarea value={form.deliveryNotes} onChange={(e) => setField("deliveryNotes", e.target.value)} placeholder="Landmarks, preferred delivery time, special instructions…" rows={2} className={inputClass} />
                    </div>
                  </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600">We will share pickup instructions when your order is ready. You can pay cash when you collect it, or choose GCash.</p>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">Payment Method</h3>
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {PAYMENT_METHODS.map((method) => {
                      if (method.id === "CASH_ON_DELIVERY" && fulfillmentMethod !== "DELIVERY") return null
                      if (method.id === "CASH_ON_PICKUP" && fulfillmentMethod !== "PICKUP") return null
                      const active = paymentMethod === method.id
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => {
                            if (method.id !== "GCASH" || GCASH_CONFIGURED) setPaymentMethod(method.id)
                          }}
                          disabled={method.id === "GCASH" && !GCASH_CONFIGURED}
                          aria-pressed={active}
                          className={`rounded-xl border-2 p-3.5 text-left transition-all ${
                            active
                              ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-400/30"
                              : method.id === "GCASH" && !GCASH_CONFIGURED
                                ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                                : "border-gray-200 bg-white hover:border-yellow-300"
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <span className="text-sm font-black text-gray-900">{method.label}</span>
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                                active ? "border-yellow-500 bg-yellow-400" : "border-gray-300"
                              }`}
                            >
                              {active && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">{method.id === "GCASH" && !GCASH_CONFIGURED ? "Temporarily unavailable — GCash recipient details not configured" : method.hint}</span>
                          {active && <span className="mt-2 block text-[10px] leading-relaxed text-gray-500">{method.note}</span>}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400">
                    GCash transfers are manually verified by our team. Cash is collected upon delivery or pickup.
                  </p>
                </section>

                {serverError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{serverError}</div>
                )}
              </div>

              {/* Right: order summary */}
              <aside className="border-t border-gray-200 bg-gray-50 p-6 lg:border-l lg:border-t-0">
                <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">Order Summary</h3>
                <ul className="mt-3 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0 text-gray-700">
                        <span className="font-black text-gray-900">{item.quantity}×</span>{" "}
                        <span className="line-clamp-1 font-medium">{item.name}</span>
                        <span className="mt-0.5 block text-[11px] text-gray-400">
                          {formatPeso(item.unitPrice, 2)} / {item.unit || "pc"}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold text-gray-900">{formatPeso(Number(item.unitPrice) * item.quantity, 2)}</span>
                    </li>
                  ))}
                </ul>

                <dl className="mt-4 space-y-2 border-t border-gray-200 pt-4 text-sm">
                  <div className="flex items-center justify-between text-gray-600">
                    <dt>Subtotal</dt>
                    <dd className="font-bold text-gray-900">{formatPeso(subtotal, 2)}</dd>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <dt>Shipping</dt>
                    <dd className="text-xs font-semibold text-gray-400">{fulfillmentMethod === "PICKUP" ? "No delivery fee" : "To be calculated"}</dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base">
                    <dt className="font-black text-gray-900">Total</dt>
                    <dd className="font-black text-gray-900">{formatPeso(subtotal, 2)}</dd>
                  </div>
                </dl>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 w-full rounded-xl bg-yellow-400 px-4 py-3.5 text-sm font-black text-black shadow-lg shadow-yellow-400/25 transition-all hover:bg-yellow-300 active:scale-[0.99] disabled:opacity-60"
                >
                  {submitting ? "Placing Order…" : `Place Order · ${formatPeso(subtotal, 2)}`}
                </button>
                <p className="mt-2 text-center text-[10px] text-gray-400">
                  A valid email and mobile number are required so we can confirm your order.
                </p>
              </aside>
            </div>
          </form>
        )}
      </div>
    </div>
    </ClientSessionGate>
  )
}