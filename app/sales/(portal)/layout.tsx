import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import SalesShell from '../../../components/sales/SalesShell'
import { getSessionUser } from '../../../lib/auth'

export const metadata = { title: 'Sales | Elettro Engineering' }

export default async function SalesPortalLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore.get('token')?.value)
  if (!user || user.role !== 'SALES' || user.status !== 'ACTIVE') redirect('/sales/login')
  return (
    <SalesShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: null,
      }}
    >
      {children}
    </SalesShell>
  )
}
