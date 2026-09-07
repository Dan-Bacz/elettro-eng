import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const items = await prisma.inventoryItem.findMany({ orderBy: { createdAt: 'desc' } })
    return res.json(items)
  }

  if (req.method === 'POST') {
    const body = req.body || {}
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
        imageUrl: body.imageUrl ? String(body.imageUrl).trim() : undefined,
        imageData: body.imageData ? String(body.imageData).trim() : undefined
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
