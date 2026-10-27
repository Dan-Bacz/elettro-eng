import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import DepartmentShell from '../../components/departments/DepartmentShell'
import { getSessionUser } from '../../lib/auth'

export const metadata = { title: 'Warehouse | Elettro Engineering' }

export default async function WarehouseLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore.get('token')?.value)
  if (!user || user.role !== 'WAREHOUSE' || user.status !== 'ACTIVE') redirect('/admin/login')
  return <DepartmentShell department="warehouse" name={user.name}>{children}</DepartmentShell>
}
