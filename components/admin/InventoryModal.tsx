'use client'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import type { InventoryItemObj } from './types'

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
const MAX_EDGE = 1280

const EMPTY_IMAGE = { url: '', dataUrl: '', preview: '' }

function downscaleDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the image file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Unsupported image file'))
      img.onload = () => {
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
  const [dragging, setDragging] = useState(false)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

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
    setSystemError('')
  }, [open, initial])

  useEffect(() => {
    if (!open) stopCamera()
  }, [open])

  useEffect(() => {
    const video = videoRef.current
    if (!cameraOpen || !video || !streamRef.current) return
    video.srcObject = streamRef.current
    video.play().catch(() => undefined)
  }, [cameraOpen])

  if (!open) return null

  function applyImage(dataUrl: string) {
    setImage({ url: dataUrl, dataUrl, preview: dataUrl })
    setSystemError('')
  }

  function handleFile(file: File | undefined | null) {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
      setSystemError('Unsupported image type. Use PNG, JPG, JPEG, or WEBP.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setSystemError('Image is too large. Please select an image under 8 MB.')
      return
    }
    setSystemError('')
    downscaleDataUrl(file)
      .then(applyImage)
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

  function stopCamera() {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.srcObject = null
      }
    } finally {
      setCameraOpen(false)
    }
  }

  async function startCamera() {
    setCameraError('')
    setSystemError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported on this device.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraOpen(true)
    } catch {
      setCameraError('Unable to access the camera. Check your browser permissions.')
    }
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCameraError('Could not capture the photo.')
      return
    }
    ctx.drawImage(video, 0, 0, width, height)
    applyImage(canvas.toDataURL('image/jpeg', 0.82))
    stopCamera()
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
              {initial?.id ? 'Update details, pricing and stock' : 'Add an electrical product or equipment'}
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
          {/* LEFT: image upload via import or camera */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500">Product Image</label>

              {image.preview ? (
                <div className="relative mt-1.5 aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.preview} alt="Product preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImage(EMPTY_IMAGE)}
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
                  <span className="text-xs font-bold text-slate-500">Click to import or drag and drop</span>
                  <span className="text-[10px] font-medium text-slate-400">PNG · JPG · JPEG · WEBP · up to 8 MB</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={handleFileInput} />
              {systemError && <div className="mt-2 text-xs font-bold text-red-600">{systemError}</div>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-yellow-400 hover:text-yellow-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16v1a2 2 0 002 2h14a2 2 0 002-2v-1M12 4v9m0 0l-3-3m3 3l3-3M5 12V8a2 2 0 012-2h10a2 2 0 012 2v4"
                  />
                </svg>
                Import Image
              </button>
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-yellow-400 hover:text-yellow-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8.5A1.5 1.5 0 014.5 7h2.086a1.5 1.5 0 011.414.9l.5.833a1.5 1.5 0 001.414.9H14.5A1.5 1.5 0 0116 10.5v7A1.5 1.5 0 0114.5 19h-10A1.5 1.5 0 013 17.5v-9zM16 12.5h1.379a1.5 1.5 0 011.06.44l1.561 1.42A1.5 1.5 0 0121 15.22V17.5a1.5 1.5 0 01-1.5 1.5H16"
                  />
                </svg>
                Use Camera
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {cameraError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">{cameraError}</div>}

            {cameraOpen && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <video ref={videoRef} autoPlay playsInline muted className="aspect-square w-full rounded-lg bg-black object-cover" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-black text-black transition-colors hover:bg-yellow-500"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8.5A1.5 1.5 0 014.5 7h2.086a1.5 1.5 0 011.414.9l.5.833a1.5 1.5 0 001.414.9H14.5A1.5 1.5 0 0116 10.5v7A1.5 1.5 0 0114.5 19h-10A1.5 1.5 0 013 17.5v-9zM16 12.5h1.379a1.5 1.5 0 011.06.44l1.561 1.42A1.5 1.5 0 0121 15.22V17.5a1.5 1.5 0 01-1.5 1.5H16"
                      />
                    </svg>
                    Capture
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
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