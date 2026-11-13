const ORIGIN = { latitude: 8.1297, longitude: 123.4383 }
const cache = new Map<string, { latitude: number; longitude: number }>()

type DeliveryAddress = {
  address: string
  barangay?: string
  city: string
  province: string
  postalCode?: string
}

export type ShippingEstimate = {
  distanceKm: number
  shippingFee: number
}

function keyFor(address: DeliveryAddress) {
  return [address.address, address.barangay, address.city, address.province, address.postalCode]
    .filter(Boolean)
    .join(', ')
    .toLowerCase()
}

async function geocode(query: string) {
  const key = query.trim().toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph&q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'ElettroEngineering/1.0 shipping calculator' },
    signal: AbortSignal.timeout(7000),
  })
  if (!response.ok) throw new Error('The delivery location could not be checked.')
  const results = await response.json()
  const match = Array.isArray(results) ? results[0] : null
  if (!match?.lat || !match?.lon) return null

  const point = { latitude: Number(match.lat), longitude: Number(match.lon) }
  cache.set(key, point)
  return point
}

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const earthRadiusKm = 6371
  const toRadians = (value: number) => (value * Math.PI) / 180
  const latitudeDelta = toRadians(b.latitude - a.latitude)
  const longitudeDelta = toRadians(b.longitude - a.longitude)
  const h = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export async function calculateShipping(address: DeliveryAddress): Promise<ShippingEstimate> {
  const fullQuery = [address.address, address.barangay, address.city, address.province, address.postalCode, 'Philippines'].filter(Boolean).join(', ')
  let destination = await geocode(fullQuery)
  if (!destination) {
    destination = await geocode([address.barangay, address.city, address.province, 'Philippines'].filter(Boolean).join(', '))
  }
  if (!destination) throw new Error('We could not locate this delivery address. Please add a barangay, municipality, and province.')

  const distanceKm = haversineKm(ORIGIN, destination)
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    shippingFee: Math.max(30, Math.ceil(distanceKm / 5) * 30),
  }
}

export function addressKey(address: DeliveryAddress) {
  return keyFor(address)
}
