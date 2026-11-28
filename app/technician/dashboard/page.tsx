'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../../../components/admin/EmptyState'
import TechnicianAnalytics from '../../../components/admin/TechnicianAnalytics'
import TechnicianSectionPage from '../../../components/admin/TechnicianSectionPage'
import type { BookingObj, UserObj } from '../../../components/admin/types'

type TechPayload = { tech: UserObj; bookings: BookingObj[] }

export default function TechnicianDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<TechPayload | null>(null)
  const [error, setError] = useState('')
  const [section, setSection] = useState('home')

  useEffect(() => {
    const syncSection = () => {
      const hash = window.location.hash.slice(1)
      if (hash === 'jobs') {
        router.replace('/technician/jobs')
        return
      }
      setSection(hash || 'home')
    }
    syncSection()
    window.addEventListener('hashchange', syncSection)
    return () => window.removeEventListener('hashchange', syncSection)
  }, [router])

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/tech', { cache: 'no-store' })
      if (response.status === 401) {
        router.push('/technician/login')
        return
      }
      if (!response.ok) throw new Error('Failed to load the technician dashboard.')
      setData(await response.json())
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load the technician dashboard.')
    }
  }, [router])

  useEffect(() => { void load() }, [load])

  if (error) {
    return <EmptyState title={error} message="Try reloading your dashboard." action={<button type="button" onClick={() => void load()} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black">Retry</button>} />
  }
  if (!data) return <p role="status" className="p-4 text-sm text-slate-600">Loading dashboard...</p>
  if (section !== 'home') return <TechnicianSectionPage section={section} data={data} onRefresh={load} />

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black tracking-tight text-slate-950">Technician Dashboard</h1>
      <TechnicianAnalytics bookings={data.bookings} />
    </div>
  )
}
