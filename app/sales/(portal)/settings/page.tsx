import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import StaffAccountSettings from '../../../../components/departments/StaffAccountSettings'
import { getSessionUser } from '../../../../lib/auth'

export const metadata = { title: 'Account Settings | Elettro Sales' }

export default async function SalesSettingsPage() {
  const token = (await cookies()).get('token')?.value
  const user = await getSessionUser(token)
  if (!user || user.role !== 'SALES' || user.status !== 'ACTIVE') redirect('/sales/login')

  return (
    <StaffAccountSettings department="Sales" initialProfile={{
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      profileImageUrl: user.profileImageUrl,
    }} />
  )
}
