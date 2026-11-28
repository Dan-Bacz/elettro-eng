'use client'

import { useEffect, useState, type FormEvent } from 'react'
import MaterialUsageEvidence from '@/components/MaterialUsageEvidence'
import ReportPhotoPicker from '@/components/ReportPhotoPicker'
import { formatDateTime } from '@/components/admin/types'

type Material = { id: string; name: string; unit: string | null }
type Project = {
  id: string
  title: string
  warehouseRequests: { items: { inventoryItem: Material; requestedQuantity: number }[] }[]
}
type Usage = {
  id: string
  materialName: string | null
  inventoryItem: Material | null
  tech?: { name: string }
  quantity: number
  unit: string | null
  note: string | null
  createdAt: string
}

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:ring-2 focus:ring-cyan-600'
const label = 'block space-y-1 text-sm font-semibold text-slate-800'

export default function TechnicianMaterialUsagePage() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [projectId, setProjectId] = useState('')
  const [error, setError] = useState('')
  const project = projects?.find(item => item.id === projectId)

  useEffect(() => {
    const controller = new AbortController()
    async function loadProjects() {
      try {
        const res = await fetch('/api/project-material-usage?projects=1', { signal: controller.signal })
        if (!res.ok) throw new Error('Unable to load your assigned projects.')
        setProjects((await res.json()).projects)
      } catch (error) {
        if (!controller.signal.aborted) setError((error as Error).message)
      }
    }
    void loadProjects()
    return () => controller.abort()
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="rounded-2xl bg-slate-950 p-5 text-white sm:p-7">
        <h1 className="text-2xl font-black">Material Usage</h1>
        <p className="mt-1 text-sm text-slate-300">Record the quantity of materials used on an assigned project.</p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className={label}>
          <span>Assigned project</span>
          <select className={field} value={projectId} onChange={event => setProjectId(event.target.value)} disabled={!projects?.length}>
            <option value="">{projects ? 'Select a project' : 'Loading projects…'}</option>
            {projects?.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        {projects?.length === 0 && <p className="mt-2 text-sm text-slate-600">You have no assigned projects.</p>}
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </section>
      {project && <ProjectUsage key={project.id} project={project} />}
    </div>
  )
}

function ProjectUsage({ project }: { project: Project }) {
  const [selection, setSelection] = useState('')
  const [materialName, setMaterialName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('pcs')
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState<string[]>([])
  const [product, setProduct] = useState<string[]>([])
  const [preparing, setPreparing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [usages, setUsages] = useState<Usage[] | null>(null)
  const materials = new Map<string, Material & { requested: number }>()
  for (const request of project.warehouseRequests) {
    for (const { inventoryItem, requestedQuantity } of request.items) {
      materials.set(inventoryItem.id, { ...inventoryItem, requested: (materials.get(inventoryItem.id)?.requested ?? 0) + requestedQuantity })
    }
  }
  const other = selection === 'other'
  const ready = other ? !!(materialName.trim() && receipt[0] && product[0]) : materials.has(selection)

  useEffect(() => {
    const controller = new AbortController()
    async function loadUsage() {
      try {
        const res = await fetch(`/api/project-material-usage?bookingId=${encodeURIComponent(project.id)}`, { signal: controller.signal })
        if (!res.ok) throw new Error('Unable to load usage history.')
        const history: Usage[] = (await res.json()).usages
        setUsages(current => [...(current ?? []), ...history.filter(usage => !current?.some(item => item.id === usage.id))])
      } catch (error) {
        if (!controller.signal.aborted) setHistoryError((error as Error).message)
      }
    }
    void loadUsage()
    return () => controller.abort()
  }, [project.id])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || saving || preparing) return
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const res = await fetch('/api/project-material-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: project.id,
          quantity: Number(quantity),
          note,
          ...(other
            ? { materialName, unit, receiptPhoto: receipt[0], productPhoto: product[0] }
            : { inventoryItemId: selection }),
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Unable to record usage.')
      setUsages(current => [result.usage, ...(current ?? []).filter(item => item.id !== result.usage.id)])
      setSelection('')
      setMaterialName('')
      setQuantity('1')
      setUnit('pcs')
      setNote('')
      setReceipt([])
      setProduct([])
      setStatus('Material usage recorded.')
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black text-slate-900">Record material usage</h2>
        <fieldset disabled={saving} className="space-y-4">
          <label className={label}>
            <span>Material</span>
            <select className={field} value={selection} onChange={event => setSelection(event.target.value)} required disabled={preparing}>
              <option value="">Select a material</option>
              {Array.from(materials.values(), item => <option key={item.id} value={item.id}>{item.name} ({item.requested} {item.unit || 'pcs'} requested)</option>)}
              <option value="other">Material outside my requests</option>
            </select>
          </label>
          {other && <label className={label}><span>Material name</span><input className={field} value={materialName} onChange={event => setMaterialName(event.target.value)} maxLength={160} required /></label>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}><span>Quantity used</span><input className={field} type="number" min="1" max="1000000" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} required /></label>
            {other && <label className={label}><span>Unit</span><input className={field} value={unit} onChange={event => setUnit(event.target.value)} maxLength={24} required /></label>}
          </div>
          <label className={label}><span>Usage note (optional)</span><textarea className={field} rows={2} value={note} onChange={event => setNote(event.target.value)} maxLength={500} /></label>
          {other && <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <ReportPhotoPicker label="Receipt photo (required)" photos={receipt} onChange={setReceipt} onProcessing={setPreparing} maxPhotos={1} disabled={saving || preparing} />
            <ReportPhotoPicker label="Product used photo (required)" photos={product} onChange={setProduct} onProcessing={setPreparing} maxPhotos={1} disabled={saving || preparing} />
          </div>}
        </fieldset>
        <button type="submit" disabled={!ready || saving || preparing} className="rounded-lg bg-cyan-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Recording…' : 'Record usage'}</button>
        {status && <p role="status" className="text-sm text-emerald-700">{status}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </form>
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black text-slate-900">Usage history</h2>
        {historyError && <p role="alert" className="text-sm text-red-700">{historyError}</p>}
        {!usages && !historyError && <p className="text-sm text-slate-600">Loading usage history…</p>}
        {usages?.length === 0 && <p className="text-sm text-slate-600">No usage recorded for this project.</p>}
        {usages?.map(usage => (
          <article key={usage.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm font-bold text-slate-900">
              <h3>{usage.inventoryItem?.name || usage.materialName || 'Material'}</h3>
              <span>{usage.quantity} {usage.unit || 'pcs'}</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">{usage.tech?.name || 'Technician'} · {formatDateTime(usage.createdAt)}</p>
            {usage.note && <p className="mt-1 break-words text-sm text-slate-700">{usage.note}</p>}
            {usage.materialName && <MaterialUsageEvidence usageId={usage.id} />}
          </article>
        ))}
      </section>
    </>
  )
}
