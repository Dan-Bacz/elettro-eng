import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveRole } from '../../../lib/department-auth'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireActiveRole(req, res, ['ADMIN'])
  if (!user) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const [inventory, sales, movements, releases, orders] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { deletedAt: null },
        orderBy: [{ quantity: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, sku: true, category: true, quantity: true, unit: true, reorderLevel: true, imageUrl: true },
      }),
      prisma.salesSale.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { items: true, createdBy: { select: { id: true, name: true } } },
      }),
      prisma.inventoryMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
          worker: { select: { id: true, name: true, role: true } },
          request: { select: { reference: true, source: true } },
          release: { select: { receiptNumber: true } },
        },
      }),
      prisma.warehouseRelease.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          releasedBy: { select: { id: true, name: true } },
          salesRecipient: { select: { id: true, name: true } },
          request: { select: { reference: true, source: true, status: true, order: { select: { clientName: true } } } },
          items: { select: { quantity: true, requestItem: { select: { inventoryItem: { select: { name: true, unit: true } } } } } },
        },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, clientName: true, status: true, total: true, createdAt: true, items: { select: { name: true, quantity: true } }, warehouseRequest: { select: { status: true } } },
      }),
    ])

    const lowStock = inventory.filter((item) => item.quantity <= item.reorderLevel).length
    const successfulOrderRevenue = orders.reduce((sum, order) => order.status === 'COMPLETED' && (!order.warehouseRequest || order.warehouseRequest.status === 'FULFILLED') ? sum + Number(order.total || 0) : sum, 0)
    const revenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0) + successfulOrderRevenue

    return res.status(200).json({
      syncedAt: new Date().toISOString(),
      summary: {
        warehouseItems: inventory.length,
        warehouseUnits: inventory.reduce((sum, item) => sum + item.quantity, 0),
        lowStock,
        salesTransactions: sales.length,
        salesRevenue: revenue,
        warehouseReleases: releases.length,
        clientOrders: orders.length,
        pendingOrders: orders.filter((order) => order.status === 'PENDING').length,
      },
      inventory,
      sales,
      movements,
      releases,
      orders,
    })
  } catch (error) {
    console.error('Admin operations sync failed:', error)
    return res.status(500).json({ error: 'Could not synchronize department records' })
  }
}
