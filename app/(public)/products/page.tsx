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
import { usePathname } from "next/navigation"

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
  const pathname = usePathname()
  const isClientPortal = pathname === "/client/products"
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
    c.All = products.length
    return c
  }, [products])

  const inStockCount = useMemo(() => products.filter((product) => Number(product.quantity || 0) > 0).length, [products])
  const categoryCount = Math.max(0, Object.keys(counts).filter((category) => category !== "Other").length)

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

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-8">
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
          <div className="relative hidden min-h-[300px] lg:block">
            <div className="absolute inset-4 rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/30 backdrop-blur-sm" />
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-yellow-400/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute left-10 top-12 h-44 w-44 rounded-full border border-yellow-300/30 bg-gradient-to-br from-yellow-300/30 to-orange-500/10 shadow-[inset_-18px_-18px_35px_rgba(0,0,0,.35),0_24px_45px_-20px_rgba(250,204,21,.7)]" />
            <div className="absolute left-24 top-28 h-16 w-16 rounded-full border border-white/30 bg-[#101a20] shadow-inner shadow-cyan-200/20" />
            <div className="absolute right-10 top-16 rounded-2xl border border-white/15 bg-[#111b22]/90 p-4 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">Store pulse</p>
              <p className="mt-2 text-3xl font-black text-white">{inStockCount.toLocaleString()}</p>
              <p className="text-xs text-slate-400">products ready to ship</p>
            </div>
            <div className="absolute bottom-8 right-8 rounded-2xl border border-yellow-300/20 bg-yellow-400 p-4 text-black shadow-xl shadow-yellow-400/20">
              <p className="text-[10px] font-black uppercase tracking-[0.16em]">Explore freely</p>
              <p className="mt-1 text-sm font-bold">{categoryCount || "Many"} product categories</p>
            </div>
            <div className="absolute bottom-8 left-8 flex items-center gap-2 text-xs font-bold text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> Quality materials for real projects</div>
          </div>
        </div>
      </section>

      {/* ---------- Trust features ---------- */}
      <section className="border-b border-gray-200 bg-white shadow-[0_10px_30px_-26px_rgba(15,23,42,.8)]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px px-4 py-6 sm:grid-cols-3 sm:px-6 lg:px-8">
          {TRUST_FEATURES.map((feature) => (
            <div key={feature.title} className="group flex items-center gap-3.5 rounded-2xl py-3 transition hover:bg-slate-50 sm:px-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-md shadow-yellow-400/20 transition group-hover:-translate-y-0.5 group-hover:rotate-3">
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1722] via-[#123044] to-[#0b5360] py-10 shadow-[inset_0_1px_0_rgba(255,255,255,.08),inset_0_-1px_0_rgba(15,23,42,.25)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 left-1/4 h-80 w-80 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">Browse the collection</p><h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Shop by category</h2><p className="mt-2 max-w-lg text-sm text-cyan-100/70">Explore dependable electrical materials, organized around the way you build.</p></div><span className="hidden rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-cyan-100 sm:block">Find the right material faster</span></div>
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
                      ? "translate-y-[-2px] bg-yellow-400 text-black shadow-[0_10px_24px_-10px_rgba(250,204,21,.95)]"
                      : "border border-white/15 bg-white/[0.08] text-cyan-50 shadow-inner shadow-white/5 backdrop-blur-sm hover:-translate-y-0.5 hover:border-yellow-300/60 hover:bg-white/[0.16] hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-black" : "text-cyan-200"}`} />
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
            <div className="relative sticky top-24 overflow-hidden rounded-[1.5rem] border border-cyan-200/70 bg-gradient-to-br from-[#eef9fb] via-white to-[#fff8dc] p-5 shadow-[0_18px_40px_-28px_rgba(8,47,73,.55)] ring-1 ring-white/80">
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/25 blur-2xl" />
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
              total={counts[activeCategory] || 0}
              catalogLabel={activeCategory === "All" ? "All products" : activeCategory}
              sort={sort}
              onSort={setSort}
              onOpenFilters={() => setFiltersOpen(true)}
              hasActiveFilters={hasActiveFilters}
              showCart={isClientPortal}
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
                    <StoreProductCard key={p.id} product={p} showCartAction={isClientPortal} />
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
      {isClientPortal && <button
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
      </button>}

      {isClientPortal && <>
        <CartDrawer />
        <CheckoutModal />
      </>}

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
