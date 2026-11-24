"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState, type FormEvent } from "react"

const loginPaths: Record<string, string> = {
  warehouse: "/warehouse/login",
  sales: "/sales/login",
  client: "/client/login",
}

function ForgotPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = (searchParams?.get("role") || "").toLowerCase()
  const loginPath = loginPaths[role] || "/client/login"
  const portalName = role === "warehouse" ? "warehouse" : role === "sales" ? "sales" : "client"
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function post(path: string, body: Record<string, string>) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Something went wrong.")
    return data
  }

  async function requestCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError(""); setMessage("")
    try {
      const data = await post("/api/auth/forgot-password", { email })
      setMessage(data.message || "If that email belongs to an active account, a reset code is on its way.")
      setStep(2)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send the reset code.")
    } finally { setBusy(false) }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError(""); setMessage("")
    try {
      await post("/api/auth/reset-password/verify", { email, code })
      setStep(3)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The code is invalid or expired.")
    } finally { setBusy(false) }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError(""); setMessage("")
    try {
      const data = await post("/api/auth/reset-password", { email, code, password })
      setMessage(data.message || "Your password has been reset. You can sign in now.")
      setTimeout(() => router.replace(`${loginPath}?email=${encodeURIComponent(email)}`), 900)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reset your password.")
    } finally { setBusy(false) }
  }

  const inputClass = "mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
  const title = step === 1 ? "Recover your password" : step === 2 ? "Enter your recovery code" : "Choose a new password"
  const subtitle = step === 1 ? `Enter your ${portalName} account email and we'll send a 6-digit recovery code.` : step === 2 ? "Check your email. The code expires in 15 minutes." : "Set a new password of at least 6 characters."

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0f10] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,196,0,0.14),transparent_55%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      <main className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={64} height={64} className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-xl shadow-yellow-400/20" />
          <h1 className="mt-4 text-2xl font-black tracking-wide text-white">ELETTRO</h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-400">Engineering Enterprises</p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          <Link href={loginPath} className="text-sm font-semibold text-gray-400 transition hover:text-yellow-400">← Back to sign in</Link>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">Password recovery</p>
          <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-gray-400">{subtitle}</p>

          {error && <p role="alert" className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-300">{error}</p>}
          {message && <p role="status" className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-300">{message}</p>}

          {step === 1 && <form onSubmit={requestCode} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-gray-300">Email address<input className={inputClass} type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></label>
            <button disabled={busy} className="w-full rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 disabled:opacity-60">{busy ? "Sending code..." : "Send recovery code"}</button>
          </form>}

          {step === 2 && <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-gray-300">6-digit recovery code<input className={inputClass} type="text" inputMode="numeric" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" required /></label>
            <button disabled={busy || code.length !== 6} className="w-full rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 disabled:opacity-60">{busy ? "Checking code..." : "Verify code"}</button>
            <button type="button" onClick={() => { setStep(1); setError(""); setMessage("") }} className="w-full text-sm font-semibold text-gray-400 transition hover:text-yellow-400">Use a different email</button>
          </form>}

          {step === 3 && <form onSubmit={resetPassword} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-gray-300">New password<input className={inputClass} type="password" minLength={6} value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required /></label>
            <button disabled={busy} className="w-full rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 disabled:opacity-60">{busy ? "Saving password..." : "Reset password"}</button>
          </form>}
        </section>
      </main>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0b0f10]" />}><ForgotPasswordForm /></Suspense>
}
