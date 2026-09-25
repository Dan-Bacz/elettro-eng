'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import StatusBadge from '../../../../components/admin/StatusBadge'
import EmptyState from '../../../../components/admin/EmptyState'
import ActivityFlow from '../../../../components/admin/dashboard/ActivityFlow'
import KpiCard from '../../../../components/admin/dashboard/KpiCard'
import BookingTrendChart from '../../../../components/admin/dashboard/BookingTrendChart'
import AnimatedDonut from '../../../../components/admin/dashboard/AnimatedDonut'
import ProgressBar from '../../../../components/admin/dashboard/ProgressBar'
import { InboxIcon, ClockIcon, GearIcon, CheckCircleIcon, CalendarIcon, BarChartIcon, BellIcon, PackageIcon, UserPlusIcon, AlertIcon, ArrowRightIcon, HammerIcon, CartIcon } from '../../../../components/admin/icons'
import type { DashboardData } from '../../../../components/admin/types'
import { formatDate } from '../../../../components/admin/types'

const SERVICE_COLORS = ['#facc15', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6']
const STOCK_COLORS: Record<string, string> = { 'In Stock': '#22c55e', 'Low Stock': '#facc15', 'Out of Stock': '#ef4444' }
const TECH_COLORS: Record<string, string> = { active: '#22c55e', onLeave: '#facc15', suspended: '#ef4444', inactive: '#94a3b8' }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

function pctChange(trend: { date: string; count: number }[]) {
  if (trend.length < 14) return null
  const last = trend.slice(-7).reduce((s, d) => s + d.count, 0)
  const prev = trend.slice(-14, -7).reduce((s, d) => s + d.count, 0)
  if (prev === 0) return last === 0 ? 0 : null
  return ((last - prev) / prev) * 100
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/admin/login')
            return
          }
          throw new Error('Failed to load dashboard')
        }
        const payload = await res.json()
        if (!cancelled) setData(payload)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const timer = window.setInterval(load, 30000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [router])

  const kpi = useMemo(() => {
    if (!data) return null
    const spark = (data.bookingTrend || []).map((d) => d.count)
    const change = pctChange(data.bookingTrend || [])
    return [
      { label: 'Total Bookings', value: data.stats.totalBookings, icon: <InboxIcon className="h-5 w-5" />, accent: 'yellow' as const, spark, change, description: 'All booking requests received', href: '/admin/bookings' },
      { label: 'Pending', value: data.stats.pending, icon: <ClockIcon className="h-5 w-5" />, accent: 'blue' as const, spark: spark.slice(-7), change: null, description: 'Awaiting approval', href: '/admin/bookings' },
      { label: 'In Progress', value: data.stats.inProgress, icon: <GearIcon className="h-5 w-5" />, accent: 'green' as const, spark, change: null, description: 'Active projects being worked on', href: '/admin/projects' },
      { label: 'Completed', value: data.stats.completed, icon: <CheckCircleIcon className="h-5 w-5" />, accent: 'purple' as const, spark, change: null, description: 'Delivered & closed projects', href: '/admin/projects' },
    ]
  }, [data])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70 lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={<AlertIcon className="h-6 w-6" />}
        title={error || 'No data available'}
        message="Try refreshing the page."
        action={<button onClick={() => router.refresh()} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black">Refresh</button>}
      />
    )
  }

  const firstName = (data.admin?.name || 'Admin').split(' ')[0]
  const serviceDonut = (data.serviceBreakdown || []).map((s, i) => ({ label: s.service, value: s.count, color: SERVICE_COLORS[i % SERVICE_COLORS.length] }))
  const stockDonut = (data.stockBreakdown || []).map((s) => ({ label: s.status, value: s.value, color: STOCK_COLORS[s.status] || '#64748b' }))
  const techDonut = Object.entries(data.technicianStatus || {}).map(([k, v]) => ({
    key: k,
    label: k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
    color: TECH_COLORS[k] || '#64748b',
  }))
  const flowDate = data.bookingTrend && data.bookingTrend.length ? data.bookingTrend[data.bookingTrend.length - 1].date : ''
  const topLow = data.stockSummary?.topLow || []
  const notifications = data.notifications || []

  const sectionTitle = 'text-sm font-black text-slate-900'
  const cardCls = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

  return (
    <div className="space-y-5">
      {/* A. Welcome + Current Activity Flow */}
      <div className="card-enter grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className={`${cardCls} flex flex-col justify-between xl:col-span-2`}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {greeting()}, {firstName}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Here's what's happening with your projects and team today.</p>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
              <CalendarIcon className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="text-sm font-black text-slate-800">
                {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-[11px] font-bold text-slate-400 tabular-nums">
                {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
            <Link
              href="/admin/reports"
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-[11px] font-bold text-yellow-400 hover:bg-slate-800 transition-colors"
            >
              <BarChartIcon className="h-3.5 w-3.5" />
              View Reports
            </Link>
          </div>
        </div>

        <div className={`${cardCls} xl:col-span-3`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={sectionTitle}>Current Activity Flow</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 border border-yellow-200 px-2.5 py-1 text-[10px] font-black text-yellow-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-500" />
              </span>
              {flowDate ? `updated ${formatDate(flowDate)}` : 'real-time'}
            </span>
          </div>
          <ActivityFlow steps={data.flow || []} />
        </div>
      </div>

      {/* B. KPI Cards */}
      <div className="card-enter grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: '0.08s' }}>
        {kpi!.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      {/* C. Analytics */}
      <div className="card-enter grid grid-cols-1 gap-5 lg:grid-cols-5" style={{ animationDelay: '0.16s' }}>
        {/* Bookings Overview line chart */}
        <div className={`${cardCls} lg:col-span-3`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className={sectionTitle}>Bookings Overview</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">Booking activity over time</p>
            </div>
          </div>
          <BookingTrendChart data={data.bookingTrend || []} />
        </div>

        {/* Bookings by service type */}
        <div className={`${cardCls} lg:col-span-1`}>
          <div className="mb-4">
            <h2 className={sectionTitle}>Bookings by Service Type</h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">Distribution of requests</p>
          </div>
          <AnimatedDonut data={serviceDonut} centerLabel="Bookings" />
        </div>

        {/* Stock overview */}
        <div className={`${cardCls} lg:col-span-1`}>
          <div className="mb-4">
            <h2 className={sectionTitle}>Stock Overview</h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">{data.stockSummary?.totalItems || 0} inventory items</p>
          </div>
          <AnimatedDonut data={stockDonut} centerLabel="Items" />
        </div>
      </div>

      {/* D. Recent Bookings */}
      <div className={`card-enter ${cardCls}`} style={{ animationDelay: '0.24s' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={sectionTitle}>Recent Bookings</h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">Latest requests across all statuses</p>
          </div>
          <Link href="/admin/bookings" className="text-xs font-bold text-black hover:text-yellow-700 transition-colors">
            View all →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4 font-bold">ID</th>
                <th className="pb-3 pr-4 font-bold">Client</th>
                <th className="pb-3 pr-4 font-bold">Service</th>
                <th className="pb-3 pr-4 font-bold">Status</th>
                <th className="pb-3 pr-4 font-bold">Date</th>
                <th className="pb-3 pr-4 font-bold">Technician</th>
                <th className="pb-3 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentBookingsAll || []).map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-yellow-50/40 transition-colors">
                  <td className="py-3 pr-4 text-xs font-bold text-slate-800">#{b.id.slice(0, 8).toUpperCase()}</td>
                  <td className="py-3 pr-4 text-xs text-slate-600">{b.clientName}</td>
                  <td className="py-3 pr-4 text-xs font-medium text-slate-600">{b.service}</td>
                  <td className="py-3 pr-4"><StatusBadge status={b.status} /></td>
                  <td className="py-3 pr-4 text-xs text-slate-400">{formatDate(b.createdAt)}</td>
                  <td className="py-3 pr-4 text-xs text-slate-500">{b.technicianName || '—'}</td>
                  <td className="py-3">
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:border-black hover:text-black transition-colors"
                    >
                      Open
                      <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {(data.recentBookingsAll || []).length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-xs text-slate-400">No bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* E + F: Recent Projects + Technician Performance */}
      <div className="card-enter grid grid-cols-1 gap-5 lg:grid-cols-2" style={{ animationDelay: '0.3s' }}>
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={sectionTitle}>Recent Projects</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">Latest projects & completion progress</p>
            </div>
            <Link href="/admin/projects" className="text-xs font-bold text-black hover:text-yellow-700 transition-colors">
              View all →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {(data.recentProjects || []).map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 transition-colors hover:bg-slate-50">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/admin/projects/${p.bookId}`} className="truncate text-xs font-bold text-slate-800 hover:text-yellow-700">
                    #{p.id.slice(0, 6).toUpperCase()} · {p.title}
                  </Link>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-slate-400">
                  <span>{p.clientName}</span>
                  <span>{p.techCount} tech{p.techCount === 1 ? '' : 's'}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1"><ProgressBar value={p.progress} /></div>
                  <span className="w-8 text-right text-[10px] font-black text-slate-500 tabular-nums">{p.progress}%</span>
                </div>
              </div>
            ))}
            {(data.recentProjects || []).length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">No projects yet</div>
            )}
          </div>
        </div>

        {/* F. Technician Performance */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={sectionTitle}>Technician Performance</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">Team availability overview</p>
            </div>
            <Link href="/admin/technicians" className="text-xs font-bold text-black hover:text-yellow-700 transition-colors">
              View all →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AnimatedDonut data={techDonut.map(({ key: _k, ...rest }) => rest)} centerLabel="Technicians" />
            <div className="flex flex-col justify-center gap-2.5">
              {techDonut.map((t) => (
                <div key={t.key} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.label}
                  </span>
                  <span className="text-sm font-black text-slate-800 tabular-nums">{t.value}</span>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between rounded-lg bg-black px-3 py-2 text-xs font-bold text-white">
                <span>Total Technicians</span>
                <span className="text-yellow-400">{data.technicians?.length || 0}</span>
              </div>
            </div>
          </div>

          {activityTrendMini(data.activityTrend)}
        </div>
      </div>

      {/* G + H: Top Stock + Alerts */}
      <div className="card-enter grid grid-cols-1 gap-5 lg:grid-cols-2" style={{ animationDelay: '0.36s' }}>
        {/* G. Top Stock Items */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={sectionTitle}>Top Stock Items</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">Items needing attention</p>
            </div>
            <Link href="/admin/inventory" className="text-xs font-bold text-black hover:text-yellow-700 transition-colors">
              View all →
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {topLow.map((item) => {
              const color = item.status === 'In Stock' ? 'bg-emerald-100 text-emerald-600' : item.status === 'Low Stock' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
              return (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 transition-colors hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-700">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.quantity} unit{item.quantity === 1 ? '' : 's'} left</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${color}`}>{item.status}</span>
                </div>
              )
            })}
            {topLow.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                All stock levels are healthy
              </div>
            )}
          </div>
        </div>

        {/* H. Alerts & Notifications */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={sectionTitle}>Alerts &amp; Notifications</h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">Recent activity across the platform</p>
            </div>
            <Link href="/admin/notifications" className="text-xs font-bold text-black hover:text-yellow-700 transition-colors">
              View all →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {(notifications.length > 3 ? notifications.slice(0, 4) : notifications).map((n) => (
              <Link
                key={n.id}
                href={n.link || '/admin/notifications'}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 transition-colors hover:bg-slate-50"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  {notificationIcon(n.type)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-slate-700">{n.title}</div>
                  {n.message && <div className="line-clamp-1 text-[10px] text-slate-400">{n.message}</div>}
                  <div className="mt-0.5 text-[9px] font-medium text-slate-300">{formatDate(n.createdAt)}</div>
                </div>
              </Link>
            ))}
            {notifications.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">No notifications yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function notificationIcon(type: string) {
  switch (type) {
    case 'LEAVE': return <CalendarIcon className="h-3.5 w-3.5" />
    case 'BOOKING': return <InboxIcon className="h-3.5 w-3.5" />
    case 'PROJECT': return <HammerIcon className="h-3.5 w-3.5" />
    case 'REPORT': return <BarChartIcon className="h-3.5 w-3.5" />
    case 'REGISTRATION': return <UserPlusIcon className="h-3.5 w-3.5" />
    case 'ORDER': return <CartIcon className="h-3.5 w-3.5" />
    case 'INVENTORY':
    case 'STOCK': return <PackageIcon className="h-3.5 w-3.5" />
    case 'WARNING': return <AlertIcon className="h-3.5 w-3.5" />
    default: return <BellIcon className="h-3.5 w-3.5" />
  }
}

function activityTrendMini(trend?: { date: string; count: number }[]) {
  if (!trend || trend.length === 0) return null
  const max = Math.max(1, ...trend.map((t) => t.count))
  return (
    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Team activity</span>
        <span className="text-[10px] font-black text-slate-500">{trend.reduce((s, t) => s + t.count, 0)} actions</span>
      </div>
      <div className="flex h-14 items-end gap-1">
        {trend.map((t, i) => {
          const h = Math.max(4, Math.round((t.count / max) * 100) / 1.6 + 4)
          return (
            <div key={t.date} className="group relative flex-1">
              <div
                className="w-full rounded-sm bg-yellow-400 transition-all duration-700"
                style={{ height: `${h}%`, opacity: 0.35 + (t.count / max) * 0.65 }}
              />
              <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {t.count}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[8px] font-bold text-slate-300">
        {trend.length >= 2 && <span>{formatDate(trend[0].date)}</span>}
        {trend.length >= 2 && <span>{formatDate(trend[trend.length - 1].date)}</span>}
      </div>
    </div>
  )
}