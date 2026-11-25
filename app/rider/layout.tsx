import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getSessionUser } from '../../lib/auth'
import RiderShell from '../../components/admin/RiderShell'

export const metadata = { title: 'Rider | Elettro Engineering' }

export default async function RiderLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers()
  if (!(requestHeaders.get('user-agent') || '').includes('ElettroAndroid')) redirect('/')
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore.get('token')?.value)
  if (!user || user.role !== 'RIDER' || user.status !== 'ACTIVE') redirect('/rider/login')
  return <RiderShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</RiderShell>
}
