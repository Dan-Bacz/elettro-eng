'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatCard from '../../../../components/admin/StatCard'
import DonutChart from '../../../../components/admin/DonutChart'
import StatusBadge from '../../../../components/admin/StatusBadge'
import EmptyState from '../../../../components/admin/EmptyState'
import type { DashboardData } from '../../../../components/admin/types'
import { formatDate } from '../../../../components/admin/types'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    const timer = window.setInterval(load, 20000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [router])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        icon="⚠️"
        title={error || 'No data available'}
        message="Try refreshing the page."
        action={<button onClick={() => router.refresh()} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black">Refresh</button>}
      />
    )
  }

  const { stats } = data
  const donutData = (data.statusBreakdown || []).map((s) => ({ status: s.status, value: s.value }))
  const recent = (data.recentBookings || []).slice(0, 6)
  const alerts = (data.inventoryAlerts || []).slice(0, 6)
  const pendingRegs = (data.pendingUsers || []).length

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard label="Total Bookings" value={stats.totalBookings} href="/admin/bookings" />
        <StatCard label="Pending" value={stats.pending} href="/admin/bookings" hint="Awaiting approval" />
        <StatCard label="In Progress" value={stats.inProgress} href="/admin/projects" />
        <StatCard label="Completed" value={stats.completed} href="/admin/projects" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard label="Active Technicians" value={stats.technicians} href="/admin/technicians" />
        <StatCard
          label="Pending Registrations"
          value={stats.pendingRegistrations}
          href="/admin/registrations"
          hint={pendingRegs > 0 ? `${pendingRegs} need review` : 'All clear'}
        />
        <StatCard label="Clients" value={stats.clients} href="/admin/clients" />
        <StatCard label="Low Stock Items" value={stats.lowStock} href="/admin/inventory" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Donut + quick actions */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">Bookings Overview</h2>
            <Link href="/admin/bookings" className="text-xs font-bold text-yellow-600 hover:underline">View all →</Link>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <DonutChart data={donutData} centerLabel="Booking status breakdown" />
            <div className="grid grid-cols-2 gap-2 sm:flex-1">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-lg font-black text-slate-900">{stats.approved}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Approved</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-lg font-black text-slate-900">{stats.assigned}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assigned</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-lg font-black text-slate-900">{stats.totalInventory}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Stock units</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-lg font-black text-slate-900">{stats.suspendedTechnicians}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Suspended</div>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">⚠ Inventory Alerts</h2>
            <Link href="/admin/inventory" className="text-xs font-bold text-yellow-600 hover:underline">All →</Link>
          </div>
          <div className="mt-3 space-y-2">
            {alerts.length === 0 && <div className="text-xs text-slate-400 py-4 text-center">All stock levels healthy 🎉</div>}
            {alerts.map((item) => (
              <Link key={item.id} href="/admin/inventory" className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 hover:border-yellow-300 transition-colors">
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-slate-700">{item.name}</div>
                  {item.sku && <div className="text-[10px] text-slate-400">{item.sku}</div>}
                </div>
                <span className={`shrink-0 rounded-full text-[10px] font-black px-2 py-0.5 ${Number(item.quantity) <= 5 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  {item.quantity}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-xs font-bold text-yellow-600 hover:underline">View all →</Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4 font-bold">Booking</th>
                <th className="pb-3 pr-4 font-bold">Client</th>
                <th className="pb-3 pr-4 font-bold">Status</th>
                <th className="pb-3 font-bold">Created</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4 text-xs font-bold text-slate-800">{b.title}</td>
                  <td className="py-3 pr-4 text-xs text-slate-500">{b.clientName || '—'}</td>
                  <td className="py-3 pr-4"><StatusBadge status={b.status} /></td>
                  <td className="py-3 text-xs text-slate-400">{formatDate(b.createdAt)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-xs text-slate-400">No bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-black text-slate-900">Quick Actions</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickLink href="/admin/bookings" icon="🧾" label="Manage Bookings" />
          <QuickLink href="/admin/inventory/new" icon="📦" label="Add Inventory" />
          <QuickLink href="/admin/registrations" icon="📋" label="Review Registrations" />
          <QuickLink href="/admin/reports" icon="📊" label="View Reports" />
        </div>
      </div>
    </div>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-600 transition-colors">
      <span className="text-base">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  )
}