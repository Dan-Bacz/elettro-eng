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
        clientName: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        items: {
          select: {
            inventoryItemId: true,
            name: true,
            quantity: true,
            unitPrice: true,
            inventoryItem: { select: { category: true } },
          },
        },
      },
    })

    const byItem = new Map<string, { units: number; revenue: number; orders: number }>()
    const byDay = new Map<string, { units: number; revenue: number; orders: number }>()
    const byCategory = new Map<string, { units: number; revenue: number }>()
    let units = 0
    let revenue = 0

    for (const order of orders) {
      const countedItems = new Set<string>()
      const day = order.createdAt.toISOString().slice(0, 10)
      const daySummary = byDay.get(day) || { units: 0, revenue: 0, orders: 0 }
      daySummary.orders += 1
      for (const item of order.items) {
        if (!item.inventoryItemId) continue
        const itemRevenue = Number(item.unitPrice) * item.quantity
        units += item.quantity
        revenue += itemRevenue
        daySummary.units += item.quantity
        daySummary.revenue += itemRevenue
        const current = byItem.get(item.inventoryItemId) || { units: 0, revenue: 0, orders: 0 }
        current.units += item.quantity
        current.revenue += itemRevenue
        if (!countedItems.has(item.inventoryItemId)) {
          current.orders += 1
          countedItems.add(item.inventoryItemId)
        }
        byItem.set(item.inventoryItemId, current)
        const category = item.inventoryItem?.category || 'Uncategorized'
        const categorySummary = byCategory.get(category) || { units: 0, revenue: 0 }
        categorySummary.units += item.quantity
        categorySummary.revenue += itemRevenue
        byCategory.set(category, categorySummary)
      }
      byDay.set(day, daySummary)
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
      trend: Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({
        date,
        orders: values.orders,
        units: values.units,
        revenue: Math.round(values.revenue * 100) / 100,
      })),
      categories: Array.from(byCategory.entries()).map(([category, values]) => ({
        category,
        units: values.units,
        revenue: Math.round(values.revenue * 100) / 100,
      })).sort((a, b) => b.revenue - a.revenue),
      recentOrders: orders.slice(0, 10).map((order) => ({
        id: order.id,
        reference: `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
        customer: order.clientName,
        amount: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
    })
  } catch (error) {
    console.error('Warehouse sales summary failed', error)
    return res.status(500).json({ error: 'Could not load warehouse sales summary' })
  }
}
