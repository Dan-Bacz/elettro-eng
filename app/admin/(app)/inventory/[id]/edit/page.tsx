'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import InventoryForm from '@/components/admin/InventoryForm'
import PageHeader from '@/components/admin/PageHeader'
import type { InventoryItemObj } from '@/components/admin/types'

export default function AdminInventoryEditPage() {
  const params = useParams<{ id: string }>()
  const itemId = params?.id ?? ''
  const router = useRouter()
  const [item, setItem] = useState<InventoryItemObj | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/inventory')
        if (!res.ok) throw new Error('Failed to load item')
        const items = await res.json()
        const found = items.find((i: InventoryItemObj) => i.id === itemId)
        if (!found) throw new Error('Item not found')
        if (!cancelled) setItem(found)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load item')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [itemId])

  async function handleSubmit(data: Record<string, any>) {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, ...data }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to update item')
      }
      router.push('/admin/inventory')
    } catch (e: any) {
      setError(e.message || 'Failed to update item')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />

  if (error || !item) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="text-2xl">⚠️</div>
        <div className="mt-2 text-sm font-bold text-slate-700">{error || 'Item not found'}</div>
        <Link href="/admin/inventory" className="text-xs font-bold text-yellow-600 hover:underline">← Back to inventory</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/inventory" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-yellow-600">←</Link>
        <PageHeader icon="📦" title={`Edit ${item.name}`} subtitle="Update item details, pricing, and stock" />
      </div>
      <InventoryForm initial={item} onSubmit={handleSubmit} submitting={submitting} error={error} />
    </div>
  )
}