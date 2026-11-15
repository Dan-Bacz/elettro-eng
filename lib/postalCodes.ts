type PostalRecord = {
  name_en: string
  parent_name_en: string
  postal_code?: string | null
}

type PostalResponse = {
  entities: PostalRecord[]
}

const POSTAL_DATA_URL = "https://api.openadmindata.org/api/v1/ph/barangay.json"
let postalDataPromise: Promise<PostalRecord[]> | null = null

async function loadPostalRecords(): Promise<PostalRecord[]> {
  if (!postalDataPromise) {
    postalDataPromise = fetch(POSTAL_DATA_URL, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load postal code data.")
        return response.json() as Promise<PostalResponse>
      })
      .then((payload) => payload.entities || [])
  }
  return postalDataPromise
}

export async function findPostalCode(city: string, barangay: string): Promise<string> {
  const records = await loadPostalRecords()
  const match = records.find((record) =>
    record.parent_name_en.trim().toLowerCase() === city.trim().toLowerCase() &&
    record.name_en.trim().toLowerCase() === barangay.trim().toLowerCase() &&
    /^\d{4}$/.test(record.postal_code || "")
  )
  return match?.postal_code || ""
}
