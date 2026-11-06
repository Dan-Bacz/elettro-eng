import { PrismaClient } from '@prisma/client'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { getSessionUser, getTokenFromRequest } from '../../lib/auth'

const prisma = new PrismaClient()

async function nextElettroSku() {
  const existing = await prisma.inventoryItem.findMany({
    where: { sku: { startsWith: 'ELETTRO-' } },
    select: { sku: true },
  })
  const highest = existing.reduce((max, item) => {
    const match = item.sku?.match(/^ELETTRO-(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `ELETTRO-${String(highest + 1).padStart(3, '0')}`
}

function parsePrice(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN
}

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
    const session = await getSessionUser(getTokenFromRequest(req))
    if (!session) return res.status(401).json({ error: 'Authentication required' })
    if (session.status !== 'ACTIVE') return res.status(403).json({ error: 'Forbidden' })

    if (req.method === 'GET') {
      if (!['ADMIN', 'WAREHOUSE', 'SALES'].includes(session.role)) return res.status(403).json({ error: 'Forbidden' })
      const items = await prisma.inventoryItem.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        ...(session.role === 'SALES'
          ? {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true,
                brand: true,
                model: true,
                description: true,
                unit: true,
                quantity: true,
                sellPrice: true,
                imageUrl: true,
                reorderLevel: true,
                createdAt: true,
              },
            }
          : {}),
      })
      return res.json(items)
    }

    if (session.role !== 'WAREHOUSE') return res.status(403).json({ error: 'Only warehouse workers can modify inventory' })

    if (req.method === 'POST') {
      const body = req.body || {}
      if (!body.name || !String(body.name).trim()) {
        return res.status(400).json({ error: 'Item name is required' })
      }

      const buyPrice = parsePrice(body.buyPrice)
      const sellPrice = parsePrice(body.sellPrice)
      if (Number.isNaN(buyPrice) || Number.isNaN(sellPrice)) return res.status(400).json({ error: 'Prices must be valid non-negative numbers' })
      if (buyPrice !== null && sellPrice !== null && sellPrice < buyPrice) {
        return res.status(400).json({ error: 'Sell price cannot be less than the buy price' })
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

      const data = {
          name: String(body.name).trim(),
          category: body.category ? String(body.category).trim() : undefined,
          brand: body.brand ? String(body.brand).trim() : undefined,
          model: body.model ? String(body.model).trim() : undefined,
          description: body.description ? String(body.description).trim() : undefined,
          unit: body.unit ? String(body.unit).trim() : 'pcs',
          quantity: Math.max(0, Math.round(Number(body.quantity) || 0)),
          buyPrice,
          sellPrice,
          reorderLevel: typeof body.reorderLevel !== 'undefined' ? Math.max(0, Math.round(Number(body.reorderLevel) || 0)) : 10,
          imageUrl: imageUrl ?? undefined,
          imagePublicId: imagePublicId ?? undefined,
          imageData: imageData ?? undefined
        }
      let item
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          item = await prisma.inventoryItem.create({ data: { ...data, sku: await nextElettroSku() } })
          break
        } catch (error: any) {
          if (error?.code !== 'P2002' || attempt === 2) throw error
        }
      }
      return res.status(201).json(item)
    }

    if (req.method === 'PUT') {
      const body = req.body || {}
      const { id } = body
      if (!id) return res.status(400).json({ error: 'Inventory item id required' })
      if (typeof body.quantity !== 'undefined') {
        return res.status(400).json({ error: 'Use the warehouse stock action to receive or adjust stock.' })
      }

      const existing = await prisma.inventoryItem.findUnique({ where: { id: String(id) } })
      if (!existing || existing.deletedAt) return res.status(404).json({ error: 'Inventory item not found' })
      const data: any = {}
      if (typeof body.name !== 'undefined') {
        if (!String(body.name).trim()) return res.status(400).json({ error: 'Item name cannot be empty' })
        data.name = String(body.name).trim()
      }
      if (typeof body.quantity !== 'undefined') {
        data.quantity = Math.max(0, Math.round(Number(body.quantity) || 0))
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
      const effectiveBuyPrice = typeof body.buyPrice !== 'undefined' ? parsePrice(body.buyPrice) : existing.buyPrice
      const effectiveSellPrice = typeof body.sellPrice !== 'undefined' ? parsePrice(body.sellPrice) : existing.sellPrice
      if (Number.isNaN(effectiveBuyPrice) || Number.isNaN(effectiveSellPrice)) return res.status(400).json({ error: 'Prices must be valid non-negative numbers' })
      if (effectiveBuyPrice !== null && effectiveSellPrice !== null && effectiveSellPrice < effectiveBuyPrice) {
        return res.status(400).json({ error: 'Sell price cannot be less than the buy price' })
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
      const deletionReason = String(body.reason || '').trim().slice(0, 1000)
      if (!deletionReason) return res.status(400).json({ error: 'A reason is required when deleting an inventory item' })

      const item = await prisma.inventoryItem.findUnique({
        where: { id: String(id) },
        select: {
          id: true,
          name: true,
          sku: true,
          deletedAt: true,
          quantity: true,
        },
      })

      if (!item) return res.status(404).json({ error: 'Inventory item not found' })
      if (item.deletedAt) return res.status(409).json({ error: 'Inventory item has already been deleted.' })

      await prisma.$transaction(async (tx) => {
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { deletedAt: new Date(), deletionReason, deletedById: session.id, quantity: 0 },
        })

        const admins = await tx.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
        if (admins.length) {
          await tx.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              type: 'INVENTORY_DELETED',
              title: 'Warehouse inventory item deleted',
              message: `${item.name}${item.sku ? ` (${item.sku})` : ''} was removed by warehouse. Reason: ${deletionReason}`,
              link: '/admin/inventory',
            })),
          })
        }
      })
      return res.status(200).json({ ok: true, archived: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Inventory API error', e)
    return res.status(500).json({ error: (e as any)?.message || 'Server error' })
  }
}
