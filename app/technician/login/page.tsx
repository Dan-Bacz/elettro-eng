import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function TechnicianLoginPage() {
  const userAgent = (await headers()).get('user-agent') || ''
  if (!userAgent.includes('ElettroAndroid')) redirect('/')
  redirect('/technician/dashboard')
}
