'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'


export default function RiderDashboardPage() {
  const router = useRouter()
  const [rider, setRider] = useState<any>(null)
  const [stats, setStats] = useState<any>({})
  const [section, setSection] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [availabilityBusy, setAvailabilityBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/rider', { cache: 'no-store' })
      if (!res.ok) { if (res.status === 401) router.push('/rider/login'); throw new Error('Unable to load rider dashboard') }
      const data = await res.json(); setRider(data.rider); setStats(data.stats || {})
    } catch (error: any) { setNotice(error.message || 'Unable to load rider dashboard') } finally { setLoading(false) }
  }

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1)
      if (hash === 'deliveries') router.replace('/rider/deliveries')
      else setSection(hash || 'dashboard')
    }
    sync()
    window.addEventListener('hashchange', sync)
    void load()
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  async function updateAvailability(available: boolean) { setAvailabilityBusy(true); setNotice(''); try { const res = await fetch('/api/rider', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available }) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || 'Unable to update availability'); setRider((current: any) => ({ ...current, available })); setNotice(available ? 'You are now available for delivery assignments.' : 'You are now unavailable for new delivery assignments.') } catch (error: any) { setNotice(error.message || 'Unable to update availability') } finally { setAvailabilityBusy(false) } }

  if (loading) return <div className="mx-auto max-w-6xl space-y-5"><div className="h-44 animate-pulse rounded-[2rem] bg-slate-200" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}</div></div>

  const profile = section === 'profile'
  const cards = [['Today', stats.today, 'Assigned today', 'from-cyan-400 to-blue-500'], ['Pending', stats.pending, 'Awaiting pickup', 'from-amber-300 to-orange-500'], ['In transit', stats.inTransit, 'On the road', 'from-violet-400 to-indigo-500'], ['Completed', stats.completed, 'Successfully delivered', 'from-emerald-400 to-teal-500']] as const


  return <div className="mx-auto max-w-6xl space-y-6">{notice && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{notice}</div>}{profile ? <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_-35px_rgba(15,23,42,.5)]"><div className="h-28 bg-gradient-to-r from-slate-950 via-[#123b46] to-cyan-700" /><div className="-mt-12 px-6 pb-7 sm:px-8"><div className="flex h-24 w-24 items-center justify-center rounded-3xl border-8 border-white bg-yellow-400 text-3xl font-black text-slate-950 shadow-xl">{rider?.name?.charAt(0) || 'R'}</div><div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Rider profile</p><h1 className="mt-1 text-2xl font-black text-slate-950">{rider?.name}</h1><p className="mt-1 text-sm text-slate-500">{rider?.email}</p></div><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div><p className="text-xs font-black text-slate-900">Delivery availability</p><p className="mt-1 text-[11px] text-slate-500">Accept new assignments</p></div><button type="button" disabled={availabilityBusy} onClick={() => updateAvailability(rider?.available === false)} className={`relative h-7 w-12 rounded-full transition ${rider?.available === false ? 'bg-slate-300' : 'bg-emerald-500'} disabled:opacity-50`} aria-label={rider?.available === false ? 'Set available' : 'Set unavailable'}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${rider?.available === false ? 'left-1' : 'left-6'}`} /></button></div></div><div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Role</p><p className="mt-1 font-black text-slate-900">Delivery Rider</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Access</p><p className="mt-1 font-black text-slate-900">Authorized portal</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status</p><p className={`mt-1 font-black ${rider?.available === false ? 'text-slate-500' : 'text-emerald-600'}`}>{rider?.available === false ? 'Unavailable' : 'Available'}</p></div></div></div></section> : <><section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-[#12333d] to-[#08727f] p-6 text-white shadow-[0_28px_60px_-30px_rgba(15,23,42,.85)] sm:p-8"><div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" /><div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-yellow-300/10 blur-3xl" /><div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-100"><span className={`h-2 w-2 rounded-full ${rider?.available === false ? 'bg-slate-300' : 'bg-emerald-300'}`} /> {rider?.available === false ? 'Currently unavailable' : 'Ready for dispatch'}</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Good day, {rider?.name?.split(' ')[0] || 'Rider'}.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Your delivery command center for assignments, handovers, and successful customer service.</p></div><button type="button" disabled={availabilityBusy} onClick={() => updateAvailability(rider?.available === false)} className="relative z-10 rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black text-slate-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:opacity-60">{rider?.available === false ? 'Set available' : 'Pause assignments'}</button></div></section><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([text, value, note, accent]) => <div key={text} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,.55)]"><div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} /><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{text}</p><p className="mt-3 text-4xl font-black text-slate-950">{value || 0}</p><p className="mt-1 text-xs font-medium text-slate-500">{note}</p></div>)}</div><Link href="/rider/deliveries" className="inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-yellow-300">My Deliveries</Link></>}</div>
}
