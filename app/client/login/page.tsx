"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState, type FormEvent } from "react"

function ClientLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const checkoutPrompt = searchParams?.get("reason") === "checkout"

  useEffect(() => {
    setEmail(searchParams?.get("email") || "")
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.user?.role === "CLIENT" && data.user.status === "ACTIVE" && data.user.emailVerifiedAt) {
          router.replace("/client/dashboard")
        }
      })
      .catch(() => {})
  }, [router, searchParams])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/auth/client-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not sign in.")
      router.replace("/client/dashboard")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.")
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    setResending(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/auth/resend-client-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not process the request.")
      setMessage(data.message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not process the request.")
    } finally {
      setResending(false)
    }
  }

  const inputClass = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-yellow-400 focus:bg-white/10 focus:ring-2 focus:ring-yellow-400/20"

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0f10] px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,196,0,0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.08),transparent_50%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={64} height={64} className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-xl shadow-yellow-400/20" />
          <h1 className="mt-4 text-2xl font-black tracking-wide text-white">ELETTRO</h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-400">Engineering Enterprises</p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">Client portal</p>
            <h2 className="mt-2 text-xl font-black text-white">Welcome back</h2>
            <p className="mt-1 text-sm leading-5 text-gray-400">Sign in to manage your orders, bookings, and account.</p>
          </div>

          {checkoutPrompt && <div role="status" className="mb-5 rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm font-bold leading-5 text-yellow-200">Please log in or sign up to continue checkout.</div>}

          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-semibold text-gray-300">
              Email address
              <input id="client-email" className={`mt-1.5 ${inputClass}`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </label>

            <label className="block text-sm font-semibold text-gray-300">
              Password
              <span className="mt-1.5 flex gap-2">
                <input id="client-password" className={inputClass} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 rounded-xl border border-white/15 px-3 text-xs font-bold text-gray-400 transition hover:border-yellow-400 hover:text-yellow-300" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
              </span>
            </label>

            {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-300">{error}</p>}
            {message && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-300">{message}</p>}

            <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Signing in..." : "Sign in to client portal"}
            </button>
          </form>

          <button type="button" disabled={!email || resending} onClick={resend} className="mt-4 w-full text-center text-sm font-semibold text-gray-400 transition hover:text-yellow-400 disabled:cursor-not-allowed disabled:text-gray-600">
            {resending ? "Sending verification email..." : "Resend verification email"}
          </button>
        </section>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">New to ELETTRO? <Link href="/client/register" className="font-bold text-yellow-400 transition hover:text-yellow-300">Create a client account</Link></p>
        </div>
        <Link href="/" className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-400 transition hover:text-yellow-400">
          <span aria-hidden="true">←</span> Back to Website
        </Link>
      </div>
    </div>
  )
}

export default function ClientLoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0b0f10]" />}><ClientLoginForm /></Suspense>
}

