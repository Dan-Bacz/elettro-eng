'use client'
import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { InventoryItemObj } from './types'

type InventoryFormProps = {
  initial?: Partial<InventoryItemObj>
  onSubmit: (data: Record<string, any>) => Promise<void>
  submitting: boolean
  error: string
}

const EMPTY = {
  name: '', sku: '', category: '', brand: '', model: '', description: '',
  quantity: 0, unit: 'pcs', buyPrice: '', sellPrice: '', reorderLevel: 10,
  imageUrl: '', imageData: '',
}

type FormData = typeof EMPTY

export default function InventoryForm({ initial, onSubmit, submitting, error }: InventoryFormProps) {
  const [form, setForm] = useState<FormData>({
    ...EMPTY,
    ...(initial ? {
      name: initial.name || '', sku: initial.sku || '', category: initial.category || '', brand: initial.brand || '', model: initial.model || '', description: initial.description || '',
      quantity: initial.quantity ?? 0, unit: initial.unit || 'pcs',
      buyPrice: initial.buyPrice != null ? String(initial.buyPrice) : '',
      sellPrice: initial.sellPrice != null ? String(initial.sellPrice) : '',
      reorderLevel: initial.reorderLevel ?? 10,
      imageUrl: initial.imageUrl || '', imageData: '',
    } : {})
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [aiQuery, setAiQuery] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function startCamera() {
    setCameraError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) { setCameraError('Camera not supported'); return }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCameraActive(true)
    } catch (e) { setCameraError('Unable to access camera. Check permissions.') }
  }

  function stopCamera() {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      videoRef.current?.pause()
      videoRef.current && (videoRef.current.srcObject = null)
    } finally { setCameraActive(false) }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setField('imageData', dataUrl)
    setField('imageUrl', dataUrl)
    stopCamera()
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      setField('imageData', dataUrl)
      setField('imageUrl', dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function fetchAiSuggestions() {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
      })
      if (res.ok) setAiSuggestions(await res.json())
    } catch (e) {
      // ignore
    } finally {
      setAiLoading(false)
    }
  }

  function applySuggestion(s: any) {
    setForm((prev) => ({
      ...prev,
      name: s.title || prev.name,
      category: s.category || prev.category,
      brand: s.brand || prev.brand,
      model: s.model || prev.model,
      description: s.description || prev.description,
      quantity: Number(s.quantity) || prev.quantity,
      unit: s.unit || prev.unit,
      imageUrl: s.image || prev.imageUrl,
    }))
    setAiSuggestions([])
    setAiQuery('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await onSubmit({
      name: form.name.trim(),
      sku: form.sku || undefined,
      category: form.category || undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      description: form.description || undefined,
      quantity: Number(form.quantity) || 0,
      unit: form.unit || 'pcs',
      buyPrice: form.buyPrice !== '' ? Number(form.buyPrice) : null,
      sellPrice: form.sellPrice !== '' ? Number(form.sellPrice) : null,
      reorderLevel: Number(form.reorderLevel) || 10,
      imageUrl: form.imageUrl || undefined,
      imageData: form.imageData || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

      {/* Image */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-black text-slate-900">Product Image</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          {/* Preview */}
          <div className="shrink-0">
            <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {(form.imageUrl || form.imageData) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imageUrl || form.imageData} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl text-slate-300">📦</span>
              )}
            </div>
          </div>
          {/* Controls */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startCamera} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-700">📷 Camera</button>
              <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-700">
                🖼️ Upload File
                <input type="file" accept="image/*" className="sr-only" onChange={handleFileSelected} />
              </label>
              <button type="button" onClick={() => { setField('imageUrl', ''); setField('imageData', '') }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50">✕ Clear</button>
            </div>
            {cameraActive && (
              <div className="space-y-2">
                <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm rounded-xl border border-slate-200" />
                <div className="flex gap-2">
                  <button type="button" onClick={capturePhoto} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black">📸 Capture</button>
                  <button type="button" onClick={stopCamera} className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-800">Cancel</button>
                </div>
              </div>
            )}
            {cameraError && <div className="text-xs text-red-500">{cameraError}</div>}
            <div className="mt-2 flex gap-2">
              <input value={form.imageUrl} onChange={(e) => setField('imageUrl', e.target.value)} placeholder="Or paste image URL…" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-black text-slate-900">🤖 AI Inventory Assist</h2>
        <p className="mt-1 text-xs text-slate-400">Describe the item and let AI fill in the details.</p>
        <div className="mt-3 flex gap-2">
          <input value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), fetchAiSuggestions())} placeholder="e.g. LED panel light 60cm…" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          <button type="button" onClick={fetchAiSuggestions} disabled={aiLoading} className="rounded-lg bg-black px-4 py-2 text-xs font-bold text-yellow-400 hover:bg-slate-800 transition-colors disabled:opacity-50">
            {aiLoading ? '…' : 'Suggest'}
          </button>
        </div>
        {aiSuggestions.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {aiSuggestions.map((s, idx) => (
              <button key={idx} type="button" onClick={() => applySuggestion(s)} className="rounded-xl border border-slate-200 p-3 text-left hover:border-yellow-400 hover:bg-yellow-50/40 transition-colors">
                {s.image && <img src={s.image} alt="" className="mb-2 h-16 w-full rounded-lg object-cover" />}
                <div className="text-xs font-bold text-slate-800">{s.title}</div>
                <div className="text-[10px] text-slate-400">{s.category || ''}{s.brand ? ` · ${s.brand}` : ''}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-black text-slate-900">Item Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name *" value={form.name} onChange={(v) => setField('name', v)} required />
          <Field label="SKU" value={form.sku} onChange={(v) => setField('sku', v)} placeholder="e.g. WH-001" />
          <Select label="Category" value={form.category} onChange={(v) => setField('category', v)} options={['', 'Electrical', 'Plumbing', 'Renovation', 'Lighting', 'Cable', 'Consumables', 'General']} />
          <Field label="Brand" value={form.brand} onChange={(v) => setField('brand', v)} placeholder="e.g. Philips" />
          <Field label="Model" value={form.model} onChange={(v) => setField('model', v)} placeholder="e.g. LED-12W" />
          <Field label="Unit" value={form.unit} onChange={(v) => setField('unit', v)} placeholder="pcs, meters, liters…" />
          <Field label="Quantity" type="number" value={String(form.quantity)} onChange={(v) => setField('quantity', Math.max(0, Number(v) || 0))} min={0} />
          <Field label="Reorder Level" type="number" value={String(form.reorderLevel)} onChange={(v) => setField('reorderLevel', Math.max(0, Number(v) || 0))} min={0} />
          <Field label="Buy Price ($)" type="number" value={String(form.buyPrice)} onChange={(v) => setField('buyPrice', v)} placeholder="Cost per unit" min={0} step="0.01" />
          <Field label="Sell Price ($)" type="number" value={String(form.sellPrice)} onChange={(v) => setField('sellPrice', v)} placeholder="Retail price" min={0} step="0.01" />
        </div>
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={3} placeholder="Optional description…" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={submitting || !form.name.trim()} className="rounded-xl bg-yellow-400 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 transition-colors disabled:opacity-50">
          {submitting ? 'Saving…' : initial?.id ? 'Update Item' : 'Add to Inventory'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, value, onChange, type = 'text', required, placeholder, min, step }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string; min?: number; step?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} min={min} step={step} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400">
        {options.map((o) => <option key={o} value={o}>{o || '— None —'}</option>)}
      </select>
    </div>
  )
}