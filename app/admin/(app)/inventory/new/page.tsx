'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import InventoryForm from '@/components/admin/InventoryForm'
import PageHeader from '@/components/admin/PageHeader'
import Link from 'next/link'

export default function AdminInventoryNewPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(data: Record<string, any>) {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to save item')
      }
      router.push('/admin/inventory')
    } catch (e: any) {
      setError(e.message || 'Failed to save item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/inventory" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-yellow-600">←</Link>
        <PageHeader icon="📦" title="Add Inventory Item" subtitle="Add a new part, tool, or consumable to the inventory" />
      </div>
      <InventoryForm onSubmit={handleSubmit} submitting={submitting} error={error} />
    </div>
  )
}