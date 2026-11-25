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
        include: {
          inventoryItem: { select: { name: true, sku: true, unit: true } },
          worker: { select: { name: true, role: true } },
        },
      })

      const receipts = await prisma.warehouseReceipt.findMany({
        where: hasDateFilter ? { createdAt: dateFilter } : undefined,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reference: true,
          createdAt: true,
          snapshot: true,
        },
      })

      const releases = await prisma.warehouseRelease.findMany({
        where: hasDateFilter ? { createdAt: dateFilter } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          releasedBy: { select: { name: true } },
          request: { select: { reference: true, source: true } },
          items: { select: { quantity: true } },
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
        releases,
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
          request: { select: { reference: true, customerReference: true, source: true } },
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

      const sales = await prisma.salesSale.findMany({
        where: hasDateFilter ? { createdAt: dateFilter } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          createdBy: { select: { name: true } },
        },
      })

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const dailySalesDateFilter = { gte: startOfToday }
      const reportSalesDateFilter = hasDateFilter ? { createdAt: dateFilter } : {}
      const [dailyPosSalesAggregate, dailyCompletedSalesCount, reportPosSalesAggregate, reportCompletedSalesCount] = await Promise.all([
        prisma.salesSale.aggregate({
          where: { createdAt: dailySalesDateFilter },
          _sum: { total: true },
        }),
        prisma.salesSale.count({ where: { createdAt: dailySalesDateFilter } }),
        prisma.salesSale.aggregate({ where: reportSalesDateFilter, _sum: { total: true } }),
        prisma.salesSale.count({ where: reportSalesDateFilter }),
      ])

      const pendingOrders = orders.filter((o) => o.status === 'PENDING')
      const approvedOrders = orders.filter((o) => o.status === 'APPROVED')
      const inTransitOrders = orders.filter((o) => o.deliveryStatus === 'IN_TRANSIT')
      const deliveredOrders = orders.filter((o) => o.deliveryStatus === 'DELIVERED')
      const failedDeliveries = orders.filter((o) => o.deliveryStatus === 'DELIVERY_FAILED')
      const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED' || o.deliveryStatus === 'CANCELLED')
      const returnedOrders = orders.filter((o) => o.deliveryStatus === 'RETURNED' || o.deliveryStatus === 'RETURN_REQUESTED')
      const receivedSalesOrders = orders.filter(isFullyReceivedSale)

      const dailySuccessfulOrders = receivedSalesOrders.filter((order) => new Date(order.createdAt) >= startOfToday)
      const grossSalesIncome = Number(dailyPosSalesAggregate._sum.total || 0)
      const successfulOrderIncome = receivedSalesOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
      const dailySuccessfulOrderIncome = dailySuccessfulOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
      const reportGrossSalesIncome = Number(reportPosSalesAggregate._sum.total || 0)
      const totalIncome = reportGrossSalesIncome + successfulOrderIncome
      const dailyTotalIncome = grossSalesIncome + dailySuccessfulOrderIncome
      const salesStockReleases = releases.filter((release) => release.request?.source === 'INTERNAL_SALES')

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
          totalSalesRevenue: grossSalesIncome,
          grossSalesIncome,
          completedSalesCount: dailyCompletedSalesCount,
          dailyTotalIncome,
          dailySuccessfulOrdersCount: dailySuccessfulOrders.length,
          reportGrossSalesIncome,
          reportCompletedSalesCount,
          successfulOrdersCount: receivedSalesOrders.length,
          successfulOrderIncome,
          totalIncome,
          releasesHandedOver: salesStockReleases.filter((r) => r.receivedBySalesId).length,
          releasesPendingHandover: salesStockReleases.filter((r) => !r.receivedBySalesId).length,
        },
        orders,
        sales,
        successfulOrders: receivedSalesOrders,
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

      const [users, bookings, projects, technicianReports, activities, materialUsages, inventory, orders, sales, requests, releases, movements] = await Promise.all([
        prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'TECH', 'SALES', 'WAREHOUSE', 'RIDER'] }, ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, email: true, role: true, status: true, approved: true, createdAt: true },
        }),
        prisma.booking.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { createdAt: 'desc' },
          include: {
            client: { select: { name: true, email: true } },
            assignedTo: { select: { name: true } },
            project: { select: { id: true, status: true, createdAt: true, updatedAt: true } },
          },
        }),
        prisma.project.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { updatedAt: 'desc' },
          include: { booking: { select: { title: true, status: true } }, assignments: { include: { tech: { select: { name: true } } } } },
        }),
        prisma.report.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { name: true, role: true } }, booking: { select: { title: true, status: true } } },
        }),
        prisma.technicianActivity.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { createdAt: 'desc' },
          include: { tech: { select: { name: true } }, booking: { select: { title: true } } },
        }),
        prisma.projectMaterialUsage.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { createdAt: 'desc' },
          include: { booking: { select: { title: true } }, inventoryItem: { select: { name: true, unit: true } }, tech: { select: { name: true } } },
        }),
        prisma.inventoryItem.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { name: 'asc' },
          select: { id: true, name: true, sku: true, category: true, quantity: true, reorderLevel: true, unit: true, buyPrice: true, sellPrice: true, updatedAt: true },
        }),
        prisma.order.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { createdAt: 'desc' },
          include: { client: { select: { name: true, email: true } }, assignedRider: { select: { name: true } }, items: true, warehouseRequest: { select: { status: true } } },
        }),
        prisma.salesSale.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { name: true } }, items: true },
        }),
        prisma.warehouseRequest.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { createdAt: 'desc' },
          include: { requester: { select: { name: true, role: true } }, items: { include: { inventoryItem: { select: { name: true, sku: true, unit: true } } } }, releases: { select: { id: true, receiptNumber: true, createdAt: true } } },
        }),
        prisma.warehouseRelease.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { createdAt: 'desc' },
          include: { releasedBy: { select: { name: true } }, salesRecipient: { select: { name: true } }, request: { select: { reference: true, source: true } }, items: { include: { requestItem: { include: { inventoryItem: { select: { name: true, sku: true, unit: true } } } } } } },
        }),
        prisma.inventoryMovement.findMany({
          where: hasDateFilter ? { createdAt: dateFilter } : undefined,
          orderBy: { createdAt: 'desc' },
          include: { inventoryItem: { select: { name: true, sku: true, unit: true } }, worker: { select: { name: true, role: true } } },
        }),
      ])

      const activeUsers = users.filter((item) => item.status === 'ACTIVE' && item.approved)
      const lowStockItems = inventory.filter((item) => item.quantity <= item.reorderLevel)
      const completedProjects = projects.filter((item) => item.status === 'COMPLETED')
      const deliveredOrders = orders.filter((item) => item.deliveryStatus === 'DELIVERED')
      const completedBookings = bookings.filter((item) => item.status === 'COMPLETED')
      const successfulOrders = orders.filter(isFullyReceivedSale)
      const totalSalesRevenue = sales.reduce((total, sale) => total + Number(sale.total || 0), 0) + successfulOrders.reduce((total, order) => total + Number(order.total || 0), 0)
      const inventoryValue = inventory.reduce((total, item) => total + item.quantity * Number(item.buyPrice || 0), 0)

      return res.status(200).json({
        department: 'ADMIN',
        dateRange: { start: startDateStr || null, end: endDateStr || null },
        summary: {
          totalWorkers: users.length,
          activeWorkers: activeUsers.length,
          totalBookings: bookings.length,
          completedBookings: completedBookings.length,
          totalProjects: projects.length,
          completedProjects: completedProjects.length,
          totalOrders: orders.length,
          deliveredOrders: deliveredOrders.length,
          totalSales: sales.length,
          totalSalesRevenue,
          inventoryCount: inventory.length,
          lowStockCount: lowStockItems.length,
          inventoryValue,
          requestCount: requests.length,
          releaseCount: releases.length,
          movementCount: movements.length,
          technicianReportCount: technicianReports.length,
          activityCount: activities.length,
          materialUsageCount: materialUsages.length,
        },
        users,
        bookings,
        projects,
        technicianReports,
        activities,
        materialUsages,
        inventory,
        lowStockItems,
        orders,
        sales,
        requests,
        releases,
        movements,
      })
    }

    return res.status(400).json({ error: 'Invalid department requested' })
  } catch (error: any) {
    console.error('Department reports error:', error)
    return res.status(500).json({ error: error.message || 'Failed to generate report' })
  }
}
