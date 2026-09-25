"use client"
import Link from "next/link"
import { useState } from "react"
import OrderForm from "./OrderForm"

export type InventoryProduct = {
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
  imagePublicId?: string
  imageData?: string
}

export default function ProductCard({ product }: { product: InventoryProduct }) {
  const imageSrc = product.imageUrl || product.imageData
  const outOfStock = product.quantity <= 0
  const [orderOpen, setOrderOpen] = useState(false)

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
        {imageSrc ? (
          <img src={imageSrc} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <span className="text-5xl opacity-40">⚡</span>
          </div>
        )}
        {outOfStock && (
          <span className="absolute top-3 right-3 px-2.5 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
            Out of Stock
          </span>
        )}
        {!outOfStock && product.quantity <= 5 && (
          <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-400 text-black text-[10px] font-bold uppercase tracking-wider rounded-full">
            Low Stock
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        {product.category && (
          <span className="inline-block px-2.5 py-1 bg-yellow-50 text-yellow-700 text-[10px] font-bold uppercase tracking-wider rounded-full self-start">
            {product.category}
          </span>
        )}
        <h3 className="mt-2.5 text-base font-bold text-gray-900 line-clamp-1">{product.name}</h3>
        {(product.model || product.brand) && (
          <p className="text-xs text-gray-500 mt-0.5">
            {[product.brand, product.model].filter(Boolean).join(" · ")}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-100">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${outOfStock ? "text-red-600" : "text-green-700"}`}>
            <span className={`w-2 h-2 rounded-full ${outOfStock ? "bg-red-500" : "bg-green-500"}`} />
            {outOfStock ? "Unavailable" : `${product.quantity} ${product.unit || "pcs"} in stock`}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-bold hover:border-gray-900 hover:text-gray-900 transition-colors"
          >
            Details
          </Link>
          {!outOfStock && (
            <button
              onClick={() => setOrderOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors"
            >
              Order
            </button>
          )}
        </div>
      </div>

      {orderOpen && (
        <OrderForm
          product={{ id: product.id, name: product.name, unit: product.unit, quantity: product.quantity }}
          onClose={() => setOrderOpen(false)}
        />
      )}
    </div>
  )
}