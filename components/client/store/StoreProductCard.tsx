"use client"

import Link from "next/link"
import { useState } from "react"
import { useCart } from "./CartContext"
import ProductImage from "./ProductImage"
import StarRating from "./StarRating"
import { CartIcon, CheckIcon } from "./storeIcons"
import { BADGE_TONE_CLASSES, formatPeso, isDiscounted, productBadges, type StoreProduct } from "./storeUtils"

export default function StoreProductCard({ product }: { product: StoreProduct }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const outOfStock = Number(product.quantity || 0) <= 0
  const hasPrice = product.sellPrice != null && Number(product.sellPrice) > 0
  const badges = productBadges(product)
  const imageSrc = product.imageUrl || product.imageData

  function handleAdd() {
    addItem(
      {
        id: product.id,
        name: product.name,
        image: imageSrc,
        model: product.model,
        unit: product.unit,
        unitPrice: Number(product.sellPrice || 0),
      },
      1
    )
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/products/${product.id}`} aria-label={product.name} className="relative block">
        <div className="h-[210px] bg-white p-4">
          <ProductImage
            src={imageSrc}
            alt={product.name}
            className="h-full w-full"
            iconSize={72}
          />
        </div>

        {badges.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {badges.map((b) => (
              <span
                key={b.label}
                className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${BADGE_TONE_CLASSES[b.tone]}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-gray-100 p-4">
        {product.categoryGroup && product.categoryGroup !== "Other" ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{product.categoryGroup}</span>
        ) : null}

        <Link href={`/products/${product.id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-gray-900 hover:text-yellow-700 transition-colors">
          {product.name}
        </Link>

        {(product.model || product.sku) && (
          <p className="truncate text-xs text-gray-500">
            {[product.model, product.sku].filter(Boolean).join(" · ")}
          </p>
        )}

        <StarRating rating={product.rating} count={product.ratingCount} />

        <div className="mt-auto pt-2">
          <div className="flex items-end gap-2">
            <span className="text-lg font-black text-gray-900">
              {hasPrice ? formatPeso(product.sellPrice) : "Price on request"}
            </span>
            {isDiscounted(product) && (
              <span className="pb-0.5 text-xs font-medium text-gray-400 line-through">
                {formatPeso(product.originalPrice)}
              </span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
            {outOfStock ? (
              <span className="text-red-600">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />
                Out of stock
              </span>
            ) : (
              <span className="text-emerald-600">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                In stock · {Number(product.quantity).toLocaleString()} {product.unit || "pcs"}
              </span>
            )}
          </p>

          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock || !hasPrice}
            className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
              added
                ? "bg-emerald-500 text-white"
                : "bg-yellow-400 text-black hover:bg-yellow-300 active:scale-[0.98]"
            } disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400`}
          >
            {added ? <CheckIcon className="w-4 h-4" /> : <CartIcon className="w-4 h-4" />}
            {added ? "Added" : outOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  )
}