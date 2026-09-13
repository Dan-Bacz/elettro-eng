"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, notFound } from "next/navigation"
import type { InventoryProduct } from "@/components/client/ProductCard"
import CTASection from "@/components/client/CTASection"

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">{value}</span>
    </div>
  )
}

export default function ProductDetailPage() {
  const rawParams = useParams<{ id: string }>()
  const id = rawParams?.id
  const [product, setProduct] = useState<InventoryProduct | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch("/api/inventory")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: InventoryProduct[]) => {
        setProduct(items.find((p) => p.id === id) || null)
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    notFound()
    return null
  }

  const imageSrc = product.imageUrl || product.imageData
  const outOfStock = product.quantity <= 0

  return (
    <>
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-yellow-600 transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-yellow-600 transition-colors">Products</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Image */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
              <div className="w-full aspect-square">
                {imageSrc ? (
                  <img src={imageSrc} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                    <span className="text-8xl opacity-30">⚡</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div>
              {product.category && (
                <span className="inline-block px-3 py-1 bg-yellow-400/10 text-yellow-700 text-xs font-bold uppercase tracking-wider rounded-full">
                  {product.category}
                </span>
              )}
              <h1 className="mt-3 text-3xl sm:text-4xl font-black text-gray-900">{product.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                {product.brand && <span>Brand: <strong className="text-gray-900">{product.brand}</strong></span>}
                {product.model && <span>Model: <strong className="text-gray-900">{product.model}</strong></span>}
                {product.sku && <span>Product #: <strong className="text-gray-900">{product.sku}</strong></span>}
              </div>

              {/* Availability */}
              <div className="mt-5 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50">
                <span className={`w-3 h-3 rounded-full ${outOfStock ? "bg-red-500" : "bg-green-500"}`} />
                <span className={`text-sm font-bold ${outOfStock ? "text-red-600" : "text-green-700"}`}>
                  {outOfStock
                    ? "Currently Unavailable"
                    : product.quantity <= 5
                    ? `Low stock — ${product.quantity} ${product.unit || "pcs"} left`
                    : `In Stock — ${product.quantity} ${product.unit || "pcs"} available`}
                </span>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h2 className="text-lg font-bold text-gray-900">Description</h2>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  {product.description || "High-quality electrical material supplied by Elettro Engineering Enterprises. Contact us for specifications, pricing, and availability."}
                </p>
              </div>

              {/* Specifications */}
              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Specifications</h2>
                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 px-4">
                  <SpecRow label="Category" value={product.category || "—"} />
                  <SpecRow label="Brand" value={product.brand || "—"} />
                  <SpecRow label="Model" value={product.model || "—"} />
                  <SpecRow label="Product Number / SKU" value={product.sku || "—"} />
                  <SpecRow label="Stock" value={`${product.quantity} ${product.unit || "pcs"}`} />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/book-service?product=${encodeURIComponent(product.name)}`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/25"
                >
                  Order / Request Product
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-bold hover:border-gray-900 hover:text-gray-900 transition-colors"
                >
                  Ask About This Product
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        heading="Ready to Order?"
        subheading="Request a product or schedule a service today — it only takes a minute."
        primaryLabel="Book a Service"
        primaryHref="/book-service"
        secondaryLabel="Contact Us"
        secondaryHref="/contact"
      />
    </>
  )
}