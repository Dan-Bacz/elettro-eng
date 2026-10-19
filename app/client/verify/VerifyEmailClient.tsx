"use client"

import Link from "next/link"
import { useState } from "react"

export default function VerifyEmailClient({ token }: { token: string }) {
  const [status, setStatus] = useState<"ready" | "loading" | "success" | "error">(token ? "ready" : "error")
  const [message, setMessage] = useState(token ? "Confirm your email address to activate your client account." : "This verification link is invalid or incomplete. Request a new link to continue.")

  async function verify() {
    setStatus("loading")
    try {
      const response = await fetch("/api/auth/verify-client-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not verify your email.")
      setMessage(data.message)
      setStatus("success")
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not verify your email.")
      setStatus("error")
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${status === "success" ? "bg-emerald-100 text-emerald-700" : status === "error" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800"}`}>
          {status === "success" ? "✓" : status === "error" ? "!" : "…"}
        </span>
        <h1 className="mt-5 text-2xl font-black text-gray-900">{status === "success" ? "Email verified" : status === "error" ? "Could not verify email" : status === "loading" ? "Confirming your email" : "Verify your email address"}</h1>
        <p role={status === "error" ? "alert" : "status"} className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {status === "success" ? (
            <Link href="/client/login" className="rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300">Go to client sign in</Link>
          ) : status === "ready" ? (
            <button type="button" onClick={verify} className="rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300">Verify email address</button>
          ) : status === "error" ? (
            <Link href="/client/login" className="rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300">Request a new verification link</Link>
          ) : null}
          <Link href="/" className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:border-yellow-500">Back to website</Link>
        </div>
      </section>
    </main>
  )
}
