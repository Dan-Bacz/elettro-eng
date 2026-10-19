"use client"

import { useState } from "react"

export default function ClientFeedbackPage() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    setSent(false)
    try {
      const response = await fetch("/api/client/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Feedback could not be sent.")
      setSubject("")
      setMessage("")
      setSent(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Feedback could not be sent.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">We value your feedback</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Submit Feedback</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Share a comment or tell us how we can improve your ELETTRO experience.</p>
        {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {sent && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Your feedback was sent to our team by email. Feedback is not stored in your dashboard history.</p>}
        <form onSubmit={submitFeedback} className="mt-6 space-y-5">
          <div>
            <label htmlFor="feedback-subject" className="mb-2 block text-sm font-semibold text-slate-700">Subject</label>
            <input id="feedback-subject" required minLength={3} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100" />
          </div>
          <div>
            <label htmlFor="feedback-message" className="mb-2 block text-sm font-semibold text-slate-700">Your feedback</label>
            <textarea id="feedback-message" required minLength={10} maxLength={5000} rows={7} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100" />
            <p className="mt-1 text-right text-xs text-slate-400">{message.length}/5,000</p>
          </div>
          <button type="submit" disabled={submitting} className="rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Sending…" : "Send feedback"}</button>
        </form>
      </section>
    </div>
  )
}
