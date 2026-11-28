import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AccountSettings from '../../../../components/departments/AccountSettings'
import { getSessionUser } from '../../../../lib/auth'

export const metadata = { title: 'Account Settings | Elettro Sales' }

export default async function SalesSettingsPage() {
  const token = (await cookies()).get('token')?.value
  const user = await getSessionUser(token)
  if (!user || user.role !== 'SALES' || user.status !== 'ACTIVE') redirect('/sales/login')

  return (
    <AccountSettings department="Sales" initialProfile={{
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      profileImageUrl: user.profileImageUrl,
    }} />
  )
}
