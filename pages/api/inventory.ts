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

function parseCloudinaryUrl(url: string | undefined) {
  // expected format: cloudinary://<api_key>:<api_secret>@<cloud_name>
  if (!url) return null
  try {
    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
    if (!match) return null
    const [, api_key, api_secret, cloud_name] = match
    return { api_key, api_secret, cloud_name }
  } catch (e) {
    return null
  }
}

async function cloudinaryUpload(cloudName: string, formData: FormData) {
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData as any
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('Cloudinary upload failed status', res.status, txt)
    return null
  }
  const json = await res.json()
  return json.secure_url || json.url || null
}

async function uploadToCloudinary(dataUrl: string) {
  // If CLOUDINARY_URL present, use authenticated upload (signed)
  const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL)
  const cloudName = parsed?.cloud_name || process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = parsed?.api_key || process.env.CLOUDINARY_API_KEY
  const apiSecret = parsed?.api_secret || process.env.CLOUDINARY_API_SECRET

  if (!cloudName) return null

  const timestamp = Math.floor(Date.now() / 1000)
  const folder = 'elettro-inventory'

  try {
    // 1) Try a signed upload (falls back to unsigned if signature is not allowed)
    if (apiKey && apiSecret) {
      const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
      const signature = crypto.createHash('sha1').update(toSign).digest('hex')

      const formData = new FormData()
      formData.append('folder', folder)
      formData.append('file', dataUrl)
      formData.append('api_key', apiKey)
      formData.append('timestamp', String(timestamp))
      formData.append('signature', signature)

      const url = await cloudinaryUpload(cloudName, formData)
      if (url) return url
    }

    // 2) Try an unsigned upload as a fallback
    const formData = new FormData()
    formData.append('folder', folder)
    formData.append('file', dataUrl)
    formData.append('timestamp', String(timestamp))

    return await cloudinaryUpload(cloudName, formData)
  } catch (e) {
    console.error('Cloudinary upload failed', e)
    return null
  }
}

// Upload data-URL images to Cloudinary and return the final { imageUrl, imageData } to store.
// Empty/absent values become undefined so Prisma stores NULL.
async function resolveImage(body: any) {
  const rawUrl = body.imageUrl ? String(body.imageUrl).trim() : ''
  const rawData = body.imageData ? String(body.imageData).trim() : ''

  // If the payload carries a local base64 image, upload it to Cloudinary
  if (rawData.startsWith('data:')) {
    const uploaded = await uploadToCloudinary(rawData)
    if (uploaded) {
      return { imageUrl: uploaded, imageData: null }
    }
    // Cloudinary upload failed — keep the raw data as a last resort
    return { imageUrl: rawUrl || null, imageData: rawData }
  }

  return { imageUrl: rawUrl || null, imageData: rawData || null }
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

      const { imageUrl, imageData } = await resolveImage(body)

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

      // Handle image: upload data-URL images to Cloudinary, allow clearing
      const { imageUrl, imageData } = await resolveImage(body)
      if (typeof body.imageUrl !== 'undefined') data.imageUrl = imageUrl
      if (typeof body.imageData !== 'undefined') data.imageData = imageData

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