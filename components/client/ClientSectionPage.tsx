"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"

type Booking = {
  id: string
  reference: string
  title: string
  description: string | null
  status: string
  startDate: string | null
  createdAt: string
  assignedTechnicians: { id: string; name: string }[]
  latestUpdate: { message: string; createdAt: string } | null
}

type Order = {
  id: string
  reference: string
  status: string
  paymentStatus: string
  paymentMethod: string
  paymentReference: string | null
  fulfillmentMethod: "DELIVERY" | "PICKUP"
  total: number
  shipping: number
  shippingConfirmed: boolean
  createdAt: string
  updatedAt: string
  items: { id: string; name: string; quantity: number; unit: string | null; unitPrice: number }[]
}

type DashboardResult = {
  counts: { bookings: number; pendingBookings: number; activeBookings: number; orders: number; awaitingOrders: number }
  bookings: Booking[]
  orders: Order[]
}

const bookingLabels: Record<string, string> = { PENDING: "Under review", APPROVED: "Approved", ASSIGNED: "Technician assigned", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled" }
const orderLabels: Record<string, string> = { PENDING: "Awaiting confirmation", APPROVED: "Confirmed", PROCESSING: "Preparing", READY_FOR_PICKUP: "Ready for pickup", SHIPPED: "Shipped", DELIVERED: "Delivered", COMPLETED: "Received", CANCELLED: "Cancelled" }

function date(value: string | null, time = false) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value))
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "PHP" }).format(Number(value) || 0)
}

