'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '../../../../components/admin/PageHeader'
import { UsersIcon } from '../../../../components/admin/icons'
import type { Role, UserObj } from '../../../../components/admin/types'

type StaffRole = Extract<Role, 'TECH' | 'SALES' | 'WAREHOUSE' | 'RIDER'>

export default function DepartmentStaffPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not load staff accounts.')
      setUsers(data.users.filter((user: UserObj) => ['TECH', 'SALES', 'WAREHOUSE', 'RIDER'].includes(user.role)))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load staff accounts.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  async function approveUser(user: UserObj) {
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve_user', userId: user.id }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not approve account.')
      setNotice(`${user.name}'s account has been approved. They have been notified via email.`)
      await load()
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Could not approve account.')
    }
  }

  async function rejectUser(user: UserObj) {
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject_user', userId: user.id }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not reject account.')
      setNotice(`${user.name}'s account has been rejected.`)
      await load()
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Could not reject account.')
    }
  }

  async function setAccountStatus(user: UserObj) {
    const action = user.status === 'ACTIVE' ? 'suspend_user' : 'activate_user'
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, userId: user.id }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not update account status.')
      setNotice(`${user.name}'s account is now ${action === 'activate_user' ? 'active' : 'suspended'}.`)
      await load()
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Could not update account status.')
    }
  }

  const pendingUsers = users.filter(u => u.status === 'PENDING' || !u.approved)
  const activeUsers = users.filter(u => u.status === 'ACTIVE' && u.approved)
  const suspendedUsers = users.filter(u => u.status === 'SUSPENDED')
  const roleCounts: Record<StaffRole, number> = {
    TECH: users.filter(u => u.role === 'TECH').length,
    SALES: users.filter(u => u.role === 'SALES').length,
    WAREHOUSE: users.filter(u => u.role === 'WAREHOUSE').length,
    RIDER: users.filter(u => u.role === 'RIDER').length,
  }
  const normalizedQuery = query.trim().toLowerCase()
  const matchesQuery = (user: UserObj) => !normalizedQuery || [user.name, user.email, user.role].some(value => value.toLowerCase().includes(normalizedQuery))
  const visiblePendingUsers = pendingUsers.filter(matchesQuery)
  const visibleActiveUsers = activeUsers.filter(matchesQuery)
  const metrics = [
    ['Team size', users.length, 'All departments'],
    ['Pending', pendingUsers.length, 'Needs review'],
    ['Active', activeUsers.length, 'Ready for work'],
    ['Suspended', suspendedUsers.length, 'Needs attention'],
  ] as const
  const departments = [
    ['TECH', 'Technicians', roleCounts.TECH, 'bg-cyan-500'],
    ['SALES', 'Sales team', roleCounts.SALES, 'bg-amber-400'],
    ['WAREHOUSE', 'Warehouse team', roleCounts.WAREHOUSE, 'bg-emerald-500'],
    ['RIDER', 'Riders', roleCounts.RIDER, 'bg-violet-500'],
  ] as const

  return (
    <div className="space-y-6">
      <div className="hidden"><PageHeader icon={<UsersIcon className="h-5 w-5" />} title="Workers" subtitle="Review and manage technician, sales, warehouse, and rider accounts." /></div>

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#122b35] to-[#08727f] p-6 text-white shadow-[0_28px_60px_-30px_rgba(15,23,42,0.85)] sm:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]" /> Workforce operations</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Staff command center</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Keep every department ready for work. Review new registrations, monitor account health, and manage access from one focused workspace.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
            {metrics.map(([label, value, caption]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-wider text-slate-300">{label}</p><p className="mt-2 text-2xl font-black">{value}</p><p className="mt-1 text-[10px] text-slate-400">{caption}</p></div>)}
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {departments.map(([role, label, count, color]) => <div key={role} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_35px_-22px_rgba(15,23,42,0.7)] transition duration-300 hover:-translate-y-1"><div className={`absolute inset-x-0 top-0 h-1 ${color}`} /><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Department</p><h2 className="mt-2 text-sm font-black text-slate-900">{label}</h2></div><span className="rounded-xl bg-slate-100 px-3 py-2 text-lg font-black text-slate-800">{count}</span></div><p className="mt-4 text-xs text-slate-500">Registered staff accounts</p></div>)}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Directory</p><h2 className="mt-1 text-lg font-black text-slate-950">Find a staff account</h2></div><div className="relative w-full sm:max-w-sm"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, or department…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10" /></div></div></section>

      {pendingUsers.length > 0 && <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm"><div className="flex flex-col gap-1 border-b border-amber-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Action needed</p><h2 className="mt-1 text-lg font-black text-amber-950">Pending registrations</h2></div><span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">{pendingUsers.length} awaiting review</span></div>{visiblePendingUsers.length === 0 ? <p className="px-5 py-8 text-sm text-amber-800">No pending accounts match your search.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gradient-to-r from-amber-950 to-amber-800 text-[10px] uppercase tracking-wider text-amber-100"><tr><th className="px-5 py-3">Staff member</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y divide-amber-200">{visiblePendingUsers.map(user => <tr key={user.id} className="transition hover:bg-amber-100/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-200 text-xs font-black text-amber-900">{user.name.slice(0, 1).toUpperCase()}</span><span className="font-black text-slate-900">{user.name}</span></div></td><td className="px-5 py-4 text-slate-600">{user.email}</td><td className="px-5 py-4"><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm">{user.role}</span></td><td className="px-5 py-4 text-xs text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => void approveUser(user)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700">Approve</button><button onClick={() => void rejectUser(user)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-[10px] font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-50">Reject</button></div></td></tr>)}</tbody></table></div>}</section>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Access management</p><h2 className="mt-1 text-lg font-black text-slate-950">Active worker accounts</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{activeUsers.length} active</span></div>{loading ? <p className="p-6 text-sm text-slate-500">Loading accounts…</p> : activeUsers.length === 0 ? <p className="p-6 text-sm text-slate-500">No active department accounts yet.</p> : visibleActiveUsers.length === 0 ? <p className="p-6 text-sm text-slate-500">No active accounts match your search.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#173b44] text-[10px] uppercase tracking-wider text-white/60"><tr><th className="px-5 py-3">Staff member</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleActiveUsers.map(user => <tr key={user.id} className="transition hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-100 to-slate-100 text-xs font-black text-cyan-800">{user.name.slice(0, 1).toUpperCase()}</span><span className="font-black text-slate-900">{user.name}</span></div></td><td className="px-5 py-4 text-slate-600">{user.email}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700">{user.role}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.status || 'ACTIVE'}</span></td><td className="px-5 py-4 text-xs text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td><td className="px-5 py-4"><button onClick={() => void setAccountStatus(user)} className={`rounded-lg px-3 py-2 text-[10px] font-black transition hover:-translate-y-0.5 ${user.status === 'ACTIVE' ? 'border border-red-200 bg-white text-red-600 hover:bg-red-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button></td></tr>)}</tbody></table></div>}</section>
    </div>
  )
}
