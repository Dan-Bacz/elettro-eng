import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

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

const CLOUDINARY_FOLDER = 'elettro-inventory'

// Credentials come only from environment variables (Vercel project env or local .env).
// Do NOT hardcode them.
function getCloudinaryCredentials() {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME
  let apiKey = process.env.CLOUDINARY_API_KEY
  let apiSecret = process.env.CLOUDINARY_API_SECRET

  // Fallback: allow the DSN form "cloudinary://key:secret@cloud_name"
  const dsn = process.env.CLOUDINARY_URL
  if (dsn) {
    const match = dsn.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
    if (match) {
      cloudName = cloudName || match[3]
      apiKey = apiKey || match[1]
      apiSecret = apiSecret || match[2]
    }
  }

  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

// Server-side signed upload to Cloudinary.
// Returns { secure_url, public_id } or null on failure.
async function uploadToCloudinary(dataUrl: string) {
  const creds = getCloudinaryCredentials()
  if (!creds) {
    console.error('Cloudinary credentials missing (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)')
    return null
  }

  const { cloudName, apiKey, apiSecret } = creds
  const timestamp = Math.floor(Date.now() / 1000)

  try {
    // Signed upload: signature = SHA1 of sorted params + api_secret
    const toSign = `folder=${CLOUDINARY_FOLDER}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(toSign).digest('hex')

    const formData = new FormData()
    formData.append('folder', CLOUDINARY_FOLDER)
    formData.append('file', dataUrl)
    formData.append('api_key', apiKey)
    formData.append('timestamp', String(timestamp))
    formData.append('signature', signature)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData as any,
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error('Cloudinary upload failed status', res.status, txt)
      return null
    }

    const json = await res.json()
    if (!json.secure_url || !json.public_id) return null
    return { secure_url: json.secure_url, public_id: json.public_id }
  } catch (e) {
    console.error('Cloudinary upload failed', e)
    return null
  }
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