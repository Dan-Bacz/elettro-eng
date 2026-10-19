"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"

export default function ClientRegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError("")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch("/api/auth/client-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not submit registration.")
      setSent(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit registration.")
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black tracking-wide text-gray-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-lg">⚡</span>
          ELETTRO <span className="font-medium text-gray-500">Engineering</span>
        </Link>
        <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {sent ? (
            <div className="py-5 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-2xl">✉</span>
              <h1 className="mt-5 text-2xl font-black text-gray-900">Registration request received</h1>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                If registration is available for <strong>{form.email}</strong>, a verification email may be delivered. Delivery is not confirmed here; if no email arrives, use the resend option.
              </p>
              <Link href={`/client/login?email=${encodeURIComponent(form.email)}`} className="mt-6 inline-flex rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300">
                Go to client sign in
              </Link>
              <p className="mt-5 text-xs text-gray-500">
                Did not receive it? <Link href={`/client/login?email=${encodeURIComponent(form.email)}`} className="font-bold text-yellow-700 hover:underline">Resend verification email</Link>
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">Client account</p>
              <h1 className="mt-2 text-2xl font-black text-gray-900">Create your account</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">Verify your email to book services, order products, and track updates in one place.</p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block space-y-1.5 text-sm font-semibold text-gray-700">
                  Full name
                  <input className={inputClass} value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" required minLength={2} maxLength={120} />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-gray-700">
                  Email address
                  <input className={inputClass} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" required maxLength={254} />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-gray-700">
                  Contact number
                  <input className={inputClass} type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" required />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-gray-700">
                  Password
                  <span className="flex gap-2">
                    <input className={inputClass} type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete="new-password" minLength={12} maxLength={72} required />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-600" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
                  </span>
                  <span className="block text-xs font-normal text-gray-500">Use at least 12 characters. Maximum 72 UTF-8 bytes.</span>
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-gray-700">
                  Confirm password
                  <span className="flex gap-2">
                    <input className={inputClass} type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} autoComplete="new-password" required />
                    <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="shrink-0 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-600" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>{showConfirmPassword ? "Hide" : "Show"}</button>
                  </span>
                </label>
                {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <button type="submit" disabled={submitting} className="w-full rounded-lg bg-yellow-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? "Submitting..." : "Create account"}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-gray-600">
                Already have an account? <Link href="/client/login" className="font-bold text-yellow-700 hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </section>
        <Link href="/" className="mt-5 block text-center text-sm text-gray-500 hover:text-gray-900">Back to ELETTRO website</Link>
      </div>
    </main>
  )
}
