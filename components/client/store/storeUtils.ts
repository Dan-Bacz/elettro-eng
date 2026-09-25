export const STORE_CATEGORIES = [
  "All",
  "Circuit Breakers",
  "Wires & Cables",
  "Panels & Boards",
  "Lighting",
  "Switches & Outlets",
  "Conduits & Fittings",
  "Tools & Accessories",
  "Other",
] as const

export type StoreCategory = (typeof STORE_CATEGORIES)[number]

// Map whatever category string is stored in the database into the curated
// storefront grouping. Unknown / empty values fall into "Other".
export function mapCategory(raw?: string | null): StoreCategory {
  const c = String(raw || "").trim().toLowerCase()
  if (!c) return "Other"
  if (/(breaker|mcb|rcbo|rcd|rcb|gfci|switchgear|fuse)/i.test(c)) return "Circuit Breakers"
  if (/(wire|cable|conductor|thhn|thw|romex|cord|strand)/i.test(c)) return "Wires & Cables"
  if (/(panel|board|enclosure|load center|distribution|junction box|sub-panel|panels)/i.test(c)) return "Panels & Boards"
  if (/(light|lamp|bulb|led|fixture|tube|chandelier|streetlight)/i.test(c)) return "Lighting"
  if (/(switch|outlet|receptacle|socket|wall plate|dimmed|1-gang|2-gang)/i.test(c)) return "Switches & Outlets"
  if (/(conduit|fitting|elbow|pipe|duct|raceway|pvc|flexible|liquid-tight|box connector)/i.test(c)) return "Conduits & Fittings"
  if (/(tool|accessor|drill|screwdriver|pliers|multimeter|saw|hammer|wrench|tester|kit)/i.test(c)) return "Tools & Accessories"
  return "Other"
}

export function formatPeso(amount: number | null | undefined, decimals = 0): string {
  const n = Number(amount || 0)
  const opts: Intl.NumberFormatOptions = decimals > 0
    ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
    : { maximumFractionDigits: 0 }
  return `₱${n.toLocaleString("en-PH", opts)}`
}

export function formatQuantity(n: number | null | undefined): string {
  return Number(n || 0).toLocaleString("en-PH")
}

export type StoreProduct = {
  id: string
  name: string
  sku?: string | null
  category?: string | null
  brand?: string | null
  model?: string | null
  description?: string | null
  quantity: number
  unit?: string | null
  sellPrice?: number | null
  originalPrice?: number | null
  rating?: number | null
  ratingCount?: number | null
  imageUrl?: string | null
  imageData?: string | null
  createdAt?: string
  categoryGroup: StoreCategory
}

export function isDiscounted(p: { sellPrice?: number | null; originalPrice?: number | null }): boolean {
  const sell = Number(p.sellPrice || 0)
  const orig = Number(p.originalPrice || 0)
  return orig > sell && sell > 0
}

export function discountPercent(p: { sellPrice?: number | null; originalPrice?: number | null }): number {
  const sell = Number(p.sellPrice || 0)
  const orig = Number(p.originalPrice || 0)
  if (!isDiscounted({ sellPrice: sell, originalPrice: orig })) return 0
  return Math.round(((orig - sell) / orig) * 100)
}

export type StoreBadge = {
  label: string
  tone: "yellow" | "red" | "green" | "dark"
}

export const BADGE_TONE_CLASSES: Record<StoreBadge["tone"], string> = {
  yellow: "bg-yellow-400 text-black",
  red: "bg-red-600 text-white",
  green: "bg-emerald-600 text-white",
  dark: "bg-[#0b0f10] text-yellow-400",
}

// Badges are only produced when the backing data actually indicates them.
export function productBadges(p: StoreProduct): StoreBadge[] {
  const badges: StoreBadge[] = []
  const soldOut = Number(p.quantity || 0) <= 0
  if (soldOut) badges.push({ label: "Out of Stock", tone: "red" })

  if (p.createdAt) {
    const ageMs = Date.now() - new Date(p.createdAt).getTime()
    if (!soldOut && ageMs >= 0 && ageMs < 30 * 86400000) badges.push({ label: "New", tone: "green" })
  }

  if (isDiscounted(p)) {
    badges.push({ label: `-${discountPercent(p)}%`, tone: "red" })
    badges.push({ label: "Sale", tone: "yellow" })
  }

  const rating = Number(p.rating || 0)
  const count = Number(p.ratingCount || 0)
  if (!soldOut && rating >= 4.5 && count >= 5 && count <= 100) badges.push({ label: "Top Rated", tone: "dark" })

  return badges.slice(0, 3)
}

export type CartItem = {
  id: string
  name: string
  image?: string | null
  model?: string | null
  unit?: string | null
  unitPrice: number
  quantity: number
}