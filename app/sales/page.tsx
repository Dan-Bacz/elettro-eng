import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionUser } from '../../lib/auth'

export const metadata = { title: 'Sales Sign In | Elettro Engineering' }

export default async function SalesLoginPage() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore.get('token')?.value)
  if (user?.role === 'SALES' && user.status === 'ACTIVE') redirect('/sales/dashboard')
  redirect('/sales/login')
}
