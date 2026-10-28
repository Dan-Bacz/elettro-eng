import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function mapCategory(raw: string | null | undefined): string {
  const c = String(raw || '').trim().toLowerCase()
  if (!c) return 'Other'
  if (/(breaker|mcb|rcbo|rcd|rcb|gfci|switchgear|fuse)/i.test(c)) return 'Circuit Breakers'
  if (/(wire|cable|conductor|thhn|thw|romex|cord|strand)/i.test(c)) return 'Wires & Cables'
  if (/(panel|board|enclosure|load center|distribution|junction box|sub-panel|panels)/i.test(c)) return 'Panels & Boards'
  if (/(light|lamp|bulb|led|fixture|tube|chandelier|streetlight)/i.test(c)) return 'Lighting'
  if (/(switch|outlet|receptacle|socket|wall plate|dimmed|1-gang|2-gang)/i.test(c)) return 'Switches & Outlets'
  if (/(conduit|fitting|elbow|pipe|duct|raceway|pvc|flexible|liquid-tight|box connector)/i.test(c)) return 'Conduits & Fittings'
  if (/(tool|accessor|drill|screwdriver|pliers|multimeter|saw|hammer|wrench|tester|kit)/i.test(c)) return 'Tools & Accessories'
  return 'Other'
}

// Public storefront catalog. Keeps internal fields (cost prices, cloudinary
// ids, raw base64 blobs) out of the response, and only forwards base64 image
// data when no hosted image URL exists so payloads stay small.
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { createdAt: 'desc' }
    })

    const products = items.map((item) => {
      const price = item.sellPrice != null && Number(item.sellPrice) > 0 ? Number(item.sellPrice) : null
      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        categoryGroup: mapCategory(item.category),
        brand: item.brand,
        model: item.model,
        description: item.description,
        quantity: Number(item.quantity || 0),
        unit: item.unit,
        sellPrice: price,
        originalPrice: item.originalPrice != null && Number(item.originalPrice) > 0 ? Number(item.originalPrice) : null,
        imageUrl: item.imageUrl,
        imageData: !item.imageUrl ? item.imageData : null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }
    })

    return res.status(200).json({ products })
  } catch (error: any) {
    console.error('Public products API error:', error)
    return res.status(500).json({ error: error.message || 'Failed to load products' })
  }
}
