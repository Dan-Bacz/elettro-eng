"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

type Booking = {
  id: string
  reference: string
  title: string
  description: string | null
  status: string
  startDate: string | null
  createdAt: string
  assignedTo: { id: string; name: string } | null
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
  address: string | null
  barangay: string | null
  city: string | null
  province: string | null
  postalCode: string | null
  deliveryNotes: string | null
  fulfillmentNote: string | null
  createdAt: string
  updatedAt: string
  items: { id: string; name: string; quantity: number; unit: string | null; unitPrice: number }[]
}

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read: boolean
  createdAt: string
}

type DashboardData = {
  user: { id: string; name: string; email: string; phone: string | null; emailVerifiedAt: string | null }
  counts: { bookings: number; pendingBookings: number; activeBookings: number; orders: number; awaitingOrders: number }
  bookings: Booking[]
  orders: Order[]
  notifications: Notification[]
}

const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: "Under Review",
  APPROVED: "Approved",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "New order",
  APPROVED: "Confirmed",
  PROCESSING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  SHIPPED: "Shipped · to receive",
  DELIVERED: "Delivered · confirm receipt",
  COMPLETED: "Received",
  CANCELLED: "Cancelled",
}

const ORDER_FILTER_OPTIONS = [
  { value: "ALL", label: "All orders" },
  { value: "AWAITING_CONFIRMATION", label: "Awaiting confirmation" },
  { value: "TO_PAY", label: "To Pay" },
  { value: "TO_SHIP", label: "To Ship" },
  { value: "TO_RECEIVE", label: "To Receive" },
  { value: "COMPLETED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
]

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "PHP" }).format(Number(value) || 0)
}

function detailValue(description: string | null, key: string) {
  const line = description?.split(/\r?\n/).find((entry) => entry.toLowerCase().startsWith(`${key.toLowerCase()}:`))
  return line ? line.slice(line.indexOf(":") + 1).trim() : null
}

function statusStyle(status: string) {
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "CANCELLED") return "border-red-200 bg-red-50 text-red-800"
  if (status === "IN_PROGRESS" || status === "ASSIGNED" || status === "APPROVED") return "border-blue-200 bg-blue-50 text-blue-800"
  return "border-amber-200 bg-amber-50 text-amber-800"
}

