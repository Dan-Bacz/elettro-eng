"use client"

import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import CTASection from "@/components/client/CTASection"
import ProductImage from "@/components/client/store/ProductImage"
import StarRating from "@/components/client/store/StarRating"
import { BADGE_TONE_CLASSES, formatPeso, isDiscounted, productBadges, type StoreProduct } from "@/components/client/store/storeUtils"

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

export function ProductDetail({ portal = false }: { portal?: boolean }) {
  const rawParams = useParams<{ id: string }>()
  const id = rawParams?.id

  const [product, setProduct] = useState<StoreProduct | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch("/api/public/products")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { products?: StoreProduct[] }) => {
        const match = (data?.products || []).find((p) => p.id === id)
        setProduct(match ? { ...match, categoryGroup: match.categoryGroup || "Other" } : null)
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [id])

  const imageSrc = product && (product.imageUrl || product.imageData)
  const productsPath = portal ? "/client/products" : "/products"
  const outOfStock = product ? Number(product.quantity || 0) <= 0 : true
  const hasPrice = product != null && product.sellPrice != null && Number(product.sellPrice) > 0
  const badges = useMemo(() => (product ? productBadges(product) : []), [product])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading product…</p>
        </div>
      </div>
    )
  }

  if (!product) {
    notFound()
    return null
  }

  return (
    <>
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href={portal ? "/client/dashboard" : "/"} className="hover:text-yellow-600 transition-colors">
              {portal ? "Client Portal" : "Home"}
            </Link>
            <span className="mx-2">/</span>
            <Link href={productsPath} className="hover:text-yellow-600 transition-colors">
              Products
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-gray-900">{product.name}</span>
          </nav>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Image */}
            <div className="relative">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="relative">
                  {badges.length > 0 && (
                    <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
                      {badges.map((b) => (
                        <span
                          key={b.label}
                          className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${BADGE_TONE_CLASSES[b.tone]}`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="aspect-square">
                    <ProductImage src={imageSrc} alt={product.name} className="h-full w-full" iconSize={110} />
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div>
              {product.category && (
                <span className="inline-block rounded-full bg-yellow-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-yellow-700">
                  {product.categoryGroup}
                </span>
              )}

              <h1 className="mt-3 text-3xl font-black leading-tight text-gray-900 sm:text-4xl">{product.name}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <StarRating rating={product.rating} count={product.ratingCount} starClass="w-4 h-4" />
                {product.brand && (
                  <span className="text-sm text-gray-500">
                    Brand: <strong className="text-gray-900">{product.brand}</strong>
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                {product.model && (
                  <span>
                    Model: <strong className="font-semibold text-gray-900">{product.model}</strong>
                  </span>
                )}
                {product.sku && (
                  <span>
                    Product #: <span className="font-semibold text-gray-900">{product.sku}</span>
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mt-5 flex flex-wrap items-end gap-3">
                <span className="text-3xl font-black text-gray-900">
                  {hasPrice ? formatPeso(product.sellPrice) : "Price on request"}
                </span>
                {isDiscounted(product) && (
                  <span className="pb-1 text-base font-medium text-gray-400 line-through">{formatPeso(product.originalPrice)}</span>
                )}
              </div>

              {/* Availability */}
              <div className="mt-4 inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
                <span className={`h-3 w-3 rounded-full ${outOfStock ? "bg-red-500" : "bg-emerald-500"}`} />
                <span className={`text-sm font-bold ${outOfStock ? "text-red-600" : "text-emerald-700"}`}>
                  {outOfStock
                    ? "Currently Unavailable"
                    : Number(product.quantity) <= 5
                    ? `Low stock — ${Number(product.quantity).toLocaleString()} ${product.unit || "pcs"} left`
                    : `In Stock — ${Number(product.quantity).toLocaleString()} ${product.unit || "pcs"} available`}
                </span>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h2 className="text-lg font-bold text-gray-900">Description</h2>
                <p className="mt-2 leading-relaxed text-gray-600">
                  {product.description ||
                    "High-quality electrical material supplied by Elettro Engineering Enterprises. Contact us for specifications, pricing, and availability."}
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-cyan-200/80 bg-gradient-to-r from-cyan-50 via-white to-yellow-50 p-4 shadow-sm">
                <p className="text-sm font-black text-slate-900">Product information only</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{portal ? "You are viewing this product inside your authenticated client portal." : "Shopping and checkout are available from the authenticated client portal."}</p>
              </div>

              {/* Specs */}
              <div className="mt-8 rounded-xl border border-gray-200 bg-white px-5">
                <div className="divide-y divide-gray-100">
                  {(
                    [
                      ["Category", product.category || product.categoryGroup || "—"],
                      ["Brand", product.brand || "—"],
                      ["Model", product.model || "—"],
                      ["Product Number / SKU", product.sku || "—"],
                      ["Stock", `${Number(product.quantity).toLocaleString()} ${product.unit || "pcs"}`],
                    ] as const
                  ).map(([label, value]) => (
                    <SpecRow key={label} label={label} value={value} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        heading="Ready to Order?"
        subheading="Request a product or schedule a service today — it only takes a minute."
        primaryLabel="Book a Service"
        primaryHref={portal ? "/client/services" : "/book-service"}
        secondaryLabel={portal ? "Back to Products" : "Contact Us"}
        secondaryHref={portal ? productsPath : "/contact"}
      />
    </>
  )
}

export default function ProductDetailPage() {
  return <ProductDetail />
}
