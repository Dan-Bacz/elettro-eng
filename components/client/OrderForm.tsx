"use client"

import { useEffect, useState } from "react"

type OrderProduct = {
  id: string
  name: string
  unit?: string
  quantity: number
}

type OrderFormProps = {
  product: OrderProduct
  onClose: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function isValidPhone(p: string) {
  const digits = (p || "").replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 15
}

export default function OrderForm({ product, onClose }: OrderFormProps) {
  const [form, setForm] = useState({ clientName: "", email: "", phone: "", quantity: "1" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string>("")
  const [error, setError] = useState("")

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: "" }))
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!form.clientName.trim()) next.clientName = "Please enter your full name"
    if (!form.email.trim()) next.email = "Your email address is required"
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Please enter a valid email address"
    if (!form.phone.trim()) next.phone = "Your phone number is required"
    else if (!isValidPhone(form.phone)) next.phone = "Please enter a valid phone number"
    const qty = Math.floor(Number(form.quantity))
    if (!qty || qty < 1) next.quantity = "Quantity must be at least 1"
    else if (qty > product.quantity) next.quantity = `Only ${product.quantity} ${product.unit || "pcs"} in stock`
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
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.clientName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          items: [{ inventoryItemId: product.id, quantity: Math.floor(Number(form.quantity)) }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to submit order")
      setResult(data.reference || data.id || "your reference")
    } catch (err: any) {
      setError(err.message || "Failed to submit order")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Order Product</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">{product.name}</p>

        {result ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm font-bold text-emerald-700">Order submitted successfully!</p>
            <p className="mt-1 text-xs text-emerald-600">Your order reference is <strong>{result}</strong>.</p>
            <p className="mt-2 text-xs text-emerald-600">Our team will contact you shortly to confirm availability.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Full Name</label>
              <input
                value={form.clientName}
                onChange={(e) => setField("clientName", e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              {errors.clientName && <p className="mt-1 text-xs font-semibold text-red-600">{errors.clientName}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Email Address *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              {errors.email && <p className="mt-1 text-xs font-semibold text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Phone Number *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="e.g. 0917 123 4567"
                autoComplete="tel"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              {errors.phone && <p className="mt-1 text-xs font-semibold text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Quantity</label>
              <input
                type="number"
                min={1}
                max={product.quantity}
                value={form.quantity}
                onChange={(e) => setField("quantity", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <p className="mt-1 text-[11px] text-gray-400">{product.quantity} {product.unit || "pcs"} in stock</p>
              {errors.quantity && <p className="text-xs font-semibold text-red-600">{errors.quantity}</p>}
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div>}

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-60 transition-colors shadow-lg shadow-yellow-400/25"
            >
              {sending ? "Submitting…" : "Place Order"}
            </button>
            <p className="text-center text-[10px] text-gray-400">
              A valid email address and phone number are required so we can confirm your order.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}