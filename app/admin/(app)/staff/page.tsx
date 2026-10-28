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
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_user', userId: user.id }),
      })
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
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_user', userId: user.id }),
      })
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
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: user.id }),
      })
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

  return (
    <div className="space-y-6">
      <PageHeader icon={<UsersIcon className="h-5 w-5" />} title="Workers" subtitle="Review and manage technician, sales, warehouse, and rider accounts." />
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}

      {/* Pending Registrations */}
      {pendingUsers.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
          <h2 className="border-b border-amber-200 px-4 py-3 text-sm font-black text-amber-900">Pending Registrations ({pendingUsers.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-amber-100 text-[10px] uppercase text-amber-700"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Action</th></tr></thead>
              <tbody className="divide-y divide-amber-200">{pendingUsers.map((user) => <tr key={user.id}>
                <td className="px-4 py-3 font-bold text-slate-800">{user.name}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => void approveUser(user)} className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">Approve</button>
                  <button onClick={() => void rejectUser(user)} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-100">Reject</button>
                </td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {/* Active Accounts */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-900">Active Worker Accounts ({activeUsers.length})</h2>
        {loading ? <p className="p-4 text-sm text-slate-500">Loading accounts…</p> : activeUsers.length === 0 ? <p className="p-4 text-sm text-slate-500">No active department accounts yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{activeUsers.map((user) => <tr key={user.id}>
                <td className="px-4 py-3 font-bold text-slate-800">{user.name}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">{user.status || 'ACTIVE'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3"><button onClick={() => void setAccountStatus(user)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${user.status === 'ACTIVE' ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
