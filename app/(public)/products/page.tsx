"use client"

import { useEffect, useMemo, useState } from "react"
import CTASection from "@/components/client/CTASection"
import { CartProvider, useCart } from "@/components/client/store/CartContext"
import CartDrawer from "@/components/client/store/CartDrawer"
import CheckoutModal from "@/components/client/store/CheckoutModal"
import CategorySidebar from "@/components/client/store/CategorySidebar"
import StoreToolbar, { type SortKey } from "@/components/client/store/StoreToolbar"
import StoreProductCard from "@/components/client/store/StoreProductCard"
import {
  CartIcon,
  categoryIcon,
  CloseIcon,
  GridIcon,
  HeadsetIcon,
  SearchIcon,
  ShieldIcon,
  TruckIcon,
} from "@/components/client/store/storeIcons"
import { STORE_CATEGORIES, type StoreCategory, type StoreProduct } from "@/components/client/store/storeUtils"

const TRUST_FEATURES = [
  {
    icon: TruckIcon,
    title: "Fast & Reliable Delivery",
    desc: "Dependable lead times across the region.",
  },
  {
    icon: ShieldIcon,
    title: "Genuine Products",
    desc: "Brand-new quality electrical materials.",
  },
  {
    icon: HeadsetIcon,
    title: "Trusted Support",
    desc: "Guidance and after-sales assistance.",
  },
]

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function searchScore(p: StoreProduct, q: string): number {
  const name = (p.name || "").toLowerCase()
  const brand = (p.brand || "").toLowerCase()
  const model = (p.model || "").toLowerCase()
  const sku = (p.sku || "").toLowerCase()
  const cat = `${p.category || ""} ${p.categoryGroup || ""}`.toLowerCase()
  const desc = (p.description || "").toLowerCase()
  let score = 0
  if (name.includes(q)) score += name.startsWith(q) ? 20 : 12
  if (model.includes(q)) score += 8
  if (brand.includes(q)) score += 8
  if (sku.includes(q)) score += 8
  if (cat.includes(q)) score += 6
  if (desc.includes(q)) score += 3
  return score
}

