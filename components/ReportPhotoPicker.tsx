'use client'

import { useState } from 'react'
import { registrationPhotoData } from './RegistrationPhotoPicker'
import { MAX_REPORT_PHOTOS, MAX_REPORT_PHOTO_LENGTH } from '../lib/report-photos'

export function ReportPhotoGallery({ photos }: { photos: string[] }) {
  if (!photos.length) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {photos.map((photo, index) => (
        <img key={index} src={photo} alt={`Report photo ${index + 1}`} loading="lazy" className="max-h-64 w-32 rounded-lg border border-slate-200 object-contain" />
      ))}
    </div>
  )
}

export default function ReportPhotoPicker({ label, photos, onChange, onProcessing, disabled, maxPhotos = MAX_REPORT_PHOTOS }: {
  label: string
  photos: string[]
  onChange: (photos: string[]) => void
  onProcessing: (processing: boolean) => void
  disabled: boolean
  maxPhotos?: number
}) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  return (
    <fieldset disabled={disabled || processing} className="mt-3 space-y-2">
      <legend className="text-xs font-bold text-slate-800">{label}</legend>
      <label className="inline-block cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus-within:ring-2 focus-within:ring-cyan-600">
        {processing ? 'Preparing photo…' : 'Capture photo'}
        <input type="file" accept="image/*" capture="environment" aria-label={`Capture ${label.toLowerCase()}`} className="sr-only" disabled={photos.length >= maxPhotos} onChange={async (event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (!file) return
          setProcessing(true)
          onProcessing(true)
          setError('')
          try {
            const photo = await registrationPhotoData(file, MAX_REPORT_PHOTO_LENGTH)
            if (photo) onChange([...photos, photo])
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Unable to prepare the photo.')
          } finally {
            setProcessing(false)
            onProcessing(false)
          }
        }} />
      </label>
      <p className="text-xs text-slate-600">{photos.length} of {maxPhotos} attached</p>
      {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <div key={index} className="space-y-1 text-center">
            <img src={photo} alt={`Captured photo ${index + 1}`} className="h-20 w-24 rounded-lg object-cover" />
            <button type="button" onClick={() => onChange(photos.filter((_, i) => i !== index))} className="text-xs font-semibold text-red-700">Remove photo {index + 1}</button>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
