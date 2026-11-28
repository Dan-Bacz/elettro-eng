'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MAX_PROFILE_PHOTO_BYTES, PROFILE_PHOTO_TYPES, type StaffProfile } from '../../lib/staff-profile'

const fieldClass = 'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200'

function readPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the selected photo.'))
    reader.readAsDataURL(file)
  })
}

export default function AccountSettings({ department, initialProfile }: { department: 'Sales' | 'Warehouse' | 'Client'; initialProfile: StaffProfile }) {
  const router = useRouter()
  const photoDialog = useRef<HTMLDialogElement>(null)
  const [saved, setSaved] = useState(initialProfile)
  const [name, setName] = useState(initialProfile.name)
  const [phone, setPhone] = useState(initialProfile.phone || '')
  const [address, setAddress] = useState(initialProfile.address || '')
  const [photo, setPhoto] = useState<File | null | undefined>(undefined)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const avatar = photo === undefined ? saved.profileImageUrl : photo ? preview : null
  const changed = name.trim() !== saved.name || phone.trim() !== (saved.phone || '') ||
    address.trim() !== (saved.address || '') || photo !== undefined

  function selectPhoto(file?: File) {
    if (!file) return
    setNotice('')
    if (!PROFILE_PHOTO_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_PROFILE_PHOTO_BYTES) {
      setError('Choose a JPG, PNG, or WebP photo up to 2 MB.')
      return
    }
    setError('')
    setPhoto(file)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/${department.toLowerCase()}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address, photo: photo ? await readPhoto(photo) : photo }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Could not save your account settings.')

      const profile: StaffProfile = payload.profile
      setSaved(profile)
      setName(profile.name)
      setPhone(profile.phone || '')
      setAddress(profile.address || '')
      setPhoto(undefined)
      setNotice('Your account settings were saved.')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save your account settings.')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setName(saved.name)
    setPhone(saved.phone || '')
    setAddress(saved.address || '')
    setPhoto(undefined)
    setError('')
    setNotice('')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-3xl border border-slate-800 bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-8">
        <p className="text-sm font-semibold text-yellow-300">{department === 'Client' ? 'Client portal' : `${department} Department`}</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Account settings</h1>
        <p className="mt-2 text-sm text-slate-300">Manage your profile photo and contact information.</p>
      </header>

      <form onSubmit={save} className="space-y-5">
        <fieldset disabled={saving} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] disabled:opacity-70">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="photo-heading">
            <h2 id="photo-heading" className="text-base font-bold text-slate-950">Profile photo</h2>
            {avatar ? (
              <button
                type="button"
                aria-label="Enlarge profile photo"
                aria-haspopup="dialog"
                onClick={() => photoDialog.current?.showModal()}
                className="mt-5 block h-28 w-28 cursor-zoom-in overflow-hidden rounded-full bg-slate-100 ring-4 ring-amber-50 transition hover:ring-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500"
              >
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              </button>
            ) : (
              <div aria-hidden="true" className="mt-5 flex h-28 w-28 items-center justify-center rounded-full bg-amber-100 text-3xl font-black text-amber-900 ring-4 ring-amber-50">
                {(name.trim() || department).charAt(0).toUpperCase()}
              </div>
            )}
            <p id="photo-formats" className="mt-5 text-xs text-slate-600">JPG, PNG, or WebP. Up to 2 MB.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-amber-400">
                Change photo
                <input
                  type="file"
                  accept={PROFILE_PHOTO_TYPES.join(',')}
                  aria-describedby="photo-formats"
                  className="sr-only"
                  onChange={(event) => {
                    selectPhoto(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
              {(saved.profileImageUrl || photo) && photo !== null && (
                <button type="button" onClick={() => { setPhoto(saved.profileImageUrl ? null : undefined); setNotice(''); setError('') }} className="rounded-lg px-2 py-2 text-xs font-bold text-red-700 hover:bg-red-50">
                  Remove
                </button>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="details-heading">
            <h2 id="details-heading" className="text-base font-bold text-slate-950">Profile details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-800">
                Full name
                <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete="name" className={fieldClass} />
              </label>
              <label className="text-sm font-semibold text-slate-800">
                Sign-in email
                <input value={saved.email} type="email" readOnly className={`${fieldClass} bg-slate-50 text-slate-600`} />
              </label>
              <label className="text-sm font-semibold text-slate-800 sm:col-span-2">
                Phone number
                <input type="tel" required={department === 'Client'} value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} autoComplete="tel" className={fieldClass} />
              </label>
              <label className="text-sm font-semibold text-slate-800 sm:col-span-2">
                Address
                <textarea value={address} onChange={(event) => setAddress(event.target.value)} maxLength={300} autoComplete="street-address" rows={3} className={`${fieldClass} resize-y`} />
              </label>
            </div>
          </section>
        </fieldset>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={reset} disabled={!changed || saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Discard changes</button>
          <button type="submit" disabled={!changed || !name.trim() || saving} className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
      {avatar && (
        <dialog
          ref={photoDialog}
          aria-labelledby="profile-photo-preview-title"
          className="m-auto max-h-[calc(100dvh_-_2rem)] max-w-[calc(100vw_-_2rem)] overflow-auto rounded-2xl bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-slate-950/75"
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <h2 id="profile-photo-preview-title" className="text-sm font-bold">Profile photo</h2>
            <button type="button" onClick={() => photoDialog.current?.close()} className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-bold hover:bg-white/10">
              Close
            </button>
          </div>
          <img src={avatar} alt={`Profile photo of ${name.trim() || department}`} className="mx-auto block h-auto max-h-[calc(100dvh_-_5rem)] w-auto max-w-full object-contain" />
        </dialog>
      )}
    </div>
  )
}
