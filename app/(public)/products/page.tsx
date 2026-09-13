"use client"
import { useEffect, useState, useMemo } from "react"
import ProductCard, { type InventoryProduct } from "@/components/client/ProductCard"
import CTASection from "@/components/client/CTASection"
import { PRODUCT_CATEGORIES } from "@/components/client/siteData"

export default function ProductsPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("All")

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: InventoryProduct[]) => setProducts(items))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (activeCategory === "All") return products
    return products.filter((p) => p.category === activeCategory)
  }, [products, activeCategory])

  return (
    <>
      {/* Header hero */}
      <section className="relative bg-[#0b0f10] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,196,0,0.12),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold uppercase tracking-widest">
            Materials & Equipment
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight">
            Our <span className="text-yellow-400">Products</span>
          </h1>
          <p className="mt-4 text-gray-400 max-w-xl text-lg">
            High-Quality Electrical Materials & Equipment from trusted brands — available for
            projects of every size.
          </p>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      </section>

      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Category filter */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  activeCategory === cat
                    ? "bg-yellow-400 text-black shadow-md shadow-yellow-400/20"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-yellow-400 hover:text-yellow-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Count */}
          <p className="text-sm text-gray-500 mb-6">
            {loading ? "Loading products..." : `${filtered.length} product${filtered.length === 1 ? "" : "s"} in "${activeCategory}"`}
          </p>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white animate-pulse h-96" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center">
              <div className="text-5xl mb-3 opacity-40">📦</div>
              <p className="text-gray-500 font-medium">No products in this category yet.</p>
              <p className="text-sm text-gray-400 mt-1">Check back soon or contact us to inquire.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Note */}
          <div className="mt-12 rounded-2xl bg-white border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900">Need a product not listed here?</h3>
              <p className="text-sm text-gray-600 mt-1">
                We can source electrical materials and equipment for your specific project.
              </p>
            </div>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors shrink-0"
            >
              Contact Us
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <CTASection
        heading="Order or Request a Product"
        subheading="Ready to get started on your project? Request a product or book a service today."
        primaryLabel="Book a Service"
        primaryHref="/book-service"
        secondaryLabel="Contact Us"
        secondaryHref="/contact"
      />
    </>
  )
}