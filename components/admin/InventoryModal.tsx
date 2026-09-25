'use client'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import type { InventoryItemObj } from './types'

export type IdentifySuggestion = {
  productType: string
  productName: string
  manufacturer: string | null
  brand: string
  model: string | null
  modelNumber: string
  productNumber: string
  possibleBrand: string
  possibleModel: string
  category: string
  unit: string
  specifications: string
  voltage: string
  current: string
  wattage: string
  dimensions: string
  color: string
  material: string
  confidence: number
  confidenceLevel: 'confirmed' | 'likely' | 'unknown'
  evidence: string[]
  notes: string
}

type ImageResult = {
  id: string
  title: string
  thumb: string
  url: string
  pageUrl: string
  artist: string
  license: string
}

type InventoryModalProps = {
  open: boolean
  initial: InventoryItemObj | null
  categories: string[]
  submitting: boolean
  error: string
  onSubmit: (data: Record<string, any>) => Promise<void>
  onClose: () => void
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_FILE_BYTES = 8 * 1024 * 1024
const MIN_SEARCH_LENGTH = 3
const SEARCH_DEBOUNCE_MS = 500

const EMPTY_IMAGE = { url: '', dataUrl: '', preview: '' }

function downscaleDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the image file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Unsupported image file'))
      img.onload = () => {
        const MAX_EDGE = 1280
        let width = img.width
        let height = img.height
        if (width > MAX_EDGE || height > MAX_EDGE) {
          const ratio = Math.min(MAX_EDGE / width, MAX_EDGE / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas is not supported'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  })
}

const CONFIDENCE_STYLE: Record<IdentifySuggestion['confidenceLevel'], { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  likely: { label: 'Likely', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  unknown: { label: 'Unknown', className: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export default function InventoryModal({ open, initial, categories, submitting, error, onSubmit, onClose }: InventoryModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [sku, setSku] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [quality, setQuality] = useState('0')
  const [minStock, setMinStock] = useState('10')
  const [buyPrice, setBuyPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(EMPTY_IMAGE)
  const [systemError, setSystemError] = useState('')

  const [identifying, setIdentifying] = useState(false)
  const [suggestion, setSuggestion] = useState<IdentifySuggestion | null>(null)
  const [identifyError, setIdentifyError] = useState('')
  const [applied, setApplied] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [imageResults, setImageResults] = useState<ImageResult[]>([])
  const [imagesLoading, setImagesLoading] = useState(false)
  const [imageSearchError, setImageSearchError] = useState('')
  const [pickedCredit, setPickedCredit] = useState<ImageResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName(initial?.name || '')
    setCategory(initial?.category || '')
    setBrand(initial?.brand || '')
    setModel(initial?.model || '')
    setSku(initial?.sku || '')
    setUnit(initial?.unit || 'pcs')
    setQuality(initial?.quantity != null ? String(initial.quantity) : '0')
    setMinStock(initial?.reorderLevel != null ? String(initial.reorderLevel) : '10')
    setBuyPrice(initial?.buyPrice != null ? String(initial.buyPrice) : '')
    setSellPrice(initial?.sellPrice != null ? String(initial.sellPrice) : '')
    setDescription(initial?.description || '')
    setImage(initial?.imageUrl ? { url: initial.imageUrl, dataUrl: '', preview: initial.imageUrl } : EMPTY_IMAGE)
    setSuggestion(null)
    setIdentifyError('')
    setSystemError('')
    setApplied(false)
    setImageResults([])
    setImageSearchError('')
    setPickedCredit(null)
    setImagesLoading(false)
  }, [open, initial])

  useEffect(() => {
    const term = name.trim()
    if (term.length < MIN_SEARCH_LENGTH) {
      setImageResults([])
      setImagesLoading(false)
      return
    }
    let cancelled = false
    setImagesLoading(true)
    setImageSearchError('')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/inventory/search-images?q=${encodeURIComponent(term)}`)
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setImageResults([])
          setImageSearchError(json?.error || 'Image search failed')
          return
        }
        setImageResults(Array.isArray(json?.results) ? json.results : [])
      } catch {
        if (!cancelled) {
          setImageResults([])
          setImageSearchError('Image search failed')
        }
      } finally {
        if (!cancelled) setImagesLoading(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [name])

  if (!open) return null

  function handleFile(file: File | undefined | null) {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
      setSystemError('Unsupported image type. Use PNG, JPG, JPEG, or WEBP.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setSystemError('Image is too large. Please upload an image under 8 MB.')
      return
    }
    setSystemError('')
    downscaleDataUrl(file)
      .then((dataUrl) => {
        setImage({ url: dataUrl, dataUrl, preview: dataUrl })
        setPickedCredit(null)
        setSuggestion(null)
        setIdentifyError('')
        setApplied(false)
      })
      .catch((e: Error) => setSystemError(e.message || 'Could not process the image'))
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  async function identify() {
    if (!image.preview || identifying) return
    setIdentifying(true)
    setIdentifyError('')
    setSuggestion(null)
    try {
      const res = await fetch('/api/admin/inventory/identify-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: image.preview, productName: name.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || 'Identification failed')
      }
      setSuggestion(json?.suggestion || null)
      if (!json?.suggestion) throw new Error('No suggestions returned')
    } catch (e: any) {
      setIdentifyError(e?.message || 'AI identification is temporarily unavailable. Please try again later or enter the product details manually.')
    } finally {
      setIdentifying(false)
    }
  }

  function pickSearchImage(result: ImageResult) {
    setImage({ url: result.url, dataUrl: '', preview: result.thumb })
    setPickedCredit(result)
    setSystemError('')
    setSuggestion(null)
    setIdentifyError('')
    setApplied(false)
  }

  function applySuggestions() {
    if (!suggestion) return
    if (!name.trim()) setName(suggestion.productName || suggestion.productType || '')
    if (!category) setCategory(suggestion.category || '')
    if (!brand.trim()) setBrand(suggestion.brand || suggestion.possibleBrand || '')
    if (!model.trim()) setModel(suggestion.model || suggestion.modelNumber || suggestion.possibleModel || '')
    if (!sku.trim()) {
      const candidate = suggestion.productNumber || suggestion.modelNumber || ''
      if (candidate) setSku(candidate)
    }
    if (!unit.trim() || unit === 'pcs') setUnit(suggestion.unit || 'pcs')
    const companions = [suggestion.voltage, suggestion.current, suggestion.wattage, suggestion.dimensions].filter(Boolean)
    const specs = suggestion.specifications
      ? companions.length
        ? `${suggestion.specifications} • ${companions.join(' • ')}`
        : suggestion.specifications
      : companions.join(' • ')
    if (!description.trim() && specs) setDescription(specs)
    if (suggestion.notes && !description.trim()) setDescription((prev) => (prev ? `${prev}\n\n${suggestion.notes}` : suggestion.notes))
    setApplied(true)
  }

  function handleSubmit() {
    if (!name.trim()) {
      setSystemError('Product name is required')
      return
    }
    if (!category.trim()) {
      setSystemError('Category is required')
      return
    }
    if (!unit.trim()) {
      setSystemError('Unit is required')
      return
    }
    void onSubmit({
      name: name.trim(),
      sku: sku.trim() || undefined,
      category: category.trim(),
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      description: description.trim() || undefined,
      quantity: Math.max(0, Number(quality) || 0),
      unit: unit.trim() || 'pcs',
      buyPrice: buyPrice !== '' ? Number(buyPrice) : null,
      sellPrice: sellPrice !== '' ? Number(sellPrice) : null,
      reorderLevel: Math.max(0, Number(minStock) || 0),
      imageUrl: image.url || undefined,
      imageData: image.dataUrl || undefined,
    })
  }

  const fieldClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-shadow'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm" onClick={() => !submitting && onClose()}>
      <div
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-black text-slate-900">{initial?.id ? 'Edit Item' : 'Add New Item'}</h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              {initial?.id ? 'Update details, pricing and stock' : 'Add an electrical product, material, or equipment'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[300px_1fr] md:gap-8 md:p-6">
          {/* LEFT: image + AI */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500">Product Image</label>

              {image.preview ? (
                <div className="relative mt-1.5 aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.preview} alt="Product preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(EMPTY_IMAGE)
                      setSuggestion(null)
                      setPickedCredit(null)
                    }}
                    aria-label="Remove image"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white transition-colors hover:bg-black/80"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`mt-1.5 flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${
                    dragging ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-slate-50/60 hover:border-yellow-400 hover:bg-yellow-50/40'
                  }`}
                >
                  <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16v1a2 2 0 002 2h14a2 2 0 002-2v-1M12 4v9m0 0l-3-3m3 3l3-3M5 12V8a2 2 0 012-2h10a2 2 0 012 2v4"
                    />
                  </svg>
                  <span className="text-xs font-bold text-slate-500">Click to upload or drag and drop</span>
                  <span className="text-[10px] font-medium text-slate-400">PNG · JPG · JPEG · WEBP · up to 8 MB</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={handleFileInput} />
              {systemError && <div className="mt-2 text-xs font-bold text-red-600">{systemError}</div>}
            </div>

            {(imagesLoading || imageResults.length > 0 || imageSearchError) && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Or pick a photo</span>
                  {imagesLoading && (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-yellow-500" />
                  )}
                </div>

                {imageSearchError && !imagesLoading && (
                  <p className="mt-2 text-[11px] font-medium text-slate-400">{imageSearchError}</p>
                )}

                {!imagesLoading && imageResults.length === 0 && !imageSearchError && (
                  <p className="mt-2 text-[11px] font-medium text-slate-400">No matching photos found.</p>
                )}

                {imageResults.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {imageResults.map((r) => {
                      const selected = pickedCredit?.id === r.id
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => pickSearchImage(r)}
                          title={r.title}
                          className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                            selected ? 'border-yellow-400' : 'border-transparent hover:border-yellow-300'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.thumb} alt={r.title} className="h-full w-full object-cover" loading="lazy" />
                          {selected && (
                            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[9px] font-black text-black">
                              ✓
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {pickedCredit && (
                  <p className="mt-2 text-[10px] font-medium leading-relaxed text-slate-400">
                    Photo: {pickedCredit.artist} · {pickedCredit.license}
                  </p>
                )}
              </div>
            )}

            {/* Identify with AI */}
            <button
              type="button"
              onClick={identify}
              disabled={!image.preview || identifying}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-yellow-400 hover:text-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {identifying ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-yellow-500" />
                  Identifying...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                    />
                  </svg>
                  Identify Product
                </>
              )}
            </button>
            <p className="text-[10px] font-medium text-slate-400">Uses an image-based AI to suggest product details. You review before applying.</p>

            {identifyError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">{identifyError}</div>}

            {/* Suggestion panel */}
            {suggestion && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-slate-900">Product Details Suggestion</h4>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${CONFIDENCE_STYLE[suggestion.confidenceLevel].className}`}>
                    {CONFIDENCE_STYLE[suggestion.confidenceLevel].label}
                  </span>
                </div>

                <dl className="mt-3 space-y-2 text-xs">
                  {(suggestion.productName || suggestion.productType) && (
                    <Row label="Product" value={suggestion.productName || suggestion.productType || '—'} />
                  )}
                  {suggestion.brand || suggestion.possibleBrand ? (
                    <Row label="Brand" value={suggestion.brand || suggestion.possibleBrand || '—'} hint={suggestion.brand ? '' : 'possible'} />
                  ) : null}
                  {suggestion.model || suggestion.possibleModel ? (
                    <Row
                      label="Model"
                      value={suggestion.model || suggestion.modelNumber || suggestion.possibleModel || '—'}
                      hint={suggestion.model ? '' : 'possible'}
                    />
                  ) : null}
                  {suggestion.category && <Row label="Category" value={suggestion.category} />}
                  {suggestion.unit && <Row label="Unit" value={suggestion.unit} />}
                  {(suggestion.specifications || suggestion.voltage || suggestion.wattage) && (
                    <Row
                      label="Specifications"
                      value={[suggestion.specifications, suggestion.voltage, suggestion.current, suggestion.wattage, suggestion.dimensions].filter(Boolean).join(' • ')}
                    />
                  )}
                  {suggestion.notes && <Row label="Notes" value={suggestion.notes} />}
                </dl>

                {suggestion.evidence.length > 0 && (
                  <div className="mt-3 border-t border-slate-200 pt-2.5">
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Evidence</div>
                    <ul className="mt-1.5 space-y-1">
                      {suggestion.evidence.map((e, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-500">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-yellow-400" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={applySuggestions}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-black text-black transition-colors hover:bg-yellow-500"
                >
                  {applied ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Applied
                    </>
                  ) : (
                    'Apply Suggestions'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: fields */}
          <div className="space-y-4">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600">{error}</div>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Product Name *" value={name} onChange={setName} placeholder="e.g. LED Bulb 12W" required />
              <Select label="Category *" value={category} onChange={setCategory} options={categories} required />
              <Field label="Manufacturer / Brand" value={brand} onChange={setBrand} placeholder="e.g. Philips" />
              <Field label="Model Number" value={model} onChange={setModel} placeholder="e.g. LED-12W-220V" />
              <Field label="SKU / Product Number" value={sku} onChange={setSku} placeholder="e.g. WH-001" />
              <Field label="Unit *" value={unit} onChange={setUnit} placeholder="pcs, meters, rolls…" required />
              <Field label="Buy Price" type="number" inputMode="decimal" min={0} step="0.01" value={buyPrice} onChange={setBuyPrice} placeholder="Cost per unit" prefix="$" />
              <Field label="Sell Price" type="number" inputMode="decimal" min={0} step="0.01" value={sellPrice} onChange={setSellPrice} placeholder="Retail price" prefix="$" />
              <Field label="Initial Stock *" type="number" inputMode="numeric" min={0} step={1} value={quality} onChange={setQuality} placeholder="0" required />
              <Field label="Minimum Stock" type="number" inputMode="numeric" min={0} step={1} value={minStock} onChange={setMinStock} placeholder="10" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500">Description / Specifications</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Optional notes, specs, or product details…"
                className={`${fieldClass} mt-1 resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !category.trim() || !unit.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-6 py-2.5 text-xs font-black text-black shadow-sm transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                Saving…
              </>
            ) : initial?.id ? (
              'Save Changes'
            ) : (
              'Save Item'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-right text-[11px] font-semibold leading-relaxed text-slate-700">
        {value}
        {hint && <span className="ml-1 text-[10px] font-medium text-slate-400">({hint})</span>}
      </dd>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  min,
  step,
  prefix,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  min?: number
  step?: string | number
  prefix?: string
  inputMode?: 'text' | 'decimal' | 'numeric'
}) {
  const fieldClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-shadow'
  const inner = (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      step={step}
      inputMode={inputMode}
      className={`${fieldClass} ${prefix ? 'pl-8' : ''}`}
    />
  )
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {prefix ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">{prefix}</span>
          {inner}
        </div>
      ) : (
        inner
      )}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-shadow"
      >
        <option value="">— Select category —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}