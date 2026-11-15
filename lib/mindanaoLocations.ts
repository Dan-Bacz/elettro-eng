export type PSGCBarangay = { code: string; name: string }

export type PSGCMunicipality = {
  code: string
  name: string
  type: "city" | "municipality"
  barangays: PSGCBarangay[]
}

export type MindanaoLocation = {
  code: string
  province: string
  municipalities: PSGCMunicipality[]
}

type PSGCIndexArea = { code: string; name: string; type?: "city" | "municipality" }
type PSGCIndexRegion = { code: string; provinces: PSGCIndexArea[]; independent: PSGCIndexArea[] }
type PSGCIndex = { regions: PSGCIndexRegion[] }
type PSGCArea = {
  cities: Array<{
    code: string
    name: string
    type: "city" | "municipality"
    barangays: Array<[string, string]>
  }>
}

// Pinned quarterly release from the PSA PSGC source so options do not change
// silently between deployments.
export const PSGC_RELEASE = "2026-Q2"
const PSGC_BASE_URL = `https://cdn.jsdelivr.net/gh/Tenasia/ph-psgc@${PSGC_RELEASE}/psgc`
const MINDANAO_REGION_CODES = new Set(["0900000000", "1000000000", "1100000000", "1200000000", "1600000000", "1900000000"])

export async function loadMindanaoLocations(signal?: AbortSignal): Promise<MindanaoLocation[]> {
  const indexResponse = await fetch(`${PSGC_BASE_URL}/index.json`, { signal, cache: "force-cache" })
  if (!indexResponse.ok) throw new Error("Could not load the official Mindanao location directory.")
  const index = await indexResponse.json() as PSGCIndex
  const areas = index.regions
    .filter((region) => MINDANAO_REGION_CODES.has(region.code))
    .flatMap((region) => [
      ...region.provinces.map((area) => ({ ...area, province: area.name })),
      ...region.independent.map((area) => ({ ...area, province: area.name })),
    ])

  return Promise.all(areas.map(async (area) => {
    const response = await fetch(`${PSGC_BASE_URL}/areas/${area.code}.json`, { signal, cache: "force-cache" })
    if (!response.ok) throw new Error(`Could not load ${area.name} location data.`)
    const payload = await response.json() as PSGCArea
    return {
      code: area.code,
      province: area.province,
      municipalities: payload.cities.map((municipality) => ({
        code: municipality.code,
        name: municipality.name,
        type: municipality.type,
        barangays: municipality.barangays.map(([code, name]) => ({ code, name })),
      })),
    }
  }))
}
