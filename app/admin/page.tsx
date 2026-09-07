"use client"
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type DashboardData = {
  stats: {
    totalBookings: number
    pending: number
    approved: number
    assigned: number
    inProgress: number
    completed: number
    totalInventory: number
    lowStock: number
    technicians: number
    clients: number
    admins: number
  }
  statusBreakdown: { status: string; value: number }[]
  recentBookings: { id: string; title: string; status: string; clientName: string; createdAt: string }[]
  inventoryAlerts: { id: string; name: string; quantity: number; sku: string | null }[]
  bookings: any[]
  inventory: any[]
  technicians: any[]
  clients: any[]
  admins: any[]
}

type InventoryForm = {
  name: string
  sku: string
  category: string
  brand: string
  model: string
  description: string
  quantity: number
  unit: string
  imageUrl: string
  imageData: string
}

type AiRecommendation = {
  id: string
  title: string
  category: string
  brand: string
  model: string
  description: string
  image: string
  quantity: number
  unit: string
}

const navItems = [
  { key: 'dashboard', label: 'Dashboard', emoji: '▣' },
  { key: 'bookings', label: 'Bookings', emoji: '🧾' },
  { key: 'inventory', label: 'Inventory', emoji: '📦' },
  { key: 'projects', label: 'Projects', emoji: '🛠️' },
  { key: 'technicians', label: 'Technicians', emoji: '👷' },
  { key: 'clients', label: 'Clients', emoji: '👥' },
  { key: 'reports', label: 'Reports', emoji: '📊' },
  { key: 'notifications', label: 'Notifications', emoji: '🔔' },
  { key: 'settings', label: 'Settings', emoji: '⚙️' }
]

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  brand: '',
  model: '',
  description: '',
  quantity: 1,
  unit: 'pcs',
  imageUrl: '',
  imageData: ''
} satisfies InventoryForm

