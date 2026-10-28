import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import WarehouseShell from '../../../components/warehouse/WarehouseShell'
import { getSessionUser } from '../../../lib/auth'

export const metadata = { title: 'Warehouse | Elettro Engineering' }

export default async function WarehousePortalLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore.get('token')?.value)
  if (!user || user.role !== 'WAREHOUSE' || user.status !== 'ACTIVE') redirect('/warehouse/login')
  return <WarehouseShell user={{ name: user.name, email: user.email, role: user.role, profileImageUrl: null }}>{children}</WarehouseShell>
}
