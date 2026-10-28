import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import DepartmentShell from '../../../components/departments/DepartmentShell'
import { getSessionUser } from '../../../lib/auth'

export const metadata = { title: 'Sales | Elettro Engineering' }

export default async function SalesLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore.get('token')?.value)
  if (!user || user.role !== 'SALES' || user.status !== 'ACTIVE') redirect('/sales/login')
  return <DepartmentShell department="sales" name={user.name}>{children}</DepartmentShell>
}