function StatusPill({ status, labels }: { status: string; labels: Record<string, string> }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle(status)}`}>{labels[status] || status.replace(/_/g, " ")}</span>
}

function orderStatusLabel(order: Order) {
  if (order.status === "PENDING") return "Awaiting confirmation"
  if (order.status === "APPROVED" && order.paymentMethod === "GCASH" && order.paymentStatus !== "PAID") return "To Pay"
  if (order.status === "PROCESSING") return "Preparing"
  return ORDER_STATUS_LABELS[order.status] || order.status.replace(/_/g, " ")
}

function BookingProgress({ booking }: { booking: Booking }) {
  const stages = [
    { status: "SUBMITTED", label: "Submitted" },
    { status: "PENDING", label: "Under Review" },
    { status: "APPROVED", label: "Approved" },
    { status: "ASSIGNED", label: "Technician Assigned" },
    { status: "IN_PROGRESS", label: "In Progress" },
    { status: "COMPLETED", label: "Completed" },
  ]

  if (booking.status === "CANCELLED") {
    return (
      <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm">
        <span className="font-bold text-red-800">Booking cancelled</span>
        <span className="ml-2 text-red-700">The latest saved status is Cancelled.</span>
      </div>
    )
  }

  const activeIndex = Math.max(1, stages.findIndex((stage) => stage.status === booking.status))
  return (
    <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stages.map((stage, index) => {
        const complete = index < activeIndex
        const current = index === activeIndex
        return (
          <li key={stage.status} className="flex items-start gap-2">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${complete ? "bg-yellow-400 text-black" : current ? "border-2 border-yellow-500 bg-yellow-50 text-yellow-800" : "border border-gray-300 bg-white text-gray-400"}`}>
              {complete ? "✓" : index + 1}
            </span>
            <span className={`text-xs leading-4 ${current ? "font-bold text-gray-900" : complete ? "font-semibold text-gray-700" : "text-gray-400"}`}>{stage.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function OrderProgress({ order }: { order: Order }) {
  if (order.status === "CANCELLED") {
    return <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">This order is cancelled.</p>
  }
  const isGcashOrder = order.paymentMethod === "GCASH"
  const stages = isGcashOrder
    ? [
        { label: "Order Placed" },
        { label: "To Pay" },
        { label: "To Ship" },
        { label: "To Receive" },
        { label: "Received" },
      ]
    : [
        { label: "Order Placed" },
        { label: "To Process" },
        { label: "To Ship" },
        { label: "To Receive" },
        { label: "Received" },
      ]
  let activeIndex = 0
  if (order.status === "COMPLETED") activeIndex = stages.length - 1
  else if (["SHIPPED", "READY_FOR_PICKUP", "DELIVERED"].includes(order.status)) activeIndex = 3
  else if (order.status === "APPROVED") activeIndex = isGcashOrder && order.paymentStatus === "PAID" ? 2 : 1
  else if (order.status === "PROCESSING") activeIndex = 2
  return (
    <ol className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
      {stages.map((stage, index) => (
        <li key={stage.label} className={`flex items-center gap-2 text-xs ${index === activeIndex ? "font-bold text-gray-900" : index < activeIndex ? "font-semibold text-gray-700" : "text-gray-400"}`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${index < activeIndex ? "bg-yellow-400 text-black" : index === activeIndex ? "border-2 border-yellow-500 bg-yellow-50" : "border border-gray-300"}`}>{index < activeIndex ? "✓" : index + 1}</span>
          {stage.label}
        </li>
      ))}
    </ol>
  )
}

export default function ClientDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [bookingStatus, setBookingStatus] = useState("ALL")
  const [orderStatus, setOrderStatus] = useState("ALL")
  const [paymentReferences, setPaymentReferences] = useState<Record<string, string>>({})
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/client/dashboard", { cache: "no-store" })
      const result = await response.json()
      if (response.status === 401 || response.status === 403) {
        router.replace("/client/login")
        return
      }
      if (!response.ok) throw new Error(result.error || "Could not load your dashboard.")
      setData(result)
      setError("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load your dashboard.")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadDashboard()
    const interval = window.setInterval(loadDashboard, 30_000)
    return () => window.clearInterval(interval)
  }, [loadDashboard])

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.bookings ?? []).filter((booking) =>
      (bookingStatus === "ALL" || booking.status === bookingStatus) &&
      (!q || `${booking.reference} ${booking.title} ${booking.description || ""}`.toLowerCase().includes(q)),
    )
  }, [bookingStatus, data?.bookings, search])

  const filteredOrders = useMemo(() => (data?.orders ?? []).filter((order) => {
    if (orderStatus === "ALL") return true
    if (orderStatus === "AWAITING_CONFIRMATION") return order.status === "PENDING"
    if (orderStatus === "TO_PAY") return order.status === "APPROVED" && order.paymentMethod === "GCASH" && order.paymentStatus !== "PAID"
    if (orderStatus === "TO_SHIP") return ["APPROVED", "PROCESSING"].includes(order.status)
    if (orderStatus === "TO_RECEIVE") return ["SHIPPED", "READY_FOR_PICKUP", "DELIVERED"].includes(order.status)
    return order.status === orderStatus
  }), [data?.orders, orderStatus])

  async function logout() {
    setLoggingOut(true)
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (!response.ok) throw new Error("Could not securely sign out. Please try again.")
      router.replace("/client/login")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not securely sign out.")
      setLoggingOut(false)
    }
  }

  async function markNotificationRead(id: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (response.ok) await loadDashboard()
  }

  async function updateClientOrder(orderId: string, action: "submit-payment" | "confirm-received") {
    setBusyOrderId(orderId)
    setError("")
    try {
      const response = await fetch("/api/client/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          action,
          ...(action === "submit-payment" ? { paymentReference: paymentReferences[orderId] || "" } : {}),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not update your order.")
      await loadDashboard()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update your order.")
    } finally {
      setBusyOrderId(null)
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-gray-50 px-4 py-10"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-36 rounded-2xl bg-gray-200" /><div className="h-28 rounded-2xl bg-gray-200" /><div className="h-80 rounded-2xl bg-gray-200" /></div></main>
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-black text-gray-900">Dashboard unavailable</h1>
          <p className="mt-3 text-sm text-gray-600">{error || "Sign in with your verified client account to continue."}</p>
          {error && <button type="button" onClick={() => { setLoading(true); loadDashboard() }} className="mt-5 rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:border-yellow-500">Try again</button>}
          <Link href="/client/login" className="mt-5 inline-flex rounded-lg bg-yellow-400 px-5 py-3 text-sm font-bold text-black">Client sign in</Link>
        </div>
      </main>
    )
  }

  const unreadCount = data.notifications.filter((notification) => !notification.read).length
  const gcashAccountName = process.env.NEXT_PUBLIC_GCASH_ACCOUNT_NAME || ""
  const gcashAccountNumber = process.env.NEXT_PUBLIC_GCASH_ACCOUNT_NUMBER || ""
  const cards = [
    { label: "Total Service Bookings", value: data.counts.bookings, detail: "All submitted requests" },
    { label: "Under Review", value: data.counts.pendingBookings, detail: "Awaiting team review" },
    { label: "Active Services", value: data.counts.activeBookings, detail: "Approved, assigned or in progress" },
    { label: "Product Orders", value: data.counts.orders, detail: "All orders placed" },
    { label: "Awaiting Fulfillment", value: data.counts.awaitingOrders, detail: "Pending or approved orders" },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-xs font-black uppercase tracking-[0.2em] text-yellow-700">ELETTRO Engineering</Link>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">Welcome back, {data.user.name}</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your electrical services and product orders in one place.</p>
            <p className="mt-2 text-xs font-medium text-gray-400">{new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(new Date())}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/book-service" className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-yellow-300">Book a service</Link>
            <Link href="/products" className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-yellow-500">Shop products</Link>
            <button type="button" disabled={loggingOut} onClick={logout} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-red-300 hover:text-red-700 disabled:opacity-60">{loggingOut ? "Signing out..." : "Secure logout"}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 lg:px-8">
        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{error}</span>
            <button onClick={loadDashboard} className="font-bold underline">Refresh</button>
          </div>
        )}

        <section aria-label="Account overview" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card, index) => (
            <article key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-black ${index === 1 || index === 4 ? "text-yellow-700" : "text-gray-900"}`}>{card.value}</p>
              <p className="mt-1 text-xs text-gray-500">{card.detail}</p>
            </article>
          ))}
        </section>

        <section id="bookings" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-black text-gray-900">My Service Bookings</h2>
              <p className="mt-1 text-sm text-gray-500">Statuses and saved progress updates refresh automatically.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference or service" aria-label="Search bookings" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100" />
              <select value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)} aria-label="Filter bookings by status" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500">
                <option value="ALL">All statuses</option>
                {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredBookings.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-gray-500">{data.bookings.length ? "No bookings match your filters." : "You have not submitted any service bookings yet."}</p>
            ) : filteredBookings.map((booking) => {
              const offerings = detailValue(booking.description, "Selected offerings")
              const location = detailValue(booking.description, "Location")
              const preferredTime = detailValue(booking.description, "Preferred time")
              return (
                <details key={booking.id} id={`booking-${booking.id}`} className="group px-5 py-5 sm:px-6">
                  <summary className="flex cursor-pointer list-none flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-yellow-800">{booking.reference}</span>
                        <StatusPill status={booking.status} labels={BOOKING_STATUS_LABELS} />
                      </div>
                      <h3 className="mt-1 truncate font-bold text-gray-900">{booking.title}</h3>
                      <p className="mt-1 text-xs text-gray-500">Submitted {formatDate(booking.createdAt)}{location ? ` · ${location}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{booking.startDate ? `Preferred: ${formatDate(booking.startDate)}${preferredTime ? `, ${preferredTime}` : ""}` : "Schedule pending"}</span>
                      <span className="font-bold text-yellow-700 group-open:rotate-180">⌄</span>
                    </div>
                  </summary>
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Booking reference</p><p className="mt-1 font-mono text-sm font-semibold text-gray-800">{booking.reference}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Service</p><p className="mt-1 text-sm font-semibold text-gray-800">{booking.title}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Selected offerings</p><p className="mt-1 text-sm text-gray-700">{offerings || "Not specified"}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Preferred schedule</p><p className="mt-1 text-sm text-gray-700">{booking.startDate ? formatDate(booking.startDate) : "Not set"}{preferredTime ? ` · ${preferredTime}` : ""}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Service location</p><p className="mt-1 text-sm text-gray-700">{location || "Not specified"}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Assigned technician</p><p className="mt-1 text-sm text-gray-700">{booking.assignedTechnicians.length ? booking.assignedTechnicians.map((technician) => technician.name).join(", ") : "Not assigned"}</p></div>
                    </div>
                    <div className="mt-5 rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-600">Service progress · {BOOKING_STATUS_LABELS[booking.status] || booking.status}</p>
                      <BookingProgress booking={booking} />
                      {booking.latestUpdate && <p className="mt-4 border-t border-gray-200 pt-3 text-sm text-gray-700"><span className="font-bold">Latest update · {formatDate(booking.latestUpdate.createdAt, true)}:</span> {booking.latestUpdate.message}</p>}
                    </div>
                    {booking.description && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Submitted details</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">{booking.description}</p></div>}
                  </div>
                </details>
              )
            })}
          </div>
        </section>

        <section id="orders" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div><h2 className="text-lg font-black text-gray-900">My Product Orders</h2><p className="mt-1 text-sm text-gray-500">Order statuses reflect saved fulfillment updates.</p></div>
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} aria-label="Filter orders by status" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500">
              <option value="ALL">All statuses</option>
              {ORDER_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredOrders.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-gray-500">{data.orders.length ? "No orders match this filter." : "You have not placed any product orders yet."}</p>
            ) : filteredOrders.map((order) => (
              <details key={order.id} id={`order-${order.id}`} className="group px-5 py-5 sm:px-6">
                <summary className="flex cursor-pointer list-none flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-yellow-800">{order.reference}</span><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle(order.status)}`}>{orderStatusLabel(order)}</span></div>
                    <p className="mt-1 text-sm font-bold text-gray-900">{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</p>
                    <p className="mt-1 text-xs text-gray-500">Placed {formatDate(order.createdAt)} · {order.fulfillmentMethod === "PICKUP" ? "Pickup" : "Delivery"} · Payment {order.paymentStatus.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex items-center gap-4"><span className="text-sm font-black text-gray-900">{formatMoney(order.total + order.shipping)}</span><span className="font-bold text-yellow-700 group-open:rotate-180">⌄</span></div>
                </summary>
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Order reference</p><p className="mt-1 font-mono text-sm font-semibold">{order.reference}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Order date</p><p className="mt-1 text-sm text-gray-700">{formatDate(order.createdAt, true)}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Payment status</p><p className="mt-1 text-sm text-gray-700">{order.paymentStatus.replace(/_/g, " ")}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Payment method</p><p className="mt-1 text-sm text-gray-700">{order.paymentMethod.replace(/_/g, " ")}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Fulfillment</p><p className="mt-1 text-sm text-gray-700">{order.fulfillmentMethod === "PICKUP" ? "Pickup" : "Delivery"}</p></div>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <thead className="text-xs text-gray-500"><tr><th className="py-2 font-semibold">Product</th><th className="py-2 font-semibold">Quantity</th><th className="py-2 text-right font-semibold">Unit price</th><th className="py-2 text-right font-semibold">Line total</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">{order.items.map((item) => <tr key={item.id}><td className="py-2 font-medium text-gray-800">{item.name}</td><td className="py-2 text-gray-600">{item.quantity} {item.unit || ""}</td><td className="py-2 text-right text-gray-600">{formatMoney(item.unitPrice)}</td><td className="py-2 text-right font-semibold text-gray-800">{formatMoney(item.unitPrice * item.quantity)}</td></tr>)}</tbody>
                      <tfoot><tr><td colSpan={3} className="pt-3 text-right text-xs font-semibold text-gray-500">{order.fulfillmentMethod === "DELIVERY" && !order.shippingConfirmed ? "Products total · delivery fee pending" : "Total including delivery fee"}</td><td className="pt-3 text-right font-black text-gray-900">{formatMoney(order.total + order.shipping)}</td></tr></tfoot>
                    </table>
                  </div>
                  <div className="mt-4 rounded-xl bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-gray-600">Order progress · {orderStatusLabel(order)}</p><p className="text-xs text-gray-500">Last saved update: {formatDate(order.updatedAt, true)}</p></div>
                    <OrderProgress order={order} />
                  </div>
                  {order.fulfillmentMethod === "DELIVERY" && <p className="mt-4 text-sm text-gray-600"><span className="font-bold text-gray-700">Delivery address:</span> {[order.address, order.barangay, order.city, order.province, order.postalCode].filter(Boolean).join(", ") || "Not specified"}</p>}
                  {order.deliveryNotes && <p className="mt-2 text-sm text-gray-600"><span className="font-bold text-gray-700">Delivery notes:</span> {order.deliveryNotes}</p>}
                  {order.paymentMethod === "GCASH" && order.paymentStatus !== "PAID" && order.status === "PENDING" && (
                    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your order is awaiting confirmation. We will confirm the delivery fee before payment is due.</p>
                  )}
                  {order.paymentMethod === "GCASH" && order.paymentStatus !== "PAID" && order.status === "APPROVED" && order.shippingConfirmed && (
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <h4 className="text-sm font-bold text-blue-900">Pay with GCash</h4>
                      {gcashAccountName && gcashAccountNumber ? (
                        <>
                          <p className="mt-2 text-sm text-blue-900">Send <strong>{formatMoney(order.total + order.shipping)}</strong> to <strong>{gcashAccountName}</strong> at <strong>{gcashAccountNumber}</strong>.</p>
                          {["UNPAID", "SUBMITTED"].includes(order.paymentStatus) ? (
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                              <label className="flex-1 text-xs font-semibold text-blue-900">
                                {order.paymentStatus === "SUBMITTED" ? "Update GCash transaction reference" : "GCash transaction reference"}
                                <input
                                  value={paymentReferences[order.id] ?? order.paymentReference ?? ""}
                                  onChange={(event) => setPaymentReferences((current) => ({ ...current, [order.id]: event.target.value }))}
                                  maxLength={80}
                                  className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900"
                                  placeholder="Enter the reference from your GCash receipt"
                                />
                              </label>
                              <button type="button" disabled={busyOrderId === order.id} onClick={() => updateClientOrder(order.id, "submit-payment")} className="self-end rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                                {busyOrderId === order.id ? "Submitting…" : order.paymentStatus === "SUBMITTED" ? "Update reference" : "Submit reference"}
                              </button>
                            </div>
                          ) : null}
                          {order.paymentStatus === "SUBMITTED" && <p className="mt-2 text-sm font-semibold text-blue-800">Reference {order.paymentReference || "submitted"} is awaiting manual verification. This order is not marked paid yet.</p>}
                        </>
                      ) : <p className="mt-2 text-sm leading-5 text-blue-800">GCash recipient details are not configured yet. Please contact ELETTRO before transferring funds.</p>}
                    </div>
                  )}
                  {order.fulfillmentNote && <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-gray-700"><span className="font-bold">{order.fulfillmentMethod === "PICKUP" ? "Pickup instructions:" : "Fulfillment update:"}</span> {order.fulfillmentNote}</p>}
                  {order.paymentMethod === "GCASH" && order.paymentStatus === "PAID" && <p className="mt-3 text-sm font-semibold text-emerald-700">GCash payment verified.</p>}
                  {order.paymentMethod !== "GCASH" && order.paymentStatus !== "PAID" && <p className="mt-3 text-xs text-gray-600">Payment is due in cash when your order is {order.fulfillmentMethod === "PICKUP" ? "picked up" : "delivered"}.</p>}
                  {order.status === "READY_FOR_PICKUP" && <p className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">Your order is ready for pickup. Follow the pickup instructions provided by our team.</p>}
                  {order.status === "DELIVERED" && <p className="mt-3 rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">The order has been marked delivered. Confirm once you have received it.</p>}
                  {["DELIVERED", "READY_FOR_PICKUP"].includes(order.status) && (
                    <button type="button" disabled={busyOrderId === order.id} onClick={() => updateClientOrder(order.id, "confirm-received")} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                      {busyOrderId === order.id ? "Saving…" : order.status === "READY_FOR_PICKUP" ? "Confirm pickup received" : "Confirm order received"}
                    </button>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div><h2 className="font-black text-gray-900">Notifications</h2><p className="mt-1 text-xs text-gray-500">{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You are all caught up"}</p></div>
              <button type="button" onClick={loadDashboard} className="text-xs font-bold text-yellow-800 hover:underline">Refresh updates</button>
            </div>
            <div className="divide-y divide-gray-100">
              {data.notifications.length === 0 ? <p className="px-6 py-7 text-sm text-gray-500">Important account and order updates will appear here.</p> : data.notifications.map((notification) => (
                <article key={notification.id} className={`flex items-start justify-between gap-4 px-5 py-4 sm:px-6 ${notification.read ? "" : "bg-yellow-50/60"}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-gray-900">{notification.title}</h3>{!notification.read && <span className="h-2 w-2 rounded-full bg-yellow-500" aria-label="Unread" />}</div>
                    {notification.message && <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-gray-600">{notification.message}</p>}
                    <p className="mt-2 text-xs text-gray-400">{formatDate(notification.createdAt, true)}</p>
                    {notification.link && <Link href={notification.link} className="mt-2 inline-block text-xs font-bold text-yellow-800 hover:underline">View update</Link>}
                  </div>
                  {!notification.read && <button type="button" onClick={() => markNotificationRead(notification.id)} className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-900">Mark read</button>}
                </article>
              ))}
            </div>
          </div>
          <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-black text-gray-900">Account information</h2>
            <p className="mt-1 text-xs text-gray-500">Verified client account</p>
            <dl className="mt-5 space-y-4">
              <div><dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Full name</dt><dd className="mt-1 text-sm font-semibold text-gray-800">{data.user.name}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Email address</dt><dd className="mt-1 break-all text-sm font-semibold text-gray-800">{data.user.email}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Contact number</dt><dd className="mt-1 text-sm font-semibold text-gray-800">{data.user.phone || "Not provided"}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Email verified</dt><dd className="mt-1 text-sm font-semibold text-emerald-700">{formatDate(data.user.emailVerifiedAt)}</dd></div>
            </dl>
          </aside>
        </section>
      </div>
    </main>
  )
}
