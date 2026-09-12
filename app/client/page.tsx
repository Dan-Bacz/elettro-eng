"use client"
import { useEffect, useState } from "react"

const SERVICE_OPTIONS = [
  "Electrical Installation",
  "Maintenance & Repair",
  "System Upgrades",
  "Emergency Services",
]

type InventoryProduct = {
  id: string
  name: string
  sku?: string
  category?: string
  brand?: string
  model?: string
  description?: string
  quantity: number
  unit?: string
  imageUrl?: string
  imageData?: string
}

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
  const [products, setProducts] = useState<InventoryProduct[]>([])

  useEffect(() => {
    fetch('/api/inventory')
      .then((res) => (res.ok ? res.json() : []))
      .then((items: InventoryProduct[]) => setProducts(items))
      .catch(() => setProducts([]))
  }, [])

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
        <a href="/admin/login" className="text-sm text-brand-700 underline">Admin sign in</a>
      </div>

      <p className="mt-2">No login required — fill the form below to submit a booking or order. Admins can sign in from the link above.</p>

      <h3 className="mt-8 text-lg font-semibold">Products & Materials</h3>
      {products.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No products available yet. Check back soon.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="border rounded-lg p-3 flex flex-col">
              <div className="w-full h-28 bg-gray-100 rounded overflow-hidden mb-3">
                {p.imageUrl || p.imageData ? (
                  <img src={p.imageUrl || p.imageData} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">📦</div>
                )}
              </div>
              <div className="font-medium text-sm truncate">{p.name}</div>
              <div className="text-xs text-gray-500">{p.category || 'General'}</div>
              <div className="text-xs text-gray-500 mt-1">{p.quantity} {p.unit || 'pcs'} in stock</div>
            </div>
          ))}
        </div>
      )}

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
