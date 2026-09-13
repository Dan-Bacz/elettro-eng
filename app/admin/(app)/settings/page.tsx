'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import PageHeader from '../../../../components/admin/PageHeader'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return }
          throw new Error('Failed to load settings')
        }
        const payload = await res.json()
        if (!cancelled) setForm(payload.settings || {})
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: form }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to save settings')
      }
      setSaved(true)
    } catch (e: any) {
      setError(e.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader icon="⚙️" title="Settings" subtitle="Company details used across the admin panel" />

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
        {saved && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">Settings saved.</div>}

        <div className="grid grid-cols-1 gap-4">
          <SettingField label="Organization Name" value={form.orgName || ''} placeholder="ELETTRO Engineering Enterprises" onChange={(v) => setForm((f) => ({ ...f, orgName: v }))} />
          <SettingField label="Support Email" value={form.supportEmail || ''} placeholder="support@elettro.com" onChange={(v) => setForm((f) => ({ ...f, supportEmail: v }))} />
          <SettingField label="Support Phone" value={form.supportPhone || ''} placeholder="+1 555 000 0000" onChange={(v) => setForm((f) => ({ ...f, supportPhone: v }))} />
          <SettingField label="Company Address" value={form.address || ''} placeholder="Full address" onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
          <SettingField label="Admin Email" value={form.adminEmail || ''} placeholder="admin@elettro.com" onChange={(v) => setForm((f) => ({ ...f, adminEmail: v }))} />
          <SettingField label="Low Stock Threshold" type="number" value={form.lowStockThreshold || '10'} onChange={(v) => setForm((f) => ({ ...f, lowStockThreshold: v }))} hint="Inventory items at or below this quantity are flagged as low stock." />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-yellow-400 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SettingField({ label, value, onChange, placeholder, type = 'text', hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400" />
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}