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

  const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black tracking-wide text-gray-900">
          <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={36} height={36} className="h-9 w-9 rounded-xl object-cover" />
          ELETTRO <span className="font-medium text-gray-500">Engineering</span>
        </Link>
        <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">Client portal</p>
          <h1 className="mt-2 text-2xl font-black text-gray-900">Sign in</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to view your service bookings and product orders.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block space-y-1.5 text-sm font-semibold text-gray-700">
              Email address
              <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold text-gray-700">
              Password
              <span className="flex gap-2">
                <input className={inputClass} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="shrink-0 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-600" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
              </span>
            </label>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-yellow-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button type="button" disabled={!email || resending} onClick={resend} className="text-sm font-semibold text-yellow-800 hover:underline disabled:text-gray-400">
              {resending ? "Sending..." : "Resend verification email"}
            </button>
          </div>
          <p className="mt-6 text-center text-sm text-gray-600">
            New to ELETTRO? <Link href="/client/register" className="font-bold text-yellow-700 hover:underline">Create an account</Link>
          </p>
        </section>
        <Link href="/" className="mt-5 block text-center text-sm text-gray-500 hover:text-gray-900">Back to ELETTRO website</Link>
      </div>
    </main>
  )
}

export default function ClientLoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50" />}><ClientLoginForm /></Suspense>
}