function ProductsShop() {
  const { count: cartCount, openCart } = useCart()
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const [searchInput, setSearchInput] = useState("")
  const search = useDebounced(searchInput, 250)

  const [activeCategory, setActiveCategory] = useState<StoreCategory>("All")
  const [sort, setSort] = useState<SortKey>("relevance")
  const [inStockOnly, setInStockOnly] = useState(false)
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    fetch("/api/public/products")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load products"))))
      .then((data: { products?: StoreProduct[] }) =>
        setProducts((data?.products || []).map((p) => ({ ...p, categoryGroup: p.categoryGroup || "Other" })))
      )
      .catch((err) => setLoadError(err?.message || "Unable to load products"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    document.body.style.overflow = filtersOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [filtersOpen])

  const counts = useMemo(() => {
    const c: Partial<Record<StoreCategory, number>> = {}
    for (const p of products) c[p.categoryGroup] = (c[p.categoryGroup] || 0) + 1
    return c
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const min = minPrice === "" ? null : Number(minPrice)
    const max = maxPrice === "" ? null : Number(maxPrice)

    let list = products.filter((p) => {
      if (activeCategory !== "All" && p.categoryGroup !== activeCategory) return false
      if (inStockOnly && Number(p.quantity || 0) <= 0) return false
      const price = Number(p.sellPrice || 0)
      if (min != null && !Number.isNaN(min) && price > 0 && price < min) return false
      if (max != null && !Number.isNaN(max) && price > 0 && price > max) return false
      return true
    })

    if (q) {
      const scored = list
        .map((p) => ({ p, score: searchScore(p, q) }))
        .filter((s) => s.score > 0)
      scored.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
      list = scored.map((s) => s.p)
      return list
    }

    const priceOf = (p: StoreProduct) => (p.sellPrice != null && Number(p.sellPrice) > 0 ? Number(p.sellPrice) : Infinity)
    const timeOf = (p: StoreProduct) => (p.createdAt ? new Date(p.createdAt).getTime() : 0)

    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => priceOf(a) - priceOf(b))
      case "price-desc":
        return [...list].sort((a, b) => priceOf(b) - priceOf(a))
      case "rating": {
        return [...list].sort((a, b) => {
          const ar = Number(a.rating || 0)
          const br = Number(b.rating || 0)
          if (ar !== br) return br - ar
          return (Number(b.ratingCount || 0) - Number(a.ratingCount || 0)) || timeOf(b) - timeOf(a)
        })
      }
      case "relevance":
      default:
        return [...list].sort((a, b) => timeOf(b) - timeOf(a))
    }
  }, [products, search, activeCategory, inStockOnly, minPrice, maxPrice, sort])

  const hasActiveFilters = activeCategory !== "All" || inStockOnly || minPrice !== "" || maxPrice !== ""

  function scrollToResults() {
    document.getElementById("shop-grid")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="bg-gray-50">
      {/* ---------- HERO (below the existing header) ---------- */}
      <section className="page-hero-bg relative overflow-hidden bg-[#0b0f10] text-white">
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,15,16,0.9),rgba(11,15,16,0.45))]" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-yellow-400">
              <GridIcon className="w-4 h-4" />
              Electrical Store
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Powering <span className="text-yellow-400">Your Projects</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-gray-300 sm:text-lg">
              Quality electrical materials and equipment for residential, commercial and industrial needs.
            </p>

            {/* Search */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                scrollToResults()
              }}
              className="mt-8"
            >
              <div className="flex items-stretch overflow-hidden rounded-xl bg-white shadow-2xl shadow-black/30">
                <div className="flex items-center pl-4 pr-2 text-gray-400">
                  <SearchIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search for products (e.g. circuit breaker, panel board, cable...)"
                  aria-label="Search products"
                  className="min-w-0 flex-1 bg-transparent px-1 py-3.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-yellow-400 px-5 text-sm font-black text-black transition-colors hover:bg-yellow-300 sm:px-8"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ---------- Trust features ---------- */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px px-4 py-6 sm:grid-cols-3 sm:px-6 lg:px-8">
          {TRUST_FEATURES.map((feature) => (
            <div key={feature.title} className="flex items-center gap-3.5 py-2 sm:px-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-700">
                <feature.icon className="w-6 h-6" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900">{feature.title}</p>
                <p className="truncate text-xs text-gray-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Category navigation ---------- */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <h2 className="sr-only">Shop by category</h2>
          <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            {STORE_CATEGORIES.map((cat) => {
              const Icon = categoryIcon(cat)
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={isActive}
                  className={`inline-flex shrink-0 snap-start items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "translate-y-[-2px] bg-yellow-400 text-black shadow-md shadow-yellow-400/30"
                      : "border border-gray-200 bg-white text-gray-700 hover:border-yellow-400 hover:text-yellow-700"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-black" : "text-gray-400"}`} />
                  {cat === "All" ? "All" : cat}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- Shop layout ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-5">
              <CategorySidebar
                active={activeCategory}
                onSelect={setActiveCategory}
                inStock={inStockOnly}
                onInStock={setInStockOnly}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onMinPrice={setMinPrice}
                onMaxPrice={setMaxPrice}
                counts={counts}
              />
            </div>
          </aside>

          {/* Products column */}
          <div>
            <StoreToolbar
              count={filtered.length}
              sort={sort}
              onSort={setSort}
              onOpenFilters={() => setFiltersOpen(true)}
              hasActiveFilters={hasActiveFilters}
            />

            <div id="shop-grid" className="mt-5 scroll-mt-24">
              {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 sm:gap-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-[380px] animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm" />
                  ))}
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl opacity-70">!</div>
                  <p className="mt-3 text-sm font-bold text-gray-700">Unable to load products</p>
                  <p className="mt-1 text-xs text-gray-500">{loadError}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                    <SearchIcon className="w-7 h-7" />
                  </div>
                  <p className="mt-3 text-sm font-black text-gray-800">No products found</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
                    {search.trim()
                      ? `Nothing matched "${search.trim()}". Try a different keyword, or clear your filters.`
                      : "Try adjusting your category or filter selections."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("")
                      setActiveCategory("All")
                      setInStockOnly(false)
                      setMinPrice("")
                      setMaxPrice("")
                    }}
                    className="mt-4 rounded-lg bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-yellow-300"
                  >
                    Clear search & filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 sm:gap-5">
                  {filtered.map((p) => (
                    <StoreProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>

            {/* Need a product */}
            <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold text-gray-900">Need a product not listed here?</h3>
                <p className="mt-1 text-sm text-gray-600">
                  We can source electrical materials and equipment for your specific project.
                </p>
              </div>
              <a
                href="/contact"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Mobile filter drawer ---------- */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900">Filter & Categories</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <CategorySidebar
              active={activeCategory}
              onSelect={(c) => {
                setActiveCategory(c)
                setFiltersOpen(false)
              }}
              inStock={inStockOnly}
              onInStock={setInStockOnly}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onMinPrice={setMinPrice}
              onMaxPrice={setMaxPrice}
              counts={counts}
            />
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="mt-6 w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition-colors hover:bg-yellow-300"
            >
              Show {filtered.length} product{filtered.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      )}

      {/* ---------- Mobile floating cart ---------- */}
      <button
        type="button"
        onClick={openCart}
        aria-label="Open cart"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-black shadow-xl shadow-black/20 transition-transform hover:scale-105 active:scale-95 lg:hidden"
      >
        <CartIcon className="w-6 h-6" />
        {cartCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1 text-[11px] font-black text-yellow-400">
            {cartCount}
          </span>
        )}
      </button>

      <CartDrawer />
      <CheckoutModal />

      <CTASection
        heading="Order or Request a Product"
        subheading="Ready to get started on your project? Request a product or book a service today."
        primaryLabel="Book a Service"
        primaryHref="/book-service"
        secondaryLabel="Contact Us"
        secondaryHref="/contact"
      />
    </div>
  )
}

export default function ProductsPage() {
  return (
    <CartProvider>
      <ProductsShop />
    </CartProvider>
  )
}