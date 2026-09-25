"use client"

import { useCart } from "./CartContext"
import { CartIcon, SlidersIcon } from "./storeIcons"

export type SortKey = "relevance" | "newest" | "price-asc" | "price-desc" | "rating"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Rating" },
]

type Props = {
  count: number
  sort: SortKey
  onSort: (s: SortKey) => void
  onOpenFilters: () => void
  hasActiveFilters: boolean
}

export default function StoreToolbar({ count, sort, onSort, onOpenFilters, hasActiveFilters }: Props) {
  const { count: cartCount, openCart } = useCart()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onOpenFilters}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:border-yellow-400 lg:hidden"
      >
        <SlidersIcon className="w-4 h-4" />
        Filters
        {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-yellow-500" />}
      </button>

      <p className="text-sm text-gray-500">
        <strong className="text-gray-900">{count}</strong> product{count === 1 ? "" : "s"}
      </p>

      <div className="ml-auto flex items-center gap-2.5">
        <label className="hidden items-center gap-2 text-xs font-bold text-gray-500 sm:flex">
          Sort by
        </label>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          aria-label="Sort products"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={openCart}
          className="relative inline-flex items-center gap-2 rounded-lg bg-[#0b0f10] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.98]"
        >
          <CartIcon className="w-4 h-4 text-yellow-400" />
          Cart
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-yellow-400 px-1 text-[11px] font-black text-black">
            {cartCount}
          </span>
        </button>
      </div>
    </div>
  )
}