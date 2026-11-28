import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AccountSettings from '../../../../components/departments/AccountSettings'
import { getSessionUser } from '../../../../lib/auth'

export const metadata = { title: 'Account Settings | Elettro Warehouse' }

export default async function WarehouseSettingsPage() {
  const token = (await cookies()).get('token')?.value
  const user = await getSessionUser(token)
  if (!user || user.role !== 'WAREHOUSE' || user.status !== 'ACTIVE') redirect('/warehouse/login')

  return (
    <AccountSettings department="Warehouse" initialProfile={{
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      profileImageUrl: user.profileImageUrl,
    }} />
  )
}
