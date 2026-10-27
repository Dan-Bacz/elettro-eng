import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionUser } from '../../lib/auth'

export const metadata = { title: 'Warehouse Sign In | Elettro Engineering' }

export default async function WarehouseLoginPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore.get('token')?.value)
  if (user?.role === 'WAREHOUSE' && user.status === 'ACTIVE') redirect('/warehouse/dashboard')
  redirect('/warehouse/login')
}