import { OrderStatus, PrismaClient } from '@prisma/client'
import { getSessionUser, getTokenFromRequest } from '../../lib/auth'

const prisma = new PrismaClient()

const SALE_STATUSES: OrderStatus[] = [OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.READY_FOR_PICKUP, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.COMPLETED]

function dateAtStart(value: unknown, fallback: Date) {
  const text = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return fallback
  const date = new Date(`${text}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? fallback : date
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const session = await getSessionUser(getTokenFromRequest(req))
    if (!session) return res.status(401).json({ error: 'Authentication required' })
    if (session.status !== 'ACTIVE' || session.role !== 'WAREHOUSE') return res.status(403).json({ error: 'Warehouse access required' })

    const now = new Date()
    const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const from = dateAtStart(req.query?.from, defaultFrom)
    const requestedTo = dateAtStart(req.query?.to, from)
    const to = new Date(requestedTo)
    to.setUTCDate(to.getUTCDate() + 1)
    if (to <= from) return res.status(400).json({ error: 'The end date must be on or after the start date.' })

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: from, lt: to },
        status: { in: SALE_STATUSES },
      },
      select: {
        id: true,
        items: {
          select: {
            inventoryItemId: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    })

    const byItem = new Map<string, { units: number; revenue: number; orders: number }>()
    let units = 0
    let revenue = 0

    for (const order of orders) {
      const countedItems = new Set<string>()
      for (const item of order.items) {
        if (!item.inventoryItemId) continue
        const itemRevenue = Number(item.unitPrice) * item.quantity
        units += item.quantity
        revenue += itemRevenue
        const current = byItem.get(item.inventoryItemId) || { units: 0, revenue: 0, orders: 0 }
        current.units += item.quantity
        current.revenue += itemRevenue
        if (!countedItems.has(item.inventoryItemId)) {
          current.orders += 1
          countedItems.add(item.inventoryItemId)
        }
        byItem.set(item.inventoryItemId, current)
      }
    }

    return res.json({
      from: from.toISOString(),
      to: new Date(to.getTime() - 1).toISOString(),
      summary: { orders: orders.length, units, revenue: Math.round(revenue * 100) / 100 },
      sales: Array.from(byItem.entries()).map(([inventoryItemId, values]) => ({
        inventoryItemId,
        units: values.units,
        orders: values.orders,
        revenue: Math.round(values.revenue * 100) / 100,
      })),
    })
  } catch (error) {
    console.error('Warehouse sales summary failed', error)
    return res.status(500).json({ error: 'Could not load warehouse sales summary' })
  }
}
