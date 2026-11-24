'use client'

import Image from 'next/image'
import { useState } from 'react'

type Props = { section: string; name?: string }

export default function RiderSidebar({ section, name }: Props) {
  const [open, setOpen] = useState(false)
  const items = [['dashboard', 'Dashboard'], ['deliveries', 'My Deliveries'], ['profile', 'Profile']]
  const nav = <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">{items.map(([key, label]) => <a key={key} href={`#${key}`} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${section === key ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><span className="flex h-5 w-5 items-center justify-center text-base">{key === 'dashboard' ? '⌂' : key === 'deliveries' ? '▣' : '●'}</span><span>{label}</span></a>)}</nav>
  const content = <><div className="flex h-16 items-center gap-2 border-b border-white/10 px-4"><Image src="/logo-elettro.jpg" alt="Elettro" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" /><div><div className="text-sm font-black tracking-wide text-white">ELETTRO</div><div className="text-[9px] font-semibold uppercase tracking-[.18em] text-gray-500">Engineering Rider</div></div><button onClick={() => setOpen(false)} className="ml-auto text-2xl text-gray-500 lg:hidden" aria-label="Close navigation">×</button></div><div className="mx-3 mt-4 rounded-xl border border-white/10 bg-white/5 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 font-black text-black">{name?.charAt(0) || 'R'}</div><p className="mt-2 truncate text-xs font-black text-white">{name || 'Rider'}</p><p className="text-[10px] text-gray-500">Delivery operations</p></div>{nav}<div className="border-t border-white/10 p-3"><a href="elettro://logout" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-gray-400 transition hover:bg-red-500/10 hover:text-red-400"><span>↪</span> Logout</a></div></>
  return <><button onClick={() => setOpen(true)} aria-label="Open rider navigation" className="fixed left-4 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-[#2a3138] bg-[#0b0f10] text-xl text-[#a7b1bc] lg:hidden">☰</button>{open && <button onClick={() => setOpen(false)} aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" />}<aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#2a3138] bg-[#0b0f10] text-gray-300 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>{content}</aside></>
}
