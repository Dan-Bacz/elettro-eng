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
  total: number
  sort: SortKey
  onSort: (s: SortKey) => void
  onOpenFilters: () => void
  hasActiveFilters: boolean
}

export default function StoreToolbar({ count, total, sort, onSort, onOpenFilters, hasActiveFilters }: Props) {
  const { count: cartCount, openCart } = useCart()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-cyan-200/70 bg-gradient-to-r from-[#e9f8fa] via-white to-[#fff8dc] p-3 shadow-[0_16px_32px_-26px_rgba(8,47,73,.65)] sm:p-3.5">
      <button
        type="button"
        onClick={onOpenFilters}
        className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white/80 px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-white lg:hidden"
      >
        <SlidersIcon className="w-4 h-4" />
        Filters
        {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-yellow-500" />}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b5360] text-sm font-black text-white shadow-md shadow-cyan-900/15">▦</div>
        <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">All products</p><p className="text-sm font-black text-slate-900">{total.toLocaleString()} product{total === 1 ? "" : "s"}<span className="ml-2 text-xs font-medium text-slate-500">{count !== total ? `· ${count} shown` : "· complete catalog"}</span></p></div>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <label className="hidden items-center gap-2 text-xs font-bold text-slate-500 sm:flex">
          Sort by
        </label>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          aria-label="Sort products"
          className="rounded-xl border border-cyan-200 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
          className="relative inline-flex items-center gap-2 rounded-xl bg-[#0b1118] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-[#0b5360] active:scale-[0.98]"
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
