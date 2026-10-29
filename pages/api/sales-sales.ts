import { Prisma, PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveRole } from '../../lib/department-auth'

const prisma = new PrismaClient()

type StockLine = { inventoryItemId: string; quantity: number }

async function getSalesStock(tx: PrismaClient | Prisma.TransactionClient) {
  const [released, sold] = await Promise.all([
    tx.warehouseRelease.findMany({
      where: {
        receivedBySalesId: { not: null },
        request: { source: 'INTERNAL_SALES' },
      },
      select: {
        items: {
          select: {
            quantity: true,
            requestItem: {
              select: {
                inventoryItemId: true,
                inventoryItem: {
                  select: { id: true, name: true, sku: true, unit: true, sellPrice: true, imageUrl: true, category: true },
                },
              },
            },
          },
        },
      },
    }),
    tx.salesSaleItem.groupBy({
      by: ['inventoryItemId'],
      _sum: { quantity: true },
    }),
  ])

  const soldByItem = new Map(sold.map((row) => [row.inventoryItemId, row._sum.quantity || 0]))
  const stock = new Map<string, { item: any; released: number; sold: number }>()

  for (const release of released) {
    for (const line of release.items) {
      const id = line.requestItem.inventoryItemId
      const current = stock.get(id) || { item: line.requestItem.inventoryItem, released: 0, sold: soldByItem.get(id) || 0 }
      current.released += line.quantity
      stock.set(id, current)
    }
  }

  return [...stock.values()].map(({ item, released: releasedQuantity, sold: soldQuantity }) => ({
    ...item,
    releasedQuantity,
    soldQuantity,
    availableQuantity: Math.max(0, releasedQuantity - soldQuantity),
  }))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireActiveRole(req, res, ['SALES', 'ADMIN'])
  if (!user) return

  if (req.method === 'GET') {
    const stock = await getSalesStock(prisma)
    const sales = await prisma.salesSale.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { items: true, createdBy: { select: { name: true } } },
    })
    return res.status(200).json({ stock, sales })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rawItems = req.body?.items
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 100) {
    return res.status(400).json({ error: 'Add at least one product to the sale.' })
  }

  const grouped = new Map<string, number>()
  for (const raw of rawItems) {
    const id = String(raw?.inventoryItemId || '').trim()
    const quantity = Number(raw?.quantity)
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
      return res.status(400).json({ error: 'Each sale item needs a valid whole-number quantity.' })
    }
    grouped.set(id, (grouped.get(id) || 0) + quantity)
  }

  const customerName = String(req.body?.customerName || '').trim().slice(0, 200) || null
  const customerContact = String(req.body?.customerContact || '').trim().slice(0, 100) || null

  try {
    const result = await prisma.$transaction(async (tx) => {
      const stock = await getSalesStock(tx)
      const stockById = new Map(stock.map((item) => [item.id, item]))
      let total = 0
      const items = [...grouped.entries()].map(([inventoryItemId, quantity]) => {
        const item = stockById.get(inventoryItemId)
        if (!item) throw new Error('PRODUCT_NOT_IN_SALES_STOCK')
        if (item.availableQuantity < quantity) throw new Error(`INSUFFICIENT_SALES_STOCK:${item.name}`)
        if (item.sellPrice == null || Number(item.sellPrice) <= 0) throw new Error(`PRICE_NOT_SET:${item.name}`)
        total += Number(item.sellPrice) * quantity
        return {
          inventoryItemId,
          name: item.name,
          quantity,
          unit: item.unit || 'pcs',
          unitPrice: Math.round(Number(item.sellPrice) * 100) / 100,
        }
      })

      const id = randomUUID()
      const sale = await tx.salesSale.create({
        data: {
          id,
          reference: `POS-${new Date().getFullYear()}-${id.slice(0, 8).toUpperCase()}`,
          customerName,
          customerContact,
          total: Math.round(total * 100) / 100,
          createdById: user.id,
          items: { create: items },
        },
        include: { items: true, createdBy: { select: { name: true } } },
      })
      return sale
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return res.status(201).json({ sale: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'PRODUCT_NOT_IN_SALES_STOCK') return res.status(409).json({ error: 'A selected product is not in Sales stock. Request it from Warehouse first.' })
    if (message.startsWith('INSUFFICIENT_SALES_STOCK:')) return res.status(409).json({ error: `Not enough Sales stock for ${message.slice('INSUFFICIENT_SALES_STOCK:'.length)}.` })
    if (message.startsWith('PRICE_NOT_SET:')) return res.status(409).json({ error: `Selling price is not set for ${message.slice('PRICE_NOT_SET:'.length)}.` })
    if (message.includes('Serializable')) return res.status(409).json({ error: 'Sales stock changed while saving. Refresh and try again.' })
    console.error('Sales POS sale failed', error)
    return res.status(500).json({ error: 'Could not save the sale.' })
  }
}
