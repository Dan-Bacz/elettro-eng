import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getSessionUser } from '../../../lib/auth'
import AdminShell from '../../../components/admin/AdminShell'

export const metadata = { title: 'Admin | Elettro Engineering' }

export default async function AdminAppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  const user = await getSessionUser(token)
  if (!user || user.role !== 'ADMIN') redirect('/admin/login')
  if (user.status === 'SUSPENDED' || user.status === 'REJECTED' || user.status === 'PENDING') redirect('/admin/login')

  return (
    <AdminShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: null,
      }}
    >
      {children}
    </AdminShell>
  )
}