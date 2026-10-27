'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '../../../../components/admin/PageHeader'
import { UsersIcon } from '../../../../components/admin/icons'
import type { Role, UserObj } from '../../../../components/admin/types'

type StaffRole = Extract<Role, 'TECH' | 'SALES' | 'WAREHOUSE'>

export default function DepartmentStaffPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserObj[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<StaffRole>('SALES')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
      setUsers(data.users.filter((user: UserObj) => ['TECH', 'SALES', 'WAREHOUSE'].includes(user.role)))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load staff accounts.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_user', name, email, password, role }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not create staff account.')
      setName('')
      setEmail('')
      setPassword('')
      setNotice(`${role} account created and activated.`)
      await load()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create staff account.')
    } finally {
      setSaving(false)
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

  return (
    <div className="space-y-6">
      <PageHeader icon={<UsersIcon className="h-5 w-5" />} title="Department Staff" subtitle="Create and review technician, sales, and warehouse accounts." />
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}
      <form onSubmit={createStaff} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-bold text-slate-600">Full name
          <input required value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-bold text-slate-600">Email
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-bold text-slate-600">Temporary password
          <input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-bold text-slate-600">Department
          <select value={role} onChange={(event) => setRole(event.target.value as StaffRole)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="SALES">Sales</option>
            <option value="WAREHOUSE">Warehouse</option>
            <option value="TECH">Technician</option>
          </select>
        </label>
        <button disabled={saving} className="self-end rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-black text-black hover:bg-yellow-500 disabled:opacity-50">{saving ? 'Creating…' : 'Create active account'}</button>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-900">Staff accounts</h2>
        {loading ? <p className="p-4 text-sm text-slate-500">Loading accounts…</p> : users.length === 0 ? <p className="p-4 text-sm text-slate-500">No department accounts yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id}>
                <td className="px-4 py-3 font-bold text-slate-800">{user.name}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">{user.status || (user.approved ? 'ACTIVE' : 'PENDING')}</td>
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
