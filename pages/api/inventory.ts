import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
const prisma = new PrismaClient()

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

async function uploadToCloudinary(dataUrl: string) {
  // If CLOUDINARY_URL present, use authenticated upload (signed)
  const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL)
  const cloudName = parsed?.cloud_name || process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = parsed?.api_key || process.env.CLOUDINARY_API_KEY
  const apiSecret = parsed?.api_secret || process.env.CLOUDINARY_API_SECRET

  if (!cloudName) return null

  try {
    const timestamp = Math.floor(Date.now() / 1000)
    let signature: string | undefined = undefined

    if (apiKey && apiSecret) {
      // sign only the timestamp for a simple signed upload
      const toSign = `timestamp=${timestamp}${apiSecret}`
      signature = crypto.createHash('sha1').update(toSign).digest('hex')
    }

    const formData = new FormData()
    formData.append('file', dataUrl)
    if (apiKey) formData.append('api_key', apiKey)
    formData.append('timestamp', String(timestamp))
    if (signature) formData.append('signature', signature)

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
  } catch (e) {
    console.error('Cloudinary upload failed', e)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const items = await prisma.inventoryItem.findMany({ orderBy: { createdAt: 'desc' } })
    return res.json(items)
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    let imageUrl = body.imageUrl ? String(body.imageUrl).trim() : undefined
    const imageData = body.imageData ? String(body.imageData).trim() : undefined

    // If imageData is a data URL, attempt to upload to Cloudinary and use the returned URL
    if (imageData && imageData.startsWith('data:')) {
      const uploaded = await uploadToCloudinary(imageData)
      if (uploaded) {
        imageUrl = uploaded
      }
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name: String(body.name || '').trim(),
        sku: body.sku ? String(body.sku).trim() : undefined,
        category: body.category ? String(body.category).trim() : undefined,
        brand: body.brand ? String(body.brand).trim() : undefined,
        model: body.model ? String(body.model).trim() : undefined,
        description: body.description ? String(body.description).trim() : undefined,
        unit: body.unit ? String(body.unit).trim() : 'pcs',
        quantity: Number(body.quantity || 0),
        imageUrl: imageUrl,
        imageData: // only store raw data if we could not upload
          !imageUrl && imageData ? imageData : undefined
      }
    })

    return res.status(201).json(item)
  }

  if (req.method === 'PUT') {
    const body = req.body || {}
    const { id, quantity, ...rest } = body
    if (!id) return res.status(400).json({ error: 'Inventory item id required' })

    const item = await prisma.inventoryItem.update({
      where: { id: String(id) },
      data: {
        ...(typeof quantity !== 'undefined' ? { quantity: Number(quantity) } : {}),
        ...(rest.name ? { name: String(rest.name).trim() } : {}),
        ...(rest.sku ? { sku: String(rest.sku).trim() } : {}),
        ...(rest.category ? { category: String(rest.category).trim() } : {}),
        ...(rest.brand ? { brand: String(rest.brand).trim() } : {}),
        ...(rest.model ? { model: String(rest.model).trim() } : {}),
        ...(rest.description ? { description: String(rest.description).trim() } : {}),
        ...(rest.unit ? { unit: String(rest.unit).trim() } : {}),
        ...(rest.imageUrl ? { imageUrl: String(rest.imageUrl).trim() } : {}),
        ...(rest.imageData ? { imageData: String(rest.imageData).trim() } : {})
      }
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

  return res.status(405).end()
}
