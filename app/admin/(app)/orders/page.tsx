'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'
import SearchBar from '../../../../components/admin/SearchBar'
import FilterBar from '../../../../components/admin/FilterBar'
import EmptyState from '../../../../components/admin/EmptyState'
import { CartIcon } from '../../../../components/admin/icons'
import type { OrderObj } from '../../../../components/admin/types'

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderObj[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/orders')
      if (!res.ok) {
        if (res.status === 401) { router.push('/admin/login'); return }
        throw new Error('Failed to load orders')
      }
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  async function updateStatus(order: OrderObj, status: string) {
    setBusyId(order.id)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, status }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to update order')
      }
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: status as OrderObj['status'] } : o))
    } catch (e: any) {
      setError(e.message || 'Failed to update order')
    } finally {
      setBusyId(null)
    }
  }

  const visible = orders.filter((o) => {
    const matchesFilter = filter === 'ALL' || o.status === filter
    const q = query.trim().toLowerCase()
    const matchesQuery = !q
      || (o.clientName || '').toLowerCase().includes(q)
      || (o.email || '').toLowerCase().includes(q)
      || (o.phone || '').toLowerCase().includes(q)
      || (o.reference || '').toLowerCase().includes(q)
      || (o.items || []).some((it) => (it.name || '').toLowerCase().includes(q))
    return matchesFilter && matchesQuery
  })

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CartIcon className="h-5 w-5" />}
        title="Orders"
        subtitle={`${orders.length} orders · ${pendingCount} pending`}
        actions={
          <span className="rounded-xl bg-yellow-400 px-3 py-2 text-[11px] font-black text-black">
            ₱{orders.reduce((sum, o) => sum + Number(o.total || 0), 0).toLocaleString()} total
          </span>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by client, email, phone, item…" />
        <FilterBar options={FILTERS} value={filter} onChange={(v) => setFilter(v)} />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CartIcon className="h-6 w-6" />}
          title={orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          message={orders.length === 0 ? 'Client orders from the public product catalog will appear here.' : 'Try adjusting the search or filters.'}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((order) => {
            const itemsText = (order.items || []).map((it) => `${it.quantity}× ${it.name}`).join(', ')
            return (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left: order info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{order.reference}</span>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>
                        {order.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</span>
                    </div>

                    {/* Items */}
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      {(order.items || []).map((it) => (
                        <div key={it.id} className="flex items-center justify-between gap-3 py-0.5">
                          <span className="text-xs font-semibold text-slate-700">{it.name}</span>
                          <span className="shrink-0 text-right text-[11px] font-bold text-slate-500">
                            {it.quantity} {it.unit || 'pcs'}{it.unitPrice > 0 ? ` · ₱${(Number(it.unitPrice) * it.quantity).toLocaleString()}` : ''}
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</span>
                        <span className="text-sm font-black text-yellow-700">₱{Number(order.total || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {itemsText && (
                      <p className="mt-2 text-[10px] text-slate-400">{itemsText}</p>
                    )}
                  </div>

                  {/* Right: client + actions */}
                  <div className="shrink-0 lg:w-64">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="text-xs font-bold text-slate-800">{order.clientName}</div>
                      <div className="mt-1 truncate text-[11px] text-slate-500">{order.email}</div>
                      <div className="text-[11px] font-semibold text-slate-600">{order.phone}</div>
                      {order.client?.email && (
                        <Link href={`/admin/clients`} className="mt-1 block text-[10px] font-bold text-yellow-700 hover:underline">
                          Client record →
                        </Link>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {order.status !== 'APPROVED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                        <button
                          onClick={() => updateStatus(order, 'APPROVED')}
                          disabled={busyId === order.id}
                          className="rounded-lg bg-yellow-400 px-3 py-1.5 text-[11px] font-black text-black hover:bg-yellow-500 disabled:opacity-50 transition-colors"
                        >
                          {busyId === order.id ? '…' : 'Approve'}
                        </button>
                      )}
                      {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                        <button
                          onClick={() => updateStatus(order, 'COMPLETED')}
                          disabled={busyId === order.id}
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                        >
                          Complete
                        </button>
                      )}
                      {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                        <button
                          onClick={() => updateStatus(order, 'CANCELLED')}
                          disabled={busyId === order.id}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}