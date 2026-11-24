"use client"

import { FormEvent, useState } from "react"

type Message = { role: "assistant" | "user"; text: string }

const QUICK_PROMPTS = ["How do I book a service?", "What is my booking status?", "What services do you offer?"]

export default function ClientSupportWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi! I’m Elettro AI Support. Ask me about services, bookings, orders, or next steps." },
  ])

  async function sendMessage(event?: FormEvent, preset?: string) {
    event?.preventDefault()
    const text = (preset ?? input).trim()
    if (!text || sending) return
    setInput("")
    setMessages((current) => [...current, { role: "user", text }])
    setSending(true)
    try {
      const response = await fetch("/api/client/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Support assistant unavailable")
      setMessages((current) => [...current, { role: "assistant", text: data.reply }])
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", text: error instanceof Error ? error.message : "Please try again later." }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
      {open && (
        <section aria-label="Elettro AI customer support" className="mb-3 flex h-[min(650px,calc(100vh-120px))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-[#0b0f10] px-4 py-3 text-white">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-lg text-black">✦</span><div><p className="text-sm font-black">Elettro AI Support</p><p className="text-[10px] text-slate-400">Bookings, services, and orders</p></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support assistant" className="rounded-lg px-2 py-1 text-xl text-slate-300 hover:bg-white/10 hover:text-white">×</button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3" aria-live="polite">
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${message.role === "user" ? "rounded-br-sm bg-cyan-700 text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"}`}>{message.text}</div></div>)}
            {sending && <div className="w-fit rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-500">Thinking…</div>}
          </div>
          {messages.length === 1 && <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3 py-3">{QUICK_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => void sendMessage(undefined, prompt)} className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-[10px] font-bold text-cyan-800 hover:bg-cyan-100">{prompt}</button>)}</div>}
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 bg-white p-3"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question…" maxLength={600} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" aria-label="Support question" /><button type="submit" disabled={sending || !input.trim()} className="rounded-xl bg-yellow-400 px-3.5 py-2 text-xs font-black text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50">Send</button></form>
        </section>
      )}
      <button type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? "Close AI support" : "Open AI support"} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-yellow-400 text-2xl text-black shadow-xl shadow-slate-900/20 transition hover:scale-105 hover:bg-yellow-300">{open ? "×" : "✦"}</button>
    </div>
  )
}
