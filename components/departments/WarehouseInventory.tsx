'use client'

import { useCallback, useEffect, useState } from 'react'

type InventoryItem = { id: string; name: string; sku: string | null; category: string | null; unit: string | null; quantity: number; reorderLevel: number }
type Movement = { id: string; type: string; quantity: number; stockBefore: number; stockAfter: number; reason: string | null; createdAt: string; inventoryItem: { name: string }; worker: { name: string } }

export default function WarehouseInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [itemId, setItemId] = useState('')
  const [action, setAction] = useState<'receive' | 'adjust'>('receive')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [newName, setNewName] = useState('')
  const [newSku, setNewSku] = useState('')
  const [newUnit, setNewUnit] = useState('pcs')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const [inventoryResponse, movementResponse] = await Promise.all([fetch('/api/inventory'), fetch('/api/warehouse-stock')])
      const [inventoryData, movementData] = await Promise.all([inventoryResponse.json(), movementResponse.json()])
      if (!inventoryResponse.ok || !movementResponse.ok) throw new Error(inventoryData.error || movementData.error || 'Could not load warehouse inventory.')
      setInventory(inventoryData)
      setMovements(movementData.movements)
      setItemId((current) => current || inventoryData[0]?.id || '')
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load warehouse inventory.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function recordStock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const amount = Number(quantity)
      if (!Number.isInteger(amount) || amount === 0) throw new Error('Enter a non-zero whole-number quantity.')
      const response = await fetch('/api/warehouse-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryItemId: itemId, action, quantity: amount, reason }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not record stock movement.')
      setQuantity('')
      setReason('')
      setNotice(`${action === 'receive' ? 'Stock receipt' : 'Stock adjustment'} recorded.`)
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not record stock movement.')
    } finally {
      setBusy(false)
    }
  }

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, sku: newSku || undefined, unit: newUnit, quantity: 0 }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not create inventory item.')
      setNewName('')
      setNewSku('')
      setNotice('Product created with zero stock. Record any received quantity separately.')
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create inventory item.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Inventory & Stock</h1>
        <p className="mt-1 text-sm text-slate-500">Record each stock receipt or adjustment with a reason; releases are logged from the request workflow.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={recordStock} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-900">Record stock</h2>
          <select required value={itemId} onChange={(event) => setItemId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select product…</option>
            {inventory.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.quantity} {item.unit || 'pcs'}</option>)}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={action} onChange={(event) => setAction(event.target.value as 'receive' | 'adjust')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="receive">Receive stock (+ quantity)</option>
              <option value="adjust">Adjust stock (signed change)</option>
            </select>
            <input required type="number" step={1} min={action === 'receive' ? 1 : -1_000_000} max={1_000_000} value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={action === 'receive' ? 'Quantity received' : 'Adjustment (+/-)'} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <textarea required value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} placeholder="Reason / supplier / reference" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={busy || loading || !inventory.length} className="rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-black text-black disabled:opacity-50">{busy ? 'Saving…' : 'Record movement'}</button>
        </form>

        <form onSubmit={createProduct} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-900">Add product</h2>
          <input required value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={200} placeholder="Product name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={newSku} onChange={(event) => setNewSku(event.target.value)} maxLength={100} placeholder="SKU (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input required value={newUnit} onChange={(event) => setNewUnit(event.target.value)} maxLength={40} placeholder="Unit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <p className="text-xs text-slate-500">New products start at zero stock. Use “Record stock” to log an initial receipt.</p>
          <button disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50">{busy ? 'Saving…' : 'Create product'}</button>
        </form>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-3 font-black text-slate-900">Recent Stock Movements</h2>
        {loading ? <p className="p-4 text-sm text-slate-500">Loading movements…</p> : movements.length === 0 ? <p className="p-4 text-sm text-slate-500">No stock movements have been recorded.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Product</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Change</th><th className="px-4 py-2">Stock</th><th className="px-4 py-2">Worker / reason</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{movements.map((movement) => <tr key={movement.id}>
                <td className="px-4 py-3 text-slate-500">{new Date(movement.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-slate-800">{movement.inventoryItem.name}</td>
                <td className="px-4 py-3">{movement.type.replace(/_/g, ' ')}</td>
                <td className={`px-4 py-3 font-black ${movement.quantity < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</td>
                <td className="px-4 py-3">{movement.stockBefore} → {movement.stockAfter}</td>
                <td className="px-4 py-3"><span className="font-semibold">{movement.worker.name}</span><span className="block text-slate-500">{movement.reason || '—'}</span></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
