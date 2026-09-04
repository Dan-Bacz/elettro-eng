"use client"
import { useState } from "react"

const SERVICE_OPTIONS = [
  "Electrical Installation",
  "Maintenance & Repair",
  "System Upgrades",
  "Emergency Services",
]

export default function ClientPage(){
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [preferredDate, setPreferredDate] = useState("")
  const [preferredTime, setPreferredTime] = useState("")
  const [details, setDetails] = useState("")
  const [services, setServices] = useState([{ id: Date.now(), name: SERVICE_OPTIONS[0], qty: 1 }])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  function addService(){
    setServices(s => [...s, { id: Date.now() + Math.random(), name: SERVICE_OPTIONS[0], qty: 1 }])
  }

  function removeService(id){
    setServices(s => s.filter(x => x.id !== id))
  }

  function updateService(id, patch){
    setServices(s => s.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  async function handleSubmit(e){
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const payload = {
      fullName,
      phone,
      email,
      preferredDate,
      preferredTime,
      details,
      services,
      status: "PENDING",
      createdAt: new Date().toISOString()
    }

    try{
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()
      setMessage('Request submitted — reference: ' + (data.id ?? data.id))
      // reset form
      setFullName("")
      setPhone("")
      setEmail("")
      setPreferredDate("")
      setPreferredTime("")
      setDetails("")
      setServices([{ id: Date.now(), name: SERVICE_OPTIONS[0], qty: 1 }])
    }catch(err){
      console.error(err)
      setMessage('Submission failed: ' + (err.message || String(err)))
    }finally{
      setLoading(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Book a Service or Order Products</h2>
        <a href="/admin" className="text-sm text-brand-700 underline">Admin sign in</a>
      </div>

      <p className="mt-2">No login required — fill the form below to submit a booking or order. Admins can sign in from the link above.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full name" className="p-3 border rounded" required />
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number" className="p-3 border rounded" required />
        </div>

        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" className="p-3 border rounded w-full" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="date" value={preferredDate} onChange={e=>setPreferredDate(e.target.value)} className="p-3 border rounded" />
          <input type="time" value={preferredTime} onChange={e=>setPreferredTime(e.target.value)} className="p-3 border rounded" />
        </div>

        <div className="space-y-2">
          <label className="font-medium">Services / Products</label>
          {services.map(s => (
            <div key={s.id} className="flex gap-2 items-center">
              <select value={s.name} onChange={e=>updateService(s.id, { name: e.target.value })} className="p-2 border rounded flex-1">
                {SERVICE_OPTIONS.map(opt=> <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <input type="number" min={1} value={s.qty} onChange={e=>updateService(s.id, { qty: Number(e.target.value) || 1 })} className="w-20 p-2 border rounded" />
              <button type="button" onClick={()=>removeService(s.id)} className="px-3 py-2 bg-red-500 text-white rounded">Remove</button>
            </div>
          ))}
          <button type="button" onClick={addService} className="px-3 py-2 bg-yellow-500 text-black rounded">Add service</button>
        </div>

        <textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder="Additional details" className="w-full p-3 border rounded h-24"></textarea>

        <div>
          <button type="submit" disabled={loading} className="px-6 py-3 bg-brand-700 text-white rounded">{loading ? 'Sending...' : 'Submit Request'}</button>
        </div>

        {message && <p className="mt-2 text-sm">{message}</p>}
      </form>
    </main>
  )
}
