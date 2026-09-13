"use client"
import { useEffect, useState } from "react"
import ProductCard, { type InventoryProduct } from "./ProductCard"

export default function FeaturedProducts({ limit = 3 }: { limit?: number }) {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: InventoryProduct[]) => setProducts(items))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-gray-50 animate-pulse h-80" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <div className="text-5xl mb-3 opacity-40">📦</div>
        <p className="text-gray-500">No products available yet. Check back soon.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.slice(0, limit).map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}