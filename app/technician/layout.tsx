import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getSessionUser } from '../../lib/auth'
import TechShell from '../../components/admin/TechShell'

export const metadata = { title: 'Technician | Elettro Engineering' }

export default async function TechnicianLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers()
  const userAgent = requestHeaders.get('user-agent') || ''
  if (!userAgent.includes('ElettroAndroid')) redirect('/')

  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  const user = await getSessionUser(token)
  if (!user || user.role !== 'TECH') redirect('/technician/login')
  if (user.status !== 'ACTIVE') redirect('/technician/login')

  return (
    <TechShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      }}
    >
      {children}
    </TechShell>
  )
}
