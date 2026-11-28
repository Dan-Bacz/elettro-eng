'use client'

import { useEffect, useRef, useState } from 'react'
import { UserIcon } from './admin/icons'
import { MAX_PROFILE_PHOTO_BYTES, PROFILE_PHOTO_TYPES } from '../lib/staff-profile'

const MAX_SOURCE_BYTES = 20 * 1024 * 1024

export async function registrationPhotoData(file: File | null, maxDataLength = 4 * Math.floor(MAX_PROFILE_PHOTO_BYTES / 3) + 23) {
  if (!file) return undefined
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Photo processing is unavailable.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.86, 0.72, 0.55, 0.4]) {
      const data = canvas.toDataURL('image/jpeg', quality)
      if (data.length <= maxDataLength) return data
    }
    throw new Error('The processed photo is too large.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function RegistrationPhotoPicker({ photo, onChange, disabled, dark = false }: {
  photo: File | null
  onChange: (file: File | null) => void
  disabled: boolean
  dark?: boolean
}) {
  const upload = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const cameraDialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraAttempt = useRef(0)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)

  function stopCamera() {
    cameraAttempt.current++
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => stopCamera, [])

  useEffect(() => {
    if (!photo) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  function select(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!PROFILE_PHOTO_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_SOURCE_BYTES) {
      setError('Choose a JPG, PNG, or WebP image up to 20 MB.')
      return
    }
    setError('')
    onChange(file)
  }

  async function openCamera() {
    if (window.matchMedia('(pointer: coarse)').matches || !navigator.mediaDevices?.getUserMedia) {
      camera.current?.click()
      return
    }
    const dialog = cameraDialog.current
    if (!dialog || !video.current) return
    setError('')
    setCameraReady(false)
    dialog.showModal()
    const attempt = ++cameraAttempt.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (attempt !== cameraAttempt.current || !dialog.open || !video.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      video.current.srcObject = stream
    } catch {
      if (attempt === cameraAttempt.current && dialog.open) {
        dialog.close()
        setError('Could not access the camera. Check camera permissions or upload a photo.')
      }
    }
  }

  function capturePhoto() {
    const frame = video.current
    if (!frame?.videoWidth || !frame.videoHeight) return
    const canvas = document.createElement('canvas')
    canvas.width = frame.videoWidth
    canvas.height = frame.videoHeight
    canvas.getContext('2d')?.drawImage(frame, 0, 0)
    canvas.toBlob((blob) => {
      if (!cameraDialog.current?.open) return
      cameraDialog.current.close()
      if (blob) onChange(new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' }))
      else setError('Could not capture the photo. Try again or upload a photo.')
    }, 'image/jpeg', 0.9)
  }

  const button = `rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50 ${dark ? 'border-white/20 hover:border-yellow-400' : 'border-slate-300 bg-white hover:border-amber-500'}`

  return (
    <fieldset disabled={disabled} className={`flex min-w-0 flex-wrap items-center gap-4 rounded-2xl border p-4 ${dark ? 'border-white/15 bg-black/15 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
      <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full ${dark ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-500'}`}>
        {photo && preview ? <img src={preview} alt="Profile photo preview" className="h-full w-full object-cover" /> : <UserIcon className="h-6 w-6" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Profile photo <span className="text-xs font-normal">(optional)</span></p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => void openCamera()} className={button}>Take photo</button>
          <button type="button" onClick={() => upload.current?.click()} className={button}>Upload photo</button>
          {photo && <button type="button" onClick={() => { setError(''); onChange(null) }} className={button}>Remove</button>}
        </div>
        {error && <p role="alert" className={`mt-2 text-xs ${dark ? 'text-red-300' : 'text-red-700'}`}>{error}</p>}
      </div>
      <input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={(event) => select(event.currentTarget)} />
      <input ref={upload} type="file" accept={PROFILE_PHOTO_TYPES.join(',')} hidden onChange={(event) => select(event.currentTarget)} />
      <dialog
        ref={cameraDialog}
        aria-label="Take a profile photo"
        onClose={() => { stopCamera(); setCameraReady(false) }}
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-slate-950 p-4 text-white backdrop:bg-slate-950/75"
      >
        <h2 className="text-base font-bold">Take a profile photo</h2>
        <video ref={video} autoPlay muted playsInline onPlaying={() => setCameraReady(true)} className="mt-3 aspect-video w-full rounded-lg bg-black object-contain" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => cameraDialog.current?.close()} className="rounded-lg px-3 py-2 text-sm font-bold hover:bg-white/10">Cancel</button>
          <button type="button" onClick={capturePhoto} disabled={!cameraReady} className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Capture photo</button>
        </div>
      </dialog>
    </fieldset>
  )
}