async function fetchAiRecommendations(query: string, imageData?: string): Promise<AiRecommendation[]> {
  try {
    const res = await fetch('/api/ai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query || '', imageData: imageData || undefined })
    })

    if (!res.ok) {
      return []
    }

    const json = await res.json()
    // ensure the shape matches AiRecommendation[]
    if (Array.isArray(json)) return json as AiRecommendation[]
    return []
  } catch (e) {
    console.error('AI recommendation fetch failed', e)
    return []
  }
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [data, setData] = useState<DashboardData | null>(null)
  const [inventory, setInventory] = useState<any[]>([])
  const [inventoryForm, setInventoryForm] = useState<InventoryForm>(emptyForm)
  const [aiSuggestions, setAiSuggestions] = useState<AiRecommendation[]>([])
  const [selectedAiId, setSelectedAiId] = useState('')
  const [savingItem, setSavingItem] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          router.push('/admin/login')
          return
        }

        const dashboardRes = await fetch('/api/dashboard')
        if (dashboardRes.ok) {
          const payload = await dashboardRes.json()
          setData(payload)
          setInventory(payload.inventory || [])
        }

        const inventoryRes = await fetch('/api/inventory')
        if (inventoryRes.ok) {
          const list = await inventoryRes.json()
          setInventory(list)
        }
      } catch (e) {
        router.push('/admin/login')
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [router])

  async function refreshInventory() {
    const res = await fetch('/api/inventory')
    if (res.ok) {
      const list = await res.json()
      setInventory(list)
      const dashboardRes = await fetch('/api/dashboard')
      if (dashboardRes.ok) {
        const payload = await dashboardRes.json()
        setData(payload)
      }
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      router.push('/')
    } finally {
      setLoggingOut(false)
    }
  }

  const chartSegments = useMemo(() => {
    if (!data) return []
    const colors = ['#fbbf24', '#f59e0b', '#f97316', '#fb7185', '#a78bfa', '#34d399']
    const total = data.statusBreakdown.reduce((sum, item) => sum + item.value, 0) || 1
    let running = 0

    return data.statusBreakdown.map((item, index) => {
      const start = running
      running += (item.value / total) * 100
      return {
        ...item,
        color: colors[index % colors.length],
        start,
        end: running
      }
    })
  }, [data])

  function updateField(field: keyof InventoryForm, value: string | number) {
    setInventoryForm((prev) => ({ ...prev, [field]: value }))
  }

  function applyAiSuggestion(suggestion: AiRecommendation) {
    setSelectedAiId(suggestion.id)
    setInventoryForm((prev) => ({
      ...prev,
      name: suggestion.title,
      category: suggestion.category,
      brand: suggestion.brand,
      model: suggestion.model,
      description: suggestion.description,
      quantity: suggestion.quantity,
      unit: suggestion.unit,
      imageUrl: suggestion.image,
      imageData: suggestion.image
    }))
    setAiSuggestions((prev) => prev.length ? prev : [suggestion])
  }

  function handleAiQueryChange(value: string) {
    setInventoryForm((prev) => ({ ...prev, name: value }))
    if (!value.trim()) {
      setAiSuggestions([])
      return
    }
    // call server-side AI recommendation endpoint (falls back to local catalog when no API key)
    fetchAiRecommendations(value).then((items) => {
      setAiSuggestions(items || [])
    }).catch(() => setAiSuggestions([]))
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setInventoryForm((prev) => ({ ...prev, imageData: result, imageUrl: result }))
      // analyze uploaded image using AI recommendations
      fetchAiRecommendations('', result).then((items) => {
        setAiSuggestions(items || [])
      }).catch(() => {})
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveItem() {
    if (!inventoryForm.name.trim()) {
      alert('Please enter item name')
      return
    }

    setSavingItem(true)

    try {
      const payload = { ...inventoryForm, imageUrl: inventoryForm.imageUrl || inventoryForm.imageData }
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to save item')
      }

      setInventoryForm(emptyForm)
      setAiSuggestions([])
      setSelectedAiId('')
      await refreshInventory()
    } catch (error) {
      alert('Unable to save inventory item. Please try again.')
    } finally {
      setSavingItem(false)
    }
  }

  async function handleDeleteItem(id: string) {
    const confirmed = window.confirm('Delete this inventory item?')
    if (!confirmed) return

    try {
      await fetch('/api/inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      await refreshInventory()
    } catch (error) {
      alert('Unable to delete inventory item.')
    }
  }

  if (loading) return <div className="p-8 text-lg font-medium">Checking authentication...</div>

  const stats = data?.stats

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex">
        <aside className={`${sidebarOpen ? 'w-72' : 'w-24'} bg-yellow-400 text-black h-screen sticky top-0 flex flex-col transition-all duration-200 overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-black/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-black text-yellow-400 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shrink-0">⚡</div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <div className="font-black text-lg leading-tight">ELETTRO</div>
                  <div className="text-[10px] uppercase tracking-wide">Engineering Enterprises</div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="ml-2 bg-black/10 hover:bg-black/20 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shrink-0"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? '‹' : '›'}
            </button>
          </div>

          <nav className="mt-4 px-3 space-y-2 overflow-y-auto flex-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition ${activeSection === item.key ? 'bg-black text-yellow-400 shadow-md' : 'hover:bg-yellow-300'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center shrink-0">{item.emoji}</div>
                {sidebarOpen && <div className="font-medium text-left">{item.label}</div>}
              </button>
            ))}
          </nav>

          <div className="mt-auto p-3 border-t border-black/10">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={`w-full flex items-center justify-center gap-2 rounded-xl bg-black text-white py-3 font-semibold hover:bg-gray-900 disabled:opacity-60 ${!sidebarOpen ? 'px-2' : ''}`}
            >
              <span>{sidebarOpen ? (loggingOut ? 'Logging out...' : 'Logout') : '⎋'}</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-auto">
          <header className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Operations Overview</p>
              <h1 className="text-3xl font-black text-gray-900">{activeSection === 'dashboard' ? 'Dashboard' : activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button className="p-3 bg-white rounded-full shadow-sm">🔔</button>
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">{data?.recentBookings?.length || 0}</span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm hover:bg-gray-100"
                >
                  <div className="w-10 h-10 rounded-full bg-black text-yellow-400 flex items-center justify-center font-bold">A</div>
                  <div className="text-left">
                    <div className="font-semibold">Admin</div>
                    <div className="text-xs text-gray-500">Administrator</div>
                  </div>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      {loggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {activeSection !== 'inventory' && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Bookings', value: stats?.totalBookings ?? 0, delta: 'Live data' },
                  { label: 'Pending', value: stats?.pending ?? 0, delta: 'Awaiting review' },
                  { label: 'Inventory Total', value: stats?.totalInventory ?? 0, delta: 'Units' },
                  { label: 'Low Stock', value: stats?.lowStock ?? 0, delta: 'Needs restock' }
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl p-5 shadow-md border border-slate-200">
                    <div className="text-sm text-slate-500">{card.label}</div>
                    <div className="text-3xl font-black mt-2">{card.value}</div>
                    <div className="text-xs mt-2 text-emerald-600">{card.delta}</div>
                  </div>
                ))}
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
                <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-md border border-slate-200">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-800">Bookings status overview</h3>
                    <span className="text-xs text-slate-500">Updated live</span>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative w-52 h-52">
                      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                        <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="16" />
                        {chartSegments.map((segment) => (
                          <circle
                            key={segment.status}
                            cx="60"
                            cy="60"
                            r="42"
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="16"
                            strokeDasharray={`${(segment.end - segment.start) * 2.64} ${100 - (segment.end - segment.start) * 2.64}`}
                            strokeLinecap="round"
                            strokeDashoffset={-segment.start * 2.64}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-3xl font-black text-slate-900">{stats?.totalBookings ?? 0}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide">Bookings</div>
                      </div>
                    </div>

                    <div className="w-full space-y-3">
                      {chartSegments.map((segment) => (
                        <div key={segment.status} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                            <span className="text-sm text-slate-700 uppercase tracking-wide">{segment.status}</span>
                          </div>
                          <div className="font-semibold text-slate-800">{segment.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Recent bookings</h3>
                    <span className="text-xs text-slate-500">Last 5</span>
                  </div>

                  <ul className="space-y-3">
                    {(data?.recentBookings ?? []).map((booking) => (
                      <li key={booking.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <div>
                          <div className="font-medium text-slate-800">{booking.title}</div>
                          <div className="text-xs text-slate-500">{booking.clientName}</div>
                        </div>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold uppercase tracking-wide">{booking.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 xl:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Inventory overview</h3>
                    <span className="text-xs text-slate-500">{stats?.totalInventory ?? 0} total units</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-slate-500">
                        <tr>
                          <th className="pb-3">Item</th>
                          <th className="pb-3">SKU</th>
                          <th className="pb-3">Qty</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.inventory ?? []).slice(0, 5).map((item) => {
                          const isLow = Number(item.quantity || 0) <= 10
                          return (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="py-3 font-medium text-slate-700">{item.name}</td>
                              <td className="py-3 text-slate-500">{item.sku || 'N/A'}</td>
                              <td className="py-3 font-semibold text-slate-800">{item.quantity}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {isLow ? 'Low stock' : 'Healthy'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Stock alerts</h3>
                    <span className="text-xs text-amber-600">{stats?.lowStock ?? 0} items</span>
                  </div>

                  <div className="space-y-4">
                    {(data?.inventoryAlerts ?? []).length === 0 ? (
                      <div className="text-sm text-slate-500">No low stock alerts right now.</div>
                    ) : (
                      (data?.inventoryAlerts ?? []).map((item) => (
                        <div key={item.id} className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-500">SKU: {item.sku || 'N/A'}</div>
                          <div className="mt-2 text-xs text-amber-700 font-semibold">Qty left: {item.quantity}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {activeSection === 'inventory' && (
            <section className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-slate-800">Add inventory item</h3>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">AI assisted</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Item name</label>
                      <input
                        value={inventoryForm.name}
                        onChange={(e) => handleAiQueryChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        placeholder="e.g. bulb, wire, breaker, socket..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                      <input
                        value={inventoryForm.category}
                        onChange={(e) => updateField('category', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        placeholder="Lighting"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                      <input
                        value={inventoryForm.brand}
                        onChange={(e) => updateField('brand', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        placeholder="Philips"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                      <input
                        value={inventoryForm.model}
                        onChange={(e) => updateField('model', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        placeholder="LED-12W-220V"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                      <input
                        value={inventoryForm.sku}
                        onChange={(e) => updateField('sku', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        placeholder="INV-001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="0"
                        value={inventoryForm.quantity}
                        onChange={(e) => updateField('quantity', Number(e.target.value) || 0)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                      <input
                        value={inventoryForm.unit}
                        onChange={(e) => updateField('unit', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        placeholder="pcs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <textarea
                        value={inventoryForm.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        placeholder="Add a short description of the material or equipment..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Image URL or upload</label>
                      <div className="flex gap-3 flex-col sm:flex-row">
                        <input
                          value={inventoryForm.imageUrl}
                          onChange={(e) => updateField('imageUrl', e.target.value)}
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5"
                          placeholder="https://example.com/image.jpg"
                        />
                        <label className="inline-flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                          Upload image
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryForm(emptyForm)
                        setAiSuggestions([])
                        setSelectedAiId('')
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveItem}
                      disabled={savingItem}
                      className="px-5 py-2.5 rounded-xl bg-black text-white font-semibold disabled:opacity-60"
                    >
                      {savingItem ? 'Saving...' : 'Save item'}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-800">AI recommendations</h3>
                    <span className="text-xs text-slate-500">Smart suggestions</span>
                  </div>

                  {!aiSuggestions.length ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Type an item such as “bulb”, “wire”, “breaker”, “socket”, or “motor” to get an AI recommendation.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aiSuggestions.map((item) => (
                        <div key={item.id} className={`rounded-2xl border ${selectedAiId === item.id ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200'} overflow-hidden`}>
                          <img src={item.image} alt={item.title} className="h-32 w-full object-cover" />
                          <div className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="font-bold text-slate-800">{item.title}</div>
                                <div className="text-xs text-slate-500">{item.category} • {item.brand}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => applyAiSuggestion(item)}
                                className="text-xs bg-black text-white px-2 py-1.5 rounded-lg"
                              >
                                Use
                              </button>
                            </div>
                            <div className="mt-2 text-xs text-slate-600">Model: {item.model}</div>
                            <div className="mt-1 text-xs text-slate-600">{item.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-slate-800">Available stock</h3>
                  <span className="text-xs text-slate-500">{inventory.length} items</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-500">
                      <tr>
                        <th className="pb-3">Image</th>
                        <th className="pb-3">Item</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3">Brand</th>
                        <th className="pb-3">Model</th>
                        <th className="pb-3">Qty</th>
                        <th className="pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100 align-top">
                          <td className="py-3">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-lg">📦</div>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="font-semibold text-slate-800">{item.name}</div>
                            <div className="text-xs text-slate-500">{item.description || 'No description'}</div>
                          </td>
                          <td className="py-3 text-slate-600">{item.category || 'General'}</td>
                          <td className="py-3 text-slate-600">{item.brand || 'N/A'}</td>
                          <td className="py-3 text-slate-600">{item.model || 'N/A'}</td>
                          <td className="py-3 font-bold text-slate-800">{item.quantity} {item.unit || 'pcs'}</td>
                          <td className="py-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
