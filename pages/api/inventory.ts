import { PrismaClient } from '@prisma/client'
import { uploadToCloudinary } from '../../lib/cloudinary'

const prisma = new PrismaClient()

// Allow larger request bodies so camera/photo images (base64 data URLs) can be uploaded
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
    responseLimit: '12mb',
  },
}

function toNullable(str: string | undefined | null) {
  return str ? String(str).trim() : null
}

enum ImageAction {
  NONE = 'NONE',
  UPLOAD = 'UPLOAD',
  SET_URL = 'SET_URL',
  CLEAR = 'CLEAR',
}

// Decide what to do with the image payload from the client.
// Never falls back to storing base64 in the database.
function planImage(body: any): { action: ImageAction; imageUrl?: string; imagePublicId?: string; dataUrl?: string } {
  const rawUrl = body.imageUrl ? String(body.imageUrl).trim() : ''
  const rawData = body.imageData ? String(body.imageData).trim() : ''

  // A locally-captured/selected image must be uploaded to Cloudinary server-side
  if (rawData.startsWith('data:')) return { action: ImageAction.UPLOAD, dataUrl: rawData }

  // A remote http(s) URL can be stored directly
  if (rawUrl) return { action: ImageAction.SET_URL, imageUrl: rawUrl }

  // No image supplied -> clear
  return { action: ImageAction.CLEAR }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const items = await prisma.inventoryItem.findMany({ orderBy: { createdAt: 'desc' } })
      return res.json(items)
    }

    if (req.method === 'POST') {
      const body = req.body || {}
      if (!body.name || !String(body.name).trim()) {
        return res.status(400).json({ error: 'Item name is required' })
      }

      const plan = planImage(body)

      let imageUrl: string | null = null
      let imagePublicId: string | null = null
      let imageData: string | null = null

      if (plan.action === ImageAction.UPLOAD) {
        const uploaded = await uploadToCloudinary(plan.dataUrl!)
        if (!uploaded) {
          return res.status(500).json({ error: 'Image upload to Cloudinary failed. Please try again.' })
        }
        imageUrl = uploaded.secure_url
        imagePublicId = uploaded.public_id
      } else if (plan.action === ImageAction.SET_URL) {
        imageUrl = plan.imageUrl!
      }

      const item = await prisma.inventoryItem.create({
        data: {
          name: String(body.name).trim(),
          sku: body.sku ? String(body.sku).trim() : undefined,
          category: body.category ? String(body.category).trim() : undefined,
          brand: body.brand ? String(body.brand).trim() : undefined,
          model: body.model ? String(body.model).trim() : undefined,
          description: body.description ? String(body.description).trim() : undefined,
          unit: body.unit ? String(body.unit).trim() : 'pcs',
          quantity: Math.max(0, Math.round(Number(body.quantity) || 0)),
          buyPrice: typeof body.buyPrice !== 'undefined' && body.buyPrice !== '' ? Number(body.buyPrice) : null,
          sellPrice: typeof body.sellPrice !== 'undefined' && body.sellPrice !== '' ? Number(body.sellPrice) : null,
          reorderLevel: typeof body.reorderLevel !== 'undefined' ? Math.max(0, Math.round(Number(body.reorderLevel) || 0)) : 10,
          imageUrl: imageUrl ?? undefined,
          imagePublicId: imagePublicId ?? undefined,
          imageData: imageData ?? undefined
        }
      })

      return res.status(201).json(item)
    }

    if (req.method === 'PUT') {
      const body = req.body || {}
      const { id } = body
      if (!id) return res.status(400).json({ error: 'Inventory item id required' })

      const data: any = {}

      if (typeof body.quantity !== 'undefined') {
        data.quantity = Math.max(0, Math.round(Number(body.quantity) || 0))
      }
      if (typeof body.name !== 'undefined') {
        if (!String(body.name).trim()) return res.status(400).json({ error: 'Item name cannot be empty' })
        data.name = String(body.name).trim()
      }
      const optional = ['sku', 'category', 'brand', 'model', 'description', 'unit'] as const
      for (const key of optional) {
        if (typeof body[key] !== 'undefined') {
          data[key] = body[key] ? String(body[key]).trim() : null
        }
      }

      if (typeof body.buyPrice !== 'undefined') {
        data.buyPrice = body.buyPrice === '' || body.buyPrice === null ? null : Number(body.buyPrice)
      }
      if (typeof body.sellPrice !== 'undefined') {
        data.sellPrice = body.sellPrice === '' || body.sellPrice === null ? null : Number(body.sellPrice)
      }
      if (typeof body.reorderLevel !== 'undefined') {
        data.reorderLevel = Math.max(0, Math.round(Number(body.reorderLevel) || 0))
      }

      // Handle image changes (only when the client actually sent image fields).
      // Stock +/- quick adjustments send only { id, quantity } and must not touch images.
      if (typeof body.imageUrl !== 'undefined' || typeof body.imageData !== 'undefined') {
        const plan = planImage(body)

        if (plan.action === ImageAction.UPLOAD) {
          const uploaded = await uploadToCloudinary(plan.dataUrl!)
          if (!uploaded) {
            return res.status(500).json({ error: 'Image upload to Cloudinary failed. Please try again.' })
          }
          data.imageUrl = uploaded.secure_url
          data.imagePublicId = uploaded.public_id
          data.imageData = null
        } else if (plan.action === ImageAction.SET_URL) {
          const existing = await prisma.inventoryItem.findUnique({ where: { id: String(id) } })
          if (!existing || existing.imageUrl !== plan.imageUrl) {
            data.imageUrl = plan.imageUrl
            data.imagePublicId = null
          }
          data.imageData = null
        } else {
          // user removed the image
          data.imageUrl = null
          data.imagePublicId = null
          data.imageData = null
        }
      }

      const item = await prisma.inventoryItem.update({
        where: { id: String(id) },
        data
      })

      return res.json(item)
    }

    if (req.method === 'DELETE') {
      const body = req.body || {}
      const { id } = body
      if (!id) return res.status(400).json({ error: 'Inventory item id required' })

      await prisma.inventoryItem.delete({ where: { id: String(id) } })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Inventory API error', e)
    return res.status(500).json({ error: (e as any)?.message || 'Server error' })
  }
}