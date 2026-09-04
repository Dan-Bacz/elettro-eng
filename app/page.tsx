"use client"
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const SERVICES = [
  { title: 'Electrical Installation', desc: 'Complete electrical installation for residential, commercial, and industrial buildings.' },
  { title: 'Maintenance & Repair', desc: 'Preventive maintenance and repair services to keep your electrical systems safe and reliable.' },
  { title: 'System Upgrades', desc: 'Upgrade your electrical system to improve performance and energy efficiency.' },
  { title: 'Emergency Services', desc: '24/7 emergency electrical services for urgent issues and power interruptions.' },
]

const PRODUCTS = [
  { title: 'THHN Wire', price: '₱1,250.00', img: 'https://images.unsplash.com/photo-1591696205602-8d6b6b0d5f4a?q=80&w=400&auto=format&fit=crop' },
  { title: 'Circuit Breaker', price: '₱350.00', img: 'https://images.unsplash.com/photo-1581091215367-6a3b6f8b1b4b?q=80&w=400&auto=format&fit=crop' },
  { title: 'Distribution Board', price: '₱1,800.00', img: 'https://images.unsplash.com/photo-1600195077078-4f8b9f9c1b4b?q=80&w=400&auto=format&fit=crop' },
  { title: 'LED Bulb', price: '₱120.00', img: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=400&auto=format&fit=crop' },
]

export default function Home(){
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [serviceNeeded, setServiceNeeded] = useState('Electrical Installation')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')

  async function submitRequest(e){
    e.preventDefault()
    setSending(true)
    setMsg('')
    try{
      const payload = { fullName, phone, email, serviceNeeded, preferredDate: date, preferredTime: time, details, status: 'PENDING', createdAt: new Date().toISOString() }
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMsg('Request submitted — ref: ' + (data.id ?? ''))
      setFullName(''); setPhone(''); setEmail(''); setServiceNeeded('Electrical Installation'); setDate(''); setTime(''); setDetails('')
    }catch(err){
      setMsg('Submission failed')
    }finally{ setSending(false) }
  }

  return (
    <main className="min-h-screen font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-black">⚡</div>
              <div>
                <div className="font-bold">ELETTRO</div>
                <div className="text-xs text-gray-500">ENGINEERING ENTERPRISES</div>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-700">Home</Link>
            <a className="text-sm text-gray-700">Services</a>
            <a className="text-sm text-gray-700">Products</a>
            <a className="text-sm text-gray-700">About Us</a>
            <a className="text-sm text-gray-700">Contact Us</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/admin"><a className="text-sm text-gray-700">Admin Sign In</a></Link>
            <Link href="/client"><a className="px-4 py-2 bg-yellow-400 text-black rounded">Book a Service</a></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-r from-white via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <h1 className="text-5xl font-extrabold text-black leading-tight">POWERING SOLUTIONS, BUILDING <span className="text-yellow-400">TRUST.</span></h1>
            <p className="mt-6 text-gray-700 max-w-xl">We provide reliable electrical installation, maintenance, and supply solutions for homes, businesses, and industries.</p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded shadow-sm flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-yellow-50 flex items-center justify-center text-yellow-500">✓</div>
                <div>
                  <div className="font-semibold">Reliable</div>
                  <div className="text-sm text-gray-500">Quality service you can trust</div>
                </div>
              </div>
              <div className="p-4 bg-white rounded shadow-sm flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-yellow-50 flex items-center justify-center text-yellow-500">⚡</div>
                <div>
                  <div className="font-semibold">Experienced</div>
                  <div className="text-sm text-gray-500">Skilled technicians at your service</div>
                </div>
              </div>
              <div className="p-4 bg-white rounded shadow-sm flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-yellow-50 flex items-center justify-center text-yellow-500">⏱</div>
                <div>
                  <div className="font-semibold">Fast Response</div>
                  <div className="text-sm text-gray-500">Quick support when you need it</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <a className="px-5 py-3 bg-yellow-400 text-black rounded font-medium">Our Services</a>
              <a className="px-5 py-3 border rounded text-gray-700">Contact Us</a>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="bg-white shadow-lg rounded p-6">
              <h3 className="font-semibold">Request a Service</h3>
              <p className="text-sm text-gray-500">Fill out the form below and we'll get back to you.</p>

              <form onSubmit={submitRequest} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full Name" className="p-2 border rounded" />
                  <input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone Number" className="p-2 border rounded" />
                </div>
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email Address" className="p-2 border rounded w-full" />
                <select value={serviceNeeded} onChange={e=>setServiceNeeded(e.target.value)} className="p-2 border rounded w-full">
                  <option>Electrical Installation</option>
                  <option>Maintenance & Repair</option>
                  <option>System Upgrades</option>
                  <option>Emergency Services</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="p-2 border rounded" />
                  <input type="time" value={time} onChange={e=>setTime(e.target.value)} className="p-2 border rounded" />
                </div>

                <textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder="Additional Details" className="p-2 border rounded w-full h-28" />

                <div className="flex items-center justify-between">
                  <button type="submit" disabled={sending} className="px-4 py-2 bg-yellow-400 text-black rounded">{sending ? 'Sending...' : 'Submit Request'}</button>
                  <div className="text-sm text-gray-500">We respect your privacy. Your information is safe.</div>
                </div>
                {msg && <div className="text-sm text-green-600">{msg}</div>}
              </form>
            </div>
          </aside>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-8 items-center">
            <div className="text-center">
              <div className="text-2xl font-bold">100+</div>
              <div className="text-sm">Projects Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">50+</div>
              <div className="text-sm">Happy Clients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">10+</div>
              <div className="text-sm">Professional Technicians</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">5+</div>
              <div className="text-sm">Years of Experience</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services & Products */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold">Our Services</h3>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {SERVICES.map(s => (
                <div key={s.title} className="p-6 border rounded-lg bg-white">
                  <div className="font-semibold">{s.title}</div>
                  <p className="text-sm text-gray-600 mt-2">{s.desc}</p>
                  <a className="text-yellow-500 mt-3 inline-block">Learn More →</a>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Featured Products</h3>
              <a className="text-sm text-gray-600">View All</a>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              {PRODUCTS.map(p => (
                <div key={p.title} className="p-4 border rounded flex flex-col">
                  <div className="w-full h-28 bg-gray-100 rounded overflow-hidden mb-3">
                    <img src={p.img} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-sm text-gray-600">{p.price}</div>
                    </div>
                    <button className="px-3 py-2 bg-yellow-400 text-black rounded">Add</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button className="px-5 py-3 bg-yellow-400 text-black rounded">View All Products</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-yellow-400 text-black">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="font-bold">Need help?</div>
            <div className="mt-2">Our team is ready to assist you.</div>
            <div className="mt-3">Contact Us Now →</div>
          </div>

          <div>
            <div className="font-semibold">Contact</div>
            <div className="mt-2">0961 234 5678</div>
            <div>info@elettro.com</div>
            <div>Zamboanga Del Sur, Philippines</div>
          </div>

          <div>
            <div className="font-semibold">Subscribe</div>
            <div className="mt-2"><input placeholder="Your email" className="p-2 rounded w-full" /></div>
            <div className="mt-3"><button className="px-4 py-2 bg-black text-white rounded">Subscribe</button></div>
          </div>
        </div>
      </footer>
    </main>
  )
}
