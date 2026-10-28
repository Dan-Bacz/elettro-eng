'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import EmptyState from '../../../../components/admin/EmptyState'

export default function SalesRequestsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [router])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Warehouse Requests</h1>
        <p className="mt-0.5 text-xs font-medium text-slate-400">Track warehouse request status and releases.</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : (
        <EmptyState
          title="No warehouse requests yet"
          message="Warehouse requests linked to your approved orders will appear here."
        />
      )}
    </div>
  )
}
