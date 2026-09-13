"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type InventoryItem = {
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
  createdAt?: string
}

type ItemForm = {
  id?: string
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

const emptyForm: ItemForm = {
  name: "",
  sku: "",
  category: "",
  brand: "",
  model: "",
  description: "",
  quantity: 1,
  unit: "pcs",
  imageUrl: "",
  imageData: "",
}

const inputClass =
  "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"

export default function InventoryPage(){
  const router = useRouter()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("ALL")
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ItemForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function loadItems(){
    try {
      const res = await fetch('/api/inventory')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.replace('/admin/login')
          return
        }
        setAuthed(true)
      })
      .catch(() => router.replace('/admin/login'))
    loadItems()
  }, [router])

  function showToast(type: "success" | "error", text: string){
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 4000)
  }

  function openAdd(){
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(item: InventoryItem){
    setForm({
      id: item.id,
      name: item.name,
      sku: item.sku || "",
      category: item.category || "",
      brand: item.brand || "",
      model: item.model || "",
      description: item.description || "",
      quantity: item.quantity,
      unit: item.unit || "pcs",
      imageUrl: item.imageUrl || "",
      imageData: item.imageData || "",
    })
    setModalOpen(true)
  }

  function updateField(field: keyof ItemForm, value: string | number){
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || "")
      setForm((prev) => ({ ...prev, imageData: dataUrl, imageUrl: dataUrl }))
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  async function handleSave(e?: React.FormEvent){
    e?.preventDefault()
    if (!form.name.trim()){
      showToast("error", "Please enter an item name")
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, quantity: Number(form.quantity) || 0 }
      const res = await fetch('/api/inventory', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      showToast("success", form.id ? "Item updated successfully" : "Item added to inventory")
      setModalOpen(false)
      await loadItems()
    } catch (err) {
      console.error(err)
      showToast("error", "Failed to save item: " + (err.message || String(err)))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: InventoryItem){
    if (!window.confirm(`Delete "${item.name}" from inventory?`)) return
    setBusyId(item.id)
    try {
      const res = await fetch('/api/inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      if (!res.ok) throw new Error(await res.text())
      showToast("success", "Item deleted")
      await loadItems()
    } catch (err) {
      console.error(err)
      showToast("error", "Failed to delete item")
    } finally {
      setBusyId(null)
    }
  }

  async function adjustStock(item: InventoryItem, delta: number){
    setBusyId(item.id)
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, quantity: Math.max(0, item.quantity + delta) }),
      })
      if (!res.ok) throw new Error(await res.text())
      await loadItems()
    } catch (err) {
      console.error(err)
      showToast("error", "Failed to update stock")
    } finally {
      setBusyId(null)
    }
  }

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean))
    return Array.from(set).sort()
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchCat = category === "ALL" || i.category === category
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        (i.brand || "").toLowerCase().includes(q) ||
        (i.sku || "").toLowerCase().includes(q) ||
        (i.category || "").toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [items, search, category])

  const stats = useMemo(() => {
    const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0)
    const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= 5).length
    const outOfStock = items.filter((i) => i.quantity === 0).length
    return { totalItems: items.length, totalUnits, lowStock, outOfStock }
  }, [items])

  if (loading || !authed){
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <header className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Inventory Management
              </h1>
              <p className="mt-2 text-brand-100 text-sm sm:text-base max-w-lg">
                Track stock levels, equipment, and materials. Add, edit, and manage your inventory in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-brand-700 hover:bg-brand-50 rounded-lg text-sm font-semibold transition-colors shadow-sm shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Item
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Toast */}
        {toast && (
          <div className={`rounded-xl p-4 text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {toast.text}
          </div>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Total Items", value: stats.totalItems, icon: "⌗", accent: "text-brand-700 bg-brand-50 border-brand-200" },
            { label: "Units in Stock", value: stats.totalUnits, icon: "▤", accent: "text-blue-700 bg-blue-50 border-blue-200" },
            { label: "Low Stock", value: stats.lowStock, icon: "⚠", accent: "text-amber-700 bg-amber-50 border-amber-200" },
            { label: "Out of Stock", value: stats.outOfStock, icon: "✕", accent: "text-red-700 bg-red-50 border-red-200" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center text-lg sm:text-xl font-bold shrink-0 ${card.accent}`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{card.value}</div>
                <div className="text-[11px] sm:text-xs text-gray-500 mt-1 truncate">{card.label}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Toolbar */}
        <section className="flex flex-col sm:flex-row gap-3 sm:gap-4 bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, brand, SKU, or category..."
              className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-52 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          >
            <option value="ALL">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </section>

        {/* Inventory Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-brand-100 rounded-lg">
                <svg className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Stock Catalog
                <span className="text-gray-400 font-normal text-sm sm:text-base ml-2">({filtered.length})</span>
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 sm:p-14 text-center">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-sm text-gray-500">No inventory items yet.</p>
              <button
                type="button"
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add your first item
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 sm:p-14 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm text-gray-500">No items match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map((item) => {
                const isBusy = busyId === item.id
                return (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col">
                    <div className="relative w-full aspect-[4/3] bg-gray-100">
                      {item.imageUrl || item.imageData ? (
                        <img src={item.imageUrl || item.imageData} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">📦</div>
                      )}
                      {item.quantity === 0 && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                          Out of stock
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm sm:text-base text-gray-900 truncate">{item.name}</h3>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1 text-gray-400 hover:text-brand-700 hover:bg-brand-50 rounded shrink-0 transition-colors"
                          title="Edit item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[item.brand, item.model, item.category].filter(Boolean).join(" · ") || "General"}
                      </p>
                      {item.sku && (
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">SKU: {item.sku}</p>
                      )}
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{item.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                          item.quantity === 0
                            ? "bg-red-50 text-red-700"
                            : item.quantity <= 5
                            ? "bg-amber-50 text-amber-700"
                            : "bg-green-50 text-green-700"
                        }`}>
                          {item.quantity} {item.unit || "pcs"}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustStock(item, -1)}
                            disabled={isBusy || item.quantity === 0}
                            className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Decrease stock"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustStock(item, 1)}
                            disabled={isBusy}
                            className="w-7 h-7 flex items-center justify-center rounded bg-green-50 hover:bg-green-100 text-green-700 font-bold disabled:opacity-40 transition-colors"
                            title="Increase stock"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={isBusy}
                            className="w-7 h-7 flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-40 transition-colors"
                            title="Delete item"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setModalOpen(false)}>
          <div
            className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-100 rounded-lg">
                  <svg className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  {form.id ? "Edit Item" : "Add Inventory Item"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !saving && setModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
              {/* Image */}
              <div>
                <div className={`w-full aspect-[16/9] rounded-xl border-2 border-dashed ${form.imageUrl || form.imageData ? "border-gray-200" : "border-gray-300"} bg-gray-50 overflow-hidden relative`}>
                  {form.imageUrl || form.imageData ? (
                    <img src={form.imageUrl || form.imageData} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">No image</span>
                    </div>
                  )}
                  {form.imageUrl || form.imageData ? (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, imageUrl: "", imageData: "" }))
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs transition-colors"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Image
                  </button>
                  <input
                    type="url"
                    value={form.imageUrl && !form.imageData ? form.imageUrl : ""}
                    onChange={(e) => updateField("imageUrl", e.target.value)}
                    placeholder="...or paste image URL"
                    className={inputClass}
                  />
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item name *</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. 20A Circuit Breaker"
                  className={inputClass}
                  required
                />
              </div>

              {/* SKU + Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Code</label>
                  <input
                    value={form.sku}
                    onChange={(e) => updateField("sku", e.target.value)}
                    placeholder="SKU-001"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    placeholder="Breakers / Wiring / Lighting"
                    className={inputClass}
                    list="category-options"
                  />
                  <datalist id="category-options">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* Brand + Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    value={form.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    placeholder="Schneider, Philips, Panasonic"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                    placeholder="e.g. A9N18323"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={(e) => updateField("quantity", Number(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    value={form.unit}
                    onChange={(e) => updateField("unit", e.target.value)}
                    placeholder="pcs, meters, rolls"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Optional notes about this item..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-400 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm shadow-brand-600/20"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    form.id ? "Save Changes" : "Add Item"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}