function pill(status: string) {
  if (["COMPLETED", "APPROVED", "DELIVERED"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "CANCELLED") return "border-red-200 bg-red-50 text-red-700"
  if (["IN_PROGRESS", "ASSIGNED", "PROCESSING", "SHIPPED"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-amber-200 bg-amber-50 text-amber-700"
}

function info(description: string | null, key: string) {
  const line = description?.split(/\r?\n/).find((entry) => entry.toLowerCase().startsWith(`${key.toLowerCase()}:`))
  return line ? line.slice(line.indexOf(":") + 1).trim() : "Not specified"
}

export default function ClientSectionPage({ section }: { section: "bookings" | "orders" }) {
  const [data, setData] = useState<DashboardResult | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("ALL")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [paymentReferences, setPaymentReferences] = useState<Record<string, string>>({})

  async function load() {
    try {
      const response = await fetch("/api/client/dashboard", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not load this page.")
      setData(result)
      setError("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this page.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const bookings = useMemo(() => (data?.bookings || []).filter((item) => {
    const matchesQuery = !query.trim() || `${item.reference} ${item.title} ${item.description || ""}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesQuery && (filter === "ALL" || item.status === filter)
  }), [data?.bookings, filter, query])

  const orders = useMemo(() => (data?.orders || []).filter((item) => {
    const matchesQuery = !query.trim() || `${item.reference} ${item.items.map((entry) => entry.name).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesQuery && (filter === "ALL" || item.status === filter)
  }), [data?.orders, filter, query])

  async function updateOrder(orderId: string, action: "submit-payment" | "confirm-received") {
    setBusyId(orderId)
    try {
      const response = await fetch("/api/client/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, action, ...(action === "submit-payment" ? { paymentReference: paymentReferences[orderId] || "" } : {}) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not update the order.")
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update the order.")
    } finally {
      setBusyId(null)
    }
  }

  const isBookings = section === "bookings"
  const total = isBookings ? data?.counts.bookings || 0 : data?.counts.orders || 0
  const active = isBookings ? data?.counts.activeBookings || 0 : data?.counts.awaitingOrders || 0
  const title = isBookings ? "My service bookings" : "My product orders"
  const subtitle = isBookings ? "Follow every service request from submission to completion." : "Track fulfillment, payment, delivery, and receipts in one place."

  if (loading) return <div className="mx-auto max-w-7xl space-y-5"><div className="h-48 animate-pulse rounded-[2rem] bg-slate-200" /><div className="h-96 animate-pulse rounded-[2rem] bg-white" /></div>

  return (
    <div className="-mx-4 -my-5 min-h-full bg-[#edf2f7] px-4 py-5 sm:-mx-6 sm:-my-6 sm:px-6 sm:py-6 lg:-mx-8 lg:-my-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#0b1118] p-6 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,.85)] sm:p-8">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" /><div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Client workspace / {isBookings ? "01" : "02"}</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{subtitle}</p></div><div className="flex gap-3"><Link href="/client/dashboard" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15">Overview</Link><Link href={isBookings ? "/book-service" : "/client/products"} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-black hover:bg-yellow-300">{isBookings ? "Book a service" : "Shop products"}</Link></div></div>
        </section>

        {error && <div role="alert" className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"><span>{error}</span><button type="button" onClick={load} className="font-bold underline">Refresh</button></div>}

        <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white bg-white p-5 shadow-[0_16px_35px_-24px_rgba(15,23,42,.65)]"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Total records</p><p className="mt-3 text-4xl font-black text-slate-900">{total}</p><p className="mt-1 text-xs text-slate-500">Your complete history</p></div><div className="rounded-2xl border border-white bg-gradient-to-br from-cyan-600 to-blue-700 p-5 text-white shadow-[0_18px_36px_-20px_rgba(8,47,73,.8)]"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">{isBookings ? "Active services" : "Awaiting fulfillment"}</p><p className="mt-3 text-4xl font-black">{active}</p><p className="mt-1 text-xs text-cyan-100">Needs your attention or is in motion</p></div><div className="rounded-2xl border border-white bg-white p-5 shadow-[0_16px_35px_-24px_rgba(15,23,42,.65)]"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Last refreshed</p><p className="mt-3 text-xl font-black text-slate-900">Just now</p><p className="mt-1 text-xs text-slate-500">Updates are loaded from your account</p></div></section>

        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,.55)]"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Personal records</p><h2 className="mt-1 text-xl font-black text-slate-900">{isBookings ? "Service timeline" : "Order timeline"}</h2></div><div className="flex flex-col gap-2 sm:flex-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isBookings ? "Search service or reference" : "Search product or reference"} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500"> <option value="ALL">All statuses</option>{Object.entries(isBookings ? bookingLabels : orderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
          <div className="divide-y divide-slate-100">{isBookings ? bookings.map((booking) => <article key={booking.id} className="p-5 transition hover:bg-slate-50/80 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-cyan-700">{booking.reference}</span><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${pill(booking.status)}`}>{bookingLabels[booking.status] || booking.status}</span></div><h3 className="mt-3 text-lg font-black text-slate-900">{booking.title}</h3><p className="mt-1 text-xs text-slate-500">Submitted {date(booking.createdAt)} · {info(booking.description, "Location")}</p></div><div className="rounded-xl bg-slate-50 px-4 py-3 text-left lg:text-right"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Preferred schedule</p><p className="mt-1 text-sm font-bold text-slate-800">{date(booking.startDate)}</p></div></div><div className="mt-5 grid gap-3 rounded-2xl bg-gradient-to-r from-slate-50 to-cyan-50/50 p-4 sm:grid-cols-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Selected offerings</p><p className="mt-1 text-sm font-semibold text-slate-700">{info(booking.description, "Selected offerings")}</p></div><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Technician</p><p className="mt-1 text-sm font-semibold text-slate-700">{booking.assignedTechnicians.length ? booking.assignedTechnicians.map((item) => item.name).join(", ") : "Not assigned yet"}</p></div><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Latest update</p><p className="mt-1 text-sm font-semibold text-slate-700">{booking.latestUpdate?.message || "No progress update yet"}</p></div></div></article>) : orders.map((order) => <article key={order.id} className="p-5 transition hover:bg-slate-50/80 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-violet-700">{order.reference}</span><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${pill(order.status)}`}>{orderLabels[order.status] || order.status}</span></div><h3 className="mt-3 text-lg font-black text-slate-900">{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</h3><p className="mt-1 text-xs text-slate-500">Placed {date(order.createdAt)} · {order.fulfillmentMethod === "PICKUP" ? "Pickup" : "Delivery"}</p></div><div className="text-left lg:text-right"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Order total</p><p className="mt-1 text-2xl font-black text-slate-900">{money(order.total + order.shipping)}</p><p className="mt-1 text-xs font-semibold text-slate-500">Payment: {order.paymentStatus.replace(/_/g, " ")}</p></div></div><div className="mt-5 grid gap-3 rounded-2xl bg-gradient-to-r from-slate-50 to-violet-50/50 p-4 sm:grid-cols-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Items</p><p className="mt-1 text-sm font-semibold text-slate-700">{order.items.length} product line{order.items.length === 1 ? "" : "s"}</p></div><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Fulfillment</p><p className="mt-1 text-sm font-semibold text-slate-700">{order.fulfillmentMethod === "PICKUP" ? "Store pickup" : "Delivery"}</p></div><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Updated</p><p className="mt-1 text-sm font-semibold text-slate-700">{date(order.updatedAt, true)}</p></div></div>{order.paymentMethod === "GCASH" && order.paymentStatus !== "PAID" && order.status === "APPROVED" && order.shippingConfirmed && <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-black text-blue-900">GCash payment</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={paymentReferences[order.id] ?? order.paymentReference ?? ""} onChange={(event) => setPaymentReferences((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="GCash transaction reference" className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm" /><button type="button" disabled={busyId === order.id} onClick={() => updateOrder(order.id, "submit-payment")} className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-50">{busyId === order.id ? "Saving…" : "Submit reference"}</button></div></div>}{["DELIVERED", "READY_FOR_PICKUP"].includes(order.status) && <button type="button" disabled={busyId === order.id} onClick={() => updateOrder(order.id, "confirm-received")} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">{busyId === order.id ? "Saving…" : order.status === "DELIVERED" ? "Confirm order received" : "Confirm pickup received"}</button>}</article>)}{((isBookings ? bookings.length : orders.length) === 0) && <div className="px-6 py-16 text-center"><p className="text-lg font-black text-slate-900">No {isBookings ? "bookings" : "orders"} found</p><p className="mt-2 text-sm text-slate-500">{query || filter !== "ALL" ? "Try changing your search or filter." : isBookings ? "Your service bookings will appear here." : "Your product orders will appear here."}</p><Link href={isBookings ? "/book-service" : "/products"} className="mt-5 inline-flex rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-black">{isBookings ? "Book a service" : "Browse products"}</Link></div>}</div>
        </section>
      </div>
    </div>
  )
}
