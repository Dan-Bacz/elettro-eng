'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import EmptyState from '../../../../components/admin/EmptyState'
import { PackageIcon } from '../../../../components/admin/icons'

type Product = {
  id: string
  name: string
  sku: string | null
  category: string | null
  brand: string | null
  model: string | null
  description: string | null
  unit: string | null
  quantity: number
  sellPrice: number | null
  imageUrl: string | null
  reorderLevel: number
  createdAt: string
}

type AvailabilityFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export default function SalesProductCatalogPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('ALL')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/inventory')
        if (res.status === 401) {
          router.push('/sales/login')
          return
        }
        if (!res.ok) throw new Error('Failed to load inventory catalog')
        const data = await res.json()
        setProducts(data || [])
      } catch (err: any) {
        setError(err.message || 'Could not fetch catalog')
      } finally {
        setLoading(false)
      }
    }
    loadCatalog()
  }, [router])

  // Get distinct categories
  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))] as string[]

  // Filter products
  const filteredProducts = products.filter((p) => {
    // Category filter
    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false

    // Availability filter
    if (availabilityFilter === 'IN_STOCK' && p.quantity <= 0) return false
    if (availabilityFilter === 'LOW_STOCK' && (p.quantity <= 0 || p.quantity > p.reorderLevel)) return false
    if (availabilityFilter === 'OUT_OF_STOCK' && p.quantity > 0) return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = p.name.toLowerCase().includes(q)
      const matchSku = (p.sku || '').toLowerCase().includes(q)
      const matchBrand = (p.brand || '').toLowerCase().includes(q)
      const matchModel = (p.model || '').toLowerCase().includes(q)
      const matchDesc = (p.description || '').toLowerCase().includes(q)
      return matchName || matchSku || matchBrand || matchModel || matchDesc
    }

    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Product &amp; Material Catalog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse available warehouse inventory, real-time stock levels, and authorized pricing.
          </p>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
          Read-Only Catalog · Stock managed by Warehouse
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by product name, SKU, brand, model…"
          className="w-full lg:w-96 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium focus:border-yellow-400 focus:bg-white focus:outline-none"
        />

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-yellow-400 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Availability */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Stock:</span>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as AvailabilityFilter)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-yellow-400 focus:outline-none"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock Only</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={<PackageIcon className="h-8 w-8 text-slate-400" />}
          title="No products match your filters"
          message="Try clearing your search query or selecting a different category."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((p) => {
            const inStock = p.quantity > 0
            const isLowStock = p.quantity > 0 && p.quantity <= p.reorderLevel

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-yellow-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Image Thumbnail */}
                  <div className="relative h-44 w-full overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        fill
                        className="object-contain p-2 group-hover:scale-105 transition-transform"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="text-center text-slate-300">
                        <PackageIcon className="mx-auto h-12 w-12" />
                        <span className="text-[10px] font-bold">No Image</span>
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase shadow-sm ${
                          !inStock
                            ? 'bg-red-500 text-white'
                            : isLowStock
                            ? 'bg-amber-400 text-slate-900'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {!inStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="mt-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {p.category || 'General Material'}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-yellow-600 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400">SKU: {p.sku || 'N/A'}</p>
                    {p.brand && (
                      <p className="text-[11px] text-slate-500">
                        Brand: <span className="font-semibold text-slate-700">{p.brand}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Price & Available Quantity */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Available</span>
                    <span className={`text-sm font-black ${inStock ? 'text-slate-900' : 'text-red-500'}`}>
                      {p.quantity} <span className="text-xs font-normal text-slate-500">{p.unit || 'pcs'}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Unit Price</span>
                    <span className="text-sm font-black text-yellow-700">
                      {p.sellPrice != null ? `₱${Number(p.sellPrice).toLocaleString()}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {selectedProduct.category || 'General Material'}
                </span>
                <h2 className="text-lg font-black text-slate-900">{selectedProduct.name}</h2>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Image */}
            <div className="relative h-56 w-full rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center">
              {selectedProduct.imageUrl ? (
                <Image
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  fill
                  className="object-contain p-3"
                  sizes="500px"
                />
              ) : (
                <PackageIcon className="h-16 w-16 text-slate-300" />
              )}
            </div>

            {/* Description and Specifications */}
            <div className="space-y-2 text-xs text-slate-600">
              {selectedProduct.description && (
                <div>
                  <strong className="block text-slate-800 font-bold mb-0.5">Description:</strong>
                  <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <strong>Product SKU:</strong> {selectedProduct.sku || 'N/A'}
                </div>
                <div>
                  <strong>Unit:</strong> {selectedProduct.unit || 'pcs'}
                </div>
                <div>
                  <strong>Brand:</strong> {selectedProduct.brand || '—'}
                </div>
                <div>
                  <strong>Model:</strong> {selectedProduct.model || '—'}
                </div>
                <div>
                  <strong>Physical Stock:</strong>{' '}
                  <span className="font-bold text-slate-900">
                    {selectedProduct.quantity} {selectedProduct.unit || 'pcs'}
                  </span>
                </div>
                <div>
                  <strong>Price:</strong>{' '}
                  <span className="font-bold text-yellow-700">
                    {selectedProduct.sellPrice != null ? `₱${Number(selectedProduct.sellPrice).toLocaleString()}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
