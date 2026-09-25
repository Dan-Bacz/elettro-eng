"use client"

import { categoryIcon } from "./storeIcons"
import { STORE_CATEGORIES, type StoreCategory } from "./storeUtils"

type Props = {
  active: StoreCategory
  onSelect: (c: StoreCategory) => void
  inStock: boolean
  onInStock: (v: boolean) => void
  minPrice: string
  maxPrice: string
  onMinPrice: (v: string) => void
  onMaxPrice: (v: string) => void
  counts: Partial<Record<StoreCategory, number>>
}

export default function CategorySidebar({ active, onSelect, inStock, onInStock, minPrice, maxPrice, onMinPrice, onMaxPrice, counts }: Props) {
  const hasFilters = active !== "All" || inStock || minPrice !== "" || maxPrice !== ""

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">Categories</h3>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                onSelect("All")
                onInStock(false)
                onMinPrice("")
                onMaxPrice("")
              }}
              className="text-[11px] font-bold text-yellow-700 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <nav className="mt-3 space-y-1" aria-label="Product categories">
          {STORE_CATEGORIES.map((cat) => {
            const Icon = categoryIcon(cat)
            const isActive = active === cat
            const count = counts[cat] || 0
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelect(cat)}
                aria-pressed={isActive}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-yellow-400 text-black shadow-md shadow-yellow-400/20"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-black" : "text-gray-400"}`} />
                  <span className="truncate">{cat === "All" ? "All Products" : cat}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive ? "bg-black/10 text-black" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </nav>
      </section>

      <section>
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900">Filters</h3>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => onInStock(e.target.checked)}
              className="h-4 w-4 accent-yellow-500"
            />
            <span className="text-sm font-semibold text-gray-700">In stock only</span>
          </label>

          <div>
            <p className="text-xs font-bold text-gray-500">Price range (₱)</p>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => onMinPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full min-w-0 rounded-lg border border-gray-200 px-2.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <span className="text-gray-400">–</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => onMaxPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full min-w-0 rounded-lg border border-gray-200 px-2.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}