"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"

type ClientSession = {
  id: string
  name: string
  email: string
  role: string
  status: string
  emailVerifiedAt: string | null
}

export default function ClientSessionGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ClientSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active) setSession(data?.user ?? null)
      })
      .catch(() => {
        if (active) setError("We could not check your account. Please refresh and try again.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function resendVerification() {
    if (!session?.email) return
    setResending(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/auth/resend-client-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not resend the verification email.")
      setMessage(data.message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not resend the verification email.")
    } finally {
      setResending(false)
    }
  }

  if (loading) {
    return <div className="mx-auto my-16 h-48 max-w-3xl animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
  }

  if (session?.role === "CLIENT" && session.status === "ACTIVE" && session.emailVerifiedAt) return children

  const needsVerification = session?.role === "CLIENT" && !session.emailVerifiedAt
  const heading = needsVerification ? "Verify your email to continue" : "A verified client account is required"

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-2xl">⚡</span>
        <h1 className="mt-5 text-2xl font-black text-gray-900">{heading}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
          {needsVerification
            ? `Your account${session?.email ? ` (${session.email})` : ""} must be verified before you can place a booking or order.`
            : "Create a client account and verify your email address before submitting a service booking or product order."}
        </p>
        {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {needsVerification ? (
            <button
              type="button"
              disabled={resending}
              onClick={resendVerification}
              className="rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-60"
            >
              {resending ? "Sending..." : "Resend verification email"}
            </button>
          ) : (
            <Link href="/client/register" className="rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300">
              Create a client account
            </Link>
          )}
          <Link href="/client/login" className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-bold text-gray-800 hover:border-yellow-500">
            Client sign in
          </Link>
        </div>
        {error && !session && <p className="mt-4 text-xs text-gray-500">Please reload this page before continuing.</p>}
      </div>
    </section>
  )
}
