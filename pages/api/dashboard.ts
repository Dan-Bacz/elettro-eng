import { PrismaClient } from '@prisma/client'
import { getSessionUser, getTokenFromRequest } from '../../lib/auth'

const prisma = new PrismaClient()
const TREND_DAYS = 30

const FLOW_LABELS: Record<string, string> = {
  PENDING: 'Booking Received',
  APPROVED: 'Verified',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
}

function dayKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function classifyService(title: string): string {
  const t = (title || '').toLowerCase()
  if (t.includes('install')) return 'Installation'
  if (t.includes('mainten')) return 'Maintenance'
  if (t.includes('inspect')) return 'Inspection'
  if (t.includes('repair') || t.includes('fault') || t.includes('outage') || t.includes('short circuit')) return 'Repair'
  return 'Other'
}

function stockStatus(item: { quantity: number; reorderLevel?: number | null }) {
  const qty = Number(item.quantity || 0)
  const level = item.reorderLevel != null ? Number(item.reorderLevel) : 10
  if (qty <= 0) return 'Out of Stock'
  if (qty <= level) return 'Low Stock'
  return 'In Stock'
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = getTokenFromRequest(req)
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  const session = await getSessionUser(token)
  if (!session) return res.status(401).json({ error: 'Invalid session' })
  if (session.role !== 'ADMIN' || session.status !== 'ACTIVE') return res.status(403).json({ error: 'Forbidden' })

  try {
    const [bookings, inventory, users, projects, admin, recentNotifications, pendingLeaves, activeLeaves, activities, orders, allNotifications, recentSales, recentWarehouseRequests, recentWarehouseReleases, recentMovements, recentUsers] = await Promise.all([
      prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          reports: { orderBy: { createdAt: 'desc' }, select: { progress: true, content: true, createdAt: true } },
          project: {
            include: { assignments: { include: { tech: { select: { id: true, name: true, email: true } } } } }
          }
        }
      }),
      prisma.inventoryItem.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'TECH', 'CLIENT', 'SALES', 'WAREHOUSE'] } },
        select: { id: true, name: true, email: true, role: true, phone: true, address: true, approved: true, status: true, available: true, emailVerifiedAt: true, createdAt: true, specialization: true, yearsOfExperience: true, skills: true, profileImageUrl: true }
      }),
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              startDate: true,
              endDate: true,
              budget: true,
              reports: { orderBy: { createdAt: 'desc' }, select: { progress: true, createdAt: true } },
              client: { select: { id: true, name: true, email: true, phone: true } }
            }
          },
          assignments: { include: { tech: { select: { id: true, name: true, email: true } } } }
        }
      }),
      prisma.user.findUnique({ where: { id: session.id }, select: { name: true, email: true } }),
      prisma.notification.findMany({ where: { userId: session.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.leaveRequest.findMany({ where: { status: 'APPROVED' }, select: { techId: true, fromDate: true, toDate: true } }),
      prisma.technicianActivity.findMany({ where: { createdAt: { gte: new Date(Date.now() - 6 * 86400000) } }, select: { createdAt: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
          client: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { user: { select: { name: true, role: true } } },
      }),
      prisma.salesSale.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { createdBy: { select: { name: true } }, items: { select: { name: true, quantity: true } } },
      }),
      prisma.warehouseRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, reference: true, source: true, status: true, createdAt: true, requester: { select: { name: true } } },
      }),
      prisma.warehouseRelease.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, receiptNumber: true, createdAt: true, receivedBySalesAt: true, releasedBy: { select: { name: true } }, request: { select: { reference: true } } },
      }),
      prisma.inventoryMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, type: true, quantity: true, reason: true, createdAt: true, worker: { select: { name: true } }, inventoryItem: { select: { name: true } } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, name: true, role: true, status: true, createdAt: true },
      }),
    ])

    const techUsers = users.filter((user) => user.role === 'TECH')
    const activeTechs = techUsers.filter((user) => user.status === 'ACTIVE' || (user as any).approved)
    const pendingRegs = techUsers.filter((user) => user.status === 'PENDING' || (!(user as any).approved && user.status !== 'REJECTED' && user.status !== 'SUSPENDED'))
    const suspendedTechs = techUsers.filter((user) => user.status === 'SUSPENDED')
    const rejectedTechs = techUsers.filter((user) => user.status === 'REJECTED')

    // Technicians currently on approved leave (leave spans today).
    const today = new Date()
    const onLeaveTechIds = new Set(
      activeLeaves
        .filter((l) => l.fromDate <= today && l.toDate >= today)
        .map((l) => l.techId)
    )

    // Approved requests are now represented in Projects. Keep booking metrics
    // focused on requests that have not yet entered the project lifecycle.
    const bookingRequests = bookings.filter((booking) => !booking.project)
    const stats = {
      totalBookings: bookingRequests.length,
      pending: bookingRequests.filter((b) => b.status === 'PENDING').length,
      approved: bookingRequests.filter((b) => b.status === 'APPROVED').length,
      assigned: bookingRequests.filter((b) => b.status === 'ASSIGNED').length,
      inProgress: bookingRequests.filter((b) => b.status === 'IN_PROGRESS').length,
      completed: bookingRequests.filter((b) => b.status === 'COMPLETED').length,
      totalInventory: inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      lowStock: inventory.filter((item) => Number(item.quantity || 0) <= 10).length,
      technicians: activeTechs.length,
      pendingRegistrations: pendingRegs.length,
      suspendedTechnicians: suspendedTechs.length,
      rejectedTechnicians: rejectedTechs.length,
      clients: users.filter((user) => user.role === 'CLIENT').length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
      sales: users.filter((user) => user.role === 'SALES' && user.status === 'ACTIVE').length,
      warehouse: users.filter((user) => user.role === 'WAREHOUSE' && user.status === 'ACTIVE').length,
      pendingLeaves,
      onLeave: onLeaveTechIds.size,
    }

    const statusBreakdown = [
      'PENDING',
      'APPROVED',
      'ASSIGNED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    ].map((status) => ({
      status,
      value: bookingRequests.filter((b) => b.status === status).length
    }))

    // Booking trend: bookings created per day for the last 30 days.
    const trendBuckets: Record<string, number> = {}
    const now = new Date()
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      trendBuckets[dayKey(d)] = 0
    }
    for (const b of bookings) {
      const key = dayKey(new Date(b.createdAt))
      if (key in trendBuckets) trendBuckets[key] += 1
    }
    const bookingTrend = Object.keys(trendBuckets)
      .sort()
      .map((key) => ({ date: key, count: trendBuckets[key] }))

    // Technician activity: activities per day for the last 7 days.
    const activityBuckets: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      activityBuckets[dayKey(d)] = 0
    }
    for (const a of activities) {
      const key = dayKey(new Date(a.createdAt))
      if (key in activityBuckets) activityBuckets[key] += 1
    }
    const activityTrend = Object.keys(activityBuckets)
      .sort()
      .map((key) => ({ date: key, count: activityBuckets[key] }))

    // Service breakdown derived from booking titles.
    const serviceMap: Record<string, number> = {}
    for (const b of bookings) {
      const s = classifyService(b.title || '')
      serviceMap[s] = (serviceMap[s] || 0) + 1
    }
    const serviceBreakdown = Object.keys(serviceMap).map((service) => ({ service, count: serviceMap[service] }))

    // Stock overview.
    const stockIn = inventory.filter((i) => stockStatus(i) === 'In Stock')
    const stockLow = inventory.filter((i) => stockStatus(i) === 'Low Stock')
    const stockOut = inventory.filter((i) => stockStatus(i) === 'Out of Stock')
    const stockBreakdown = [
      { status: 'In Stock', value: stockIn.length },
      { status: 'Low Stock', value: stockLow.length },
      { status: 'Out of Stock', value: stockOut.length },
    ]

    // Warehouse stock is the physical inventory balance. Sales stock is the
    // stock received by Sales from Warehouse, less completed POS quantities.
    const salesReleasedByItem = new Map<string, number>()
    const salesReleaseRows = await prisma.warehouseRelease.findMany({
      where: { receivedBySalesId: { not: null }, request: { source: 'INTERNAL_SALES' } },
      select: { items: { select: { quantity: true, requestItem: { select: { inventoryItemId: true } } } } },
    })
    for (const release of salesReleaseRows) {
      for (const line of release.items) salesReleasedByItem.set(line.requestItem.inventoryItemId, (salesReleasedByItem.get(line.requestItem.inventoryItemId) || 0) + line.quantity)
    }
    const salesSoldRows = await prisma.salesSaleItem.groupBy({ by: ['inventoryItemId'], _sum: { quantity: true } })
    const salesSoldByItem = new Map(salesSoldRows.map((row) => [row.inventoryItemId, row._sum.quantity || 0]))
    const warehouseStock = inventory.filter((item) => !item.deletedAt).map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      quantity: Number(item.quantity || 0),
      reorderLevel: item.reorderLevel,
      buyPrice: item.buyPrice,
      sellPrice: item.sellPrice,
      status: stockStatus(item),
    })).sort((a, b) => a.quantity - b.quantity)
    const salesStock = inventory.filter((item) => !item.deletedAt && salesReleasedByItem.has(item.id)).map((item) => {
      const releasedQuantity = salesReleasedByItem.get(item.id) || 0
      const soldQuantity = salesSoldByItem.get(item.id) || 0
      return { id: item.id, name: item.name, sku: item.sku, unit: item.unit, sellPrice: item.sellPrice, releasedQuantity, soldQuantity, availableQuantity: Math.max(0, releasedQuantity - soldQuantity) }
    }).sort((a, b) => a.availableQuantity - b.availableQuantity)

    const eventTimeline = [
      ...allNotifications.map((item) => ({ id: `notification-${item.id}`, type: item.type || 'INFO', title: item.title, description: item.message || 'System notification', createdAt: item.createdAt, actor: item.user?.name || 'System', href: item.link || '/admin/notifications' })),
      ...recentSales.map((sale) => ({ id: `sale-${sale.id}`, type: 'SALE', title: `Sale ${sale.reference} completed`, description: `${sale.items.reduce((sum, item) => sum + item.quantity, 0)} item(s) · ₱${Number(sale.total).toLocaleString()}`, createdAt: sale.createdAt, actor: sale.createdBy?.name || 'Sales', href: '/admin/sales' })),
      ...recentWarehouseRequests.map((request) => ({ id: `request-${request.id}`, type: 'REQUEST', title: `Material request ${request.reference}`, description: `${request.source.replace(/_/g, ' ')} · ${request.status.replace(/_/g, ' ')}`, createdAt: request.createdAt, actor: request.requester?.name || 'Team member', href: '/admin/materials-requests' })),
      ...recentWarehouseReleases.map((release) => ({ id: `release-${release.id}`, type: 'RELEASE', title: `Warehouse release ${release.receiptNumber}`, description: release.receivedBySalesAt ? 'Received by Sales' : `Released for ${release.request.reference}`, createdAt: release.receivedBySalesAt || release.createdAt, actor: release.releasedBy?.name || 'Warehouse', href: '/admin/stock-movements' })),
      ...recentMovements.map((movement) => ({ id: `movement-${movement.id}`, type: 'STOCK', title: `${movement.type.replace(/_/g, ' ')} · ${movement.inventoryItem.name}`, description: `${movement.quantity > 0 ? '+' : ''}${movement.quantity} ${movement.inventoryItem.name} · ${movement.reason || 'Stock activity'}`, createdAt: movement.createdAt, actor: movement.worker?.name || 'Warehouse', href: '/admin/stock-movements' })),
      ...recentUsers.map((user) => ({ id: `user-${user.id}`, type: 'USER', title: `${user.role} account activity`, description: `${user.name} · ${user.status}`, createdAt: user.createdAt, actor: user.name, href: '/admin/staff' })),
      ...bookings.slice(0, 20).map((booking) => ({ id: `booking-${booking.id}`, type: 'BOOKING', title: `Booking ${booking.status.toLowerCase().replace(/_/g, ' ')}`, description: `${booking.title} · ${booking.client?.name || 'Client'}`, createdAt: booking.createdAt, actor: booking.client?.name || 'Client', href: `/admin/bookings/${booking.id}` })),
      ...projects.slice(0, 20).map((project) => ({ id: `project-${project.id}`, type: 'PROJECT', title: `Project ${project.status.toLowerCase().replace(/_/g, ' ')}`, description: project.title, createdAt: project.createdAt, actor: project.booking?.client?.name || 'Project team', href: `/admin/projects/${project.booking?.id || project.id}` })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 40)

    // Technician status distribution.
    const technicianStatus = {
      active: activeTechs.filter((t) => t.available !== false && !onLeaveTechIds.has(t.id)).length,
      onLeave: onLeaveTechIds.size,
      suspended: suspendedTechs.length,
      inactive: rejectedTechs.length + pendingRegs.filter((t) => !t.approved && t.status === 'PENDING').length + activeTechs.filter((t) => t.available === false).length,
    }

    // Recent projects with real progress (max report progress, else status-based).
    const recentProjects = projects.slice(0, 6).map((p) => {
      const latestReport = p.booking?.reports?.[0]
      const statusProgressMap: Record<string, number> = { APPROVED: 15, ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 100, CANCELLED: 100, PENDING: 5 }
      const progress = latestReport?.progress != null
        ? Math.max(0, Math.min(100, Number(latestReport.progress) || 0))
        : (statusProgressMap[p.status || ''] ?? 0)
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        clientName: p.booking?.client?.name || 'Unknown client',
        progress,
        techCount: p.assignments.length,
        createdAt: p.createdAt,
        bookId: p.booking?.id,
      }
    })

    // Recent bookings (all statuses) enriched with technician + service.
    const recentBookingsAll = bookings.slice(0, 8).map((b) => ({
      id: b.id,
      title: b.title,
      service: classifyService(b.title || ''),
      status: b.status,
      clientName: b.client?.name || 'Unknown client',
      technicianName: b.assignedTo?.name || b.project?.assignments?.[0]?.tech?.name || null,
      createdAt: b.createdAt,
      progress: b.reports?.[0]?.progress != null
        ? Math.max(0, Math.min(100, Number(b.reports[0].progress) || 0))
        : b.status === 'COMPLETED' ? 100 : b.status === 'IN_PROGRESS' ? 0 : b.status === 'ASSIGNED' ? 0 : b.status === 'APPROVED' ? 15 : 5,
    }))

    // Approved bookings become projects, so the "recent bookings" widget on the
    // dashboard only surfaces incoming (pending) requests.
    const recentBookings = bookings
      .filter((b) => b.status === 'PENDING')
      .slice(0, 5)
      .map((booking) => ({
      id: booking.id,
      title: booking.title,
      status: booking.status,
      clientName: booking.client?.name || 'Unknown client',
      createdAt: booking.createdAt
    }))

    const inventoryAlerts = inventory
      .filter((item) => Number(item.quantity || 0) <= 10)
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        sku: item.sku
      }))

    return res.json({
      stats,
      statusBreakdown,
      recentBookings,
      inventoryAlerts,
      bookings,
      projects,
      inventory,
      technicians: activeTechs,
      pendingUsers: pendingRegs,
      suspendedUsers: suspendedTechs,
      rejectedUsers: rejectedTechs,
      orders: orders.map((order) => ({
        id: order.id,
        clientId: order.clientId,
        reference: `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
        clientName: order.clientName,
        email: order.email,
        phone: order.phone,
        status: order.status,
        total: order.total,
        address: order.address,
        city: order.city,
        province: order.province,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        items: order.items.map((it) => ({ id: it.id, name: it.name, quantity: it.quantity, unit: it.unit, unitPrice: it.unitPrice })),
      })),
      clients: users.filter((u) => u.role === 'CLIENT'),
      admins: users.filter((u) => u.role === 'ADMIN'),
      admin: admin ? { name: admin.name, email: admin.email } : null,
      bookingTrend,
      activityTrend,
      serviceBreakdown,
      stockBreakdown,
      stockSummary: {
        totalItems: inventory.length,
        inStock: stockIn.length,
        lowStock: stockLow.length,
        outOfStock: stockOut.length,
        totalUnits: inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        topLow: inventory
          .filter((i) => stockStatus(i) !== 'In Stock')
          .sort((a, b) => Number(a.quantity) - Number(b.quantity))
          .slice(0, 6)
          .map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, status: stockStatus(i) })),
      },
      warehouseStock,
      salesStock,
      salesStockSummary: {
        products: salesStock.length,
        availableUnits: salesStock.reduce((sum, item) => sum + item.availableQuantity, 0),
        releasedUnits: salesStock.reduce((sum, item) => sum + item.releasedQuantity, 0),
        soldUnits: salesStock.reduce((sum, item) => sum + item.soldQuantity, 0),
        value: salesStock.reduce((sum, item) => sum + item.availableQuantity * Number(item.sellPrice || 0), 0),
      },
      eventTimeline,
      flow: ['PENDING', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map((status) => ({
        status,
        label: FLOW_LABELS[status],
        count: bookings.filter((b) => b.status === status).length,
        latestAt: bookings.filter((b) => b.status === status)[0]?.createdAt || null,
      })),
      technicianStatus,
      recentProjects,
      recentBookingsAll,
      notifications: recentNotifications,
      pendingLeaves,
      flowLabels: FLOW_LABELS,
    })
  } catch (error) {
    console.error('dashboard summary error:', error)
    return res.status(500).json({ error: 'Failed to load dashboard data' })
  }
}
