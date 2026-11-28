import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AccountSettings from '../../../../components/departments/AccountSettings'
import { getSessionUser } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

export const metadata = { title: 'Account Settings | Elettro Client Portal' }

export default async function ClientSettingsPage() {
  const token = (await cookies()).get('token')?.value
  const session = await getSessionUser(token)
  if (!session || session.role !== 'CLIENT' || session.status !== 'ACTIVE') redirect('/client/login')

  const profile = await prisma.user.findUnique({
    where: { id: session.id, role: 'CLIENT', status: 'ACTIVE', emailVerifiedAt: { not: null } },
    select: { name: true, email: true, phone: true, address: true, profileImageUrl: true },
  })
  if (!profile) redirect('/client/login')

  return <AccountSettings department="Client" initialProfile={profile} />
}
