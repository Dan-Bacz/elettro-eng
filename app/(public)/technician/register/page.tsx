'use client'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const SPECIALIZATIONS = ['Electrical', 'Plumbing', 'HVAC', 'Renovation', 'Painting', 'General Maintenance']

export default function TechnicianRegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', specialization: '', yearsOfExperience: '',
    skills: '', password: '', confirmPassword: '',
  })
  const [profileImage, setProfileImage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProfileImage(String(reader.result || ''))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          address: form.address || undefined,
          specialization: form.specialization || undefined,
          yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
          skills: form.skills || undefined,
          password: form.password,
          profileImage: profileImage || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Registration failed')
      }
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-[70vh] bg-slate-50 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</div>
          <h1 className="mt-4 text-xl font-black text-slate-900">Registration Submitted</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your technician account is pending admin approval. You will be able to sign in once an administrator approves your registration.
          </p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-black hover:bg-yellow-500 transition-colors">
            Back to Website
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-slate-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Become a Technician</h1>
          <p className="mt-2 text-sm text-slate-500">Register as an Elettro technician and get assigned to engineering jobs.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50">
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl text-slate-300">👤</span>
              )}
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-700 transition-colors">
                Upload Photo
              </button>
              <p className="mt-1 text-[11px] text-slate-400">Optional · used on your technician profile</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          {/* Personal info */}
          <Field label="Full Name *" value={form.name} onChange={(v) => setField('name', v)} required placeholder="e.g. John Doe" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email *" type="email" value={form.email} onChange={(v) => setField('email', v)} required placeholder="you@example.com" />
            <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setField('phone', v)} placeholder="+1 555 000 0000" />
          </div>
          <Field label="Address" value={form.address} onChange={(v) => setField('address', v)} placeholder="Street, city, region" />

          {/* Professional info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Specialization</label>
              <select value={form.specialization} onChange={(e) => setField('specialization', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="">Select…</option>
                {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Field label="Years of Experience" type="number" min={0} value={form.yearsOfExperience} onChange={(v) => setField('yearsOfExperience', v)} placeholder="e.g. 5" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Skills</label>
            <textarea value={form.skills} onChange={(e) => setField('skills', e.target.value)} rows={3} placeholder="Comma-separated, e.g. Wiring, Installation, Troubleshooting" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>

          {/* Password */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Password *" type="password" value={form.password} onChange={(v) => setField('password', v)} required placeholder="At least 6 characters" />
            <Field label="Confirm Password *" type="password" value={form.confirmPassword} onChange={(v) => setField('confirmPassword', v)} required placeholder="Repeat password" />
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-400/25 disabled:opacity-60">
            {loading ? 'Submitting…' : 'Submit Application'}
          </button>

          <p className="text-center text-[11px] text-slate-400">
            Already registered? <Link href="/technician/login" className="font-bold text-yellow-700 hover:underline">Sign in here</Link>
          </p>
        </form>
      </div>
    </main>
  )
}

function Field({ label, value, onChange, type = 'text', required, placeholder, min }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string; min?: number }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} min={min} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
    </div>
  )
}