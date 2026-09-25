"use client"

import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import CTASection from "@/components/client/CTASection"
import { CartProvider, useCart } from "@/components/client/store/CartContext"
import CartDrawer from "@/components/client/store/CartDrawer"
import CheckoutModal from "@/components/client/store/CheckoutModal"
import ProductImage from "@/components/client/store/ProductImage"
import StarRating from "@/components/client/store/StarRating"
import { CartIcon, CheckIcon, MinusIcon, PlusIcon } from "@/components/client/store/storeIcons"
import { BADGE_TONE_CLASSES, formatPeso, isDiscounted, productBadges, type StoreProduct } from "@/components/client/store/storeUtils"

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function ProductDetail() {
  const rawParams = useParams<{ id: string }>()
  const id = rawParams?.id
  const { addItem, openCheckout } = useCart()

  const [product, setProduct] = useState<StoreProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

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

  const addPayload = {
    id: product.id,
    name: product.name,
    image: imageSrc,
    model: product.model,
    unit: product.unit,
    unitPrice: Number(product.sellPrice || 0),
  }

  function flashAdded() {
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1400)
  }

  function handleAdd() {
    addItem(addPayload, qty)
    flashAdded()
  }

  function handleBuyNow() {
    if (outOfStock || !hasPrice) return
    addItem(addPayload, qty)
    openCheckout()
  }

  return (
    <>
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-yellow-600 transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-yellow-600 transition-colors">
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

              {/* Quantity + actions */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex w-fit items-center rounded-xl border border-gray-300 bg-white">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="flex h-12 w-12 items-center justify-center text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-base font-black text-gray-900">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(Number(product.quantity) || 1, q + 1))}
                    aria-label="Increase quantity"
                    className="flex h-12 w-12 items-center justify-center text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-gray-400">
                  {product.unit || "pcs"} per unit · {formatPeso(Number(product.sellPrice || 0) * qty, 2)} total
                </span>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={outOfStock || !hasPrice}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-black transition-all sm:flex-none ${
                    added
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-gray-900 ring-1 ring-gray-300 hover:ring-yellow-400 hover:text-yellow-700"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {added ? <CheckIcon className="w-4 h-4" /> : <CartIcon className="w-4 h-4" />}
                  {added ? "Added to Cart" : "Add to Cart"}
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={outOfStock || !hasPrice}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-8 py-4 text-sm font-black text-black shadow-lg shadow-yellow-400/25 transition-all hover:bg-yellow-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Buy Now
                </button>
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

      <CartDrawer />
      <CheckoutModal />

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

export default function ProductDetailPage() {
  return (
    <CartProvider>
      <ProductDetail />
    </CartProvider>
  )
}