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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <header className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Book a Service
              </h1>
              <p className="mt-2 text-brand-100 text-sm sm:text-base max-w-lg">
                Fill out the form below to schedule electrical services or order materials. No login required.
              </p>
            </div>
            <a
              href="/admin/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Admin sign in
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10">

        {/* Success / Error message */}
        {message && (
          <div className={`rounded-xl p-4 text-sm font-medium ${
            message.startsWith('Request submitted')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Products Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-brand-100 rounded-lg">
              <svg className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Products & Materials</h2>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-sm text-gray-500">No products available yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {products.map(p => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  <div className="w-full aspect-[4/3] bg-gray-100">
                    {p.imageUrl || p.imageData ? (
                      <img
                        src={p.imageUrl || p.imageData}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                        📦
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-medium text-sm text-gray-900 truncate">{p.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{p.category || 'General'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                        {p.quantity} {p.unit || 'pcs'}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">in stock</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Booking Form */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-brand-100 rounded-lg">
                <svg className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Service Request</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">

            {/* Contact Info */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Contact Information
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+61 400 000 000"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Preferred Schedule
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={e => setPreferredDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={preferredTime}
                    onChange={e => setPreferredTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Services / Products
              </label>
              <div className="space-y-2.5">
                {services.map((s, idx) => (
                  <div key={s.id} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <span className="hidden sm:inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-semibold text-gray-500 shrink-0">
                        {idx + 1}
                      </span>
                      <select
                        value={s.name}
                        onChange={e => updateService(s.id, { name: e.target.value })}
                        className="flex-1 min-w-0 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                      >
                        {SERVICE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={s.qty}
                        onChange={e => updateService(s.id, { qty: Number(e.target.value) || 1 })}
                        className="w-20 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeService(s.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="sm:hidden">Remove</span>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addService}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add service
              </button>
            </div>

            {/* Details */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Additional Details
              </label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Describe your needs, special instructions, or any other relevant information..."
                rows={4}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none sm:resize-y"
              />
            </div>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-400 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm shadow-brand-600/20"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Submit Request
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 sm:ml-2">
                You will receive a confirmation once your request is reviewed.
              </p>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
