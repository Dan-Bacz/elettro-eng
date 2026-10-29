import { PrismaClient, WarehouseRequestSource, DeliveryStatus } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveRole } from '../../lib/department-auth'
import { isFullyReceivedSale } from '../../lib/sales-metrics'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireActiveRole(req, res, ['ADMIN', 'WAREHOUSE', 'SALES'])
  if (!user) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const department = typeof req.query.department === 'string' ? req.query.department.toUpperCase() : user.role
  const startDateStr = typeof req.query.startDate === 'string' ? req.query.startDate : undefined
  const endDateStr = typeof req.query.endDate === 'string' ? req.query.endDate : undefined

  const dateFilter: any = {}
  if (startDateStr) dateFilter.gte = new Date(startDateStr)
  if (endDateStr) {
    const end = new Date(endDateStr)
    end.setHours(23, 59, 59, 999)
    dateFilter.lte = end
  }

  const hasDateFilter = Object.keys(dateFilter).length > 0

  try {
    // 1. Warehouse Department Reports
    if (department === 'WAREHOUSE') {
      if (user.role !== 'WAREHOUSE' && user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const inventoryItems = await prisma.inventoryItem.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          quantity: true,
          reorderLevel: true,
          unit: true,
          buyPrice: true,
          sellPrice: true,
          updatedAt: true,
        },
      })

      const lowStockItems = inventoryItems.filter((it) => it.quantity <= it.reorderLevel)

      const requests = await prisma.warehouseRequest.findMany({
        where: hasDateFilter ? { createdAt: dateFilter } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, name: true, role: true } },
          items: {
            include: {
              inventoryItem: { select: { name: true, sku: true, unit: true } },
            },
          },
          releases: {
            select: { id: true, receiptNumber: true, createdAt: true },
          },
        },
      })

      const movements = await prisma.inventoryMovement.findMany({
        where: hasDateFilter ? { createdAt: dateFilter } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          inventoryItem: { select: { name: true, sku: true, unit: true } },
          worker: { select: { name: true, role: true } },
        },
      })

      const receipts = await prisma.warehouseReceipt.findMany({
        where: hasDateFilter ? { createdAt: dateFilter } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          reference: true,
          createdAt: true,
          snapshot: true,
        },
      })

      const salesRequests = requests.filter((r) => r.source !== 'TECHNICIAN')
      const technicianRequests = requests.filter((r) => r.source === 'TECHNICIAN')

      let totalRequestedQty = 0
      let totalReleasedQty = 0
      for (const req of requests) {
        for (const it of req.items) {
          totalRequestedQty += it.requestedQuantity
          totalReleasedQty += it.releasedQuantity
        }
      }

      return res.status(200).json({
        department: 'WAREHOUSE',
        summary: {
          totalProducts: inventoryItems.length,
          availableStockItems: inventoryItems.filter((i) => i.quantity > 0).length,
          lowStockCount: lowStockItems.length,
          totalRequests: requests.length,
          salesRequestsCount: salesRequests.length,
          technicianRequestsCount: technicianRequests.length,
          totalRequestedQty,
          totalReleasedQty,
          totalMovements: movements.length,
          totalReceipts: receipts.length,
        },
        inventory: inventoryItems,
        lowStockItems,
        requests,
        salesRequests,
        technicianRequests,
        movements,
        receipts,
      })
    }

    // 2. Sales Department Reports
    if (department === 'SALES') {
      if (user.role !== 'SALES' && user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const orders = await prisma.order.findMany({
        where: hasDateFilter ? { createdAt: dateFilter } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          assignedRider: { select: { id: true, name: true, phone: true } },
          proofOfDelivery: true,
          deliveryHistories: { orderBy: { createdAt: 'desc' }, take: 5 },
          warehouseRequest: {
            select: { id: true, reference: true, status: true },
          },
        },
      })

      const releases = await prisma.warehouseRelease.findMany({
        where: {
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          request: { source: { in: ['INTERNAL_SALES', 'CLIENT_ORDER'] } },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          releasedBy: { select: { name: true } },
          salesRecipient: { select: { name: true } },
          receipt: { select: { reference: true } },
          request: { select: { reference: true, customerReference: true } },
          items: {
            include: {
              requestItem: {
                include: {
                  inventoryItem: { select: { name: true, unit: true } },
                },
              },
            },
          },
        },
      })

      const pendingOrders = orders.filter((o) => o.status === 'PENDING')
      const approvedOrders = orders.filter((o) => o.status === 'APPROVED')
      const inTransitOrders = orders.filter((o) => o.deliveryStatus === 'IN_TRANSIT')
      const deliveredOrders = orders.filter((o) => o.deliveryStatus === 'DELIVERED')
      const failedDeliveries = orders.filter((o) => o.deliveryStatus === 'DELIVERY_FAILED')
      const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED' || o.deliveryStatus === 'CANCELLED')
      const returnedOrders = orders.filter((o) => o.deliveryStatus === 'RETURNED' || o.deliveryStatus === 'RETURN_REQUESTED')
      const receivedSalesOrders = orders.filter(isFullyReceivedSale)

      const totalSalesRevenue = receivedSalesOrders
        .reduce((sum, o) => sum + o.total, 0)

      return res.status(200).json({
        department: 'SALES',
        summary: {
          totalOrders: orders.length,
          receivedOrders: receivedSalesOrders.length,
          pendingOrders: pendingOrders.length,
          ordersAwaitingFulfillment: approvedOrders.length,
          inTransitDeliveries: inTransitOrders.length,
          deliveredOrders: deliveredOrders.length,
          failedDeliveries: failedDeliveries.length,
          cancelledOrders: cancelledOrders.length,
          returnedOrders: returnedOrders.length,
          totalSalesRevenue,
          releasesHandedOver: releases.filter((r) => r.receivedBySalesId).length,
          releasesPendingHandover: releases.filter((r) => !r.receivedBySalesId).length,
        },
        orders,
        releases,
        failedDeliveries,
        cancelledOrders,
        returnedOrders,
      })
    }

    // 3. Admin Overview Reports
    if (department === 'ADMIN') {
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const [inventoryCount, lowStockCount, orderCount, requestCount, deliveryCount, movementCount] = await Promise.all([
        prisma.inventoryItem.count(),
        prisma.inventoryItem.count({ where: { quantity: { lte: 10 } } }),
        prisma.order.count(),
        prisma.warehouseRequest.count(),
        prisma.order.count({ where: { deliveryStatus: 'DELIVERED' } }),
        prisma.inventoryMovement.count(),
      ])

      const recentMovements = await prisma.inventoryMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          inventoryItem: { select: { name: true, sku: true } },
          worker: { select: { name: true, role: true } },
        },
      })

      const recentDeliveries = await prisma.order.findMany({
        where: { deliveryStatus: { in: ['IN_TRANSIT', 'DELIVERED', 'DELIVERY_FAILED'] } },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        include: {
          assignedRider: { select: { name: true } },
          proofOfDelivery: true,
        },
      })

      return res.status(200).json({
        department: 'ADMIN',
        summary: {
          inventoryCount,
          lowStockCount,
          orderCount,
          requestCount,
          deliveryCount,
          movementCount,
        },
        recentMovements,
        recentDeliveries,
      })
    }

    return res.status(400).json({ error: 'Invalid department requested' })
  } catch (error: any) {
    console.error('Department reports error:', error)
    return res.status(500).json({ error: error.message || 'Failed to generate report' })
  }
}
