import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

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

  const authorization = req.headers.authorization || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : req.cookies?.token
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  let userId: string | undefined
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId?: string }
    userId = payload.userId
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }

  try {
    const [bookings, inventory, users, projects, admin, recentNotifications, pendingLeaves, activeLeaves, activities, orders] = await Promise.all([
      prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          reports: { select: { progress: true, content: true, createdAt: true } },
          project: {
            include: { assignments: { include: { tech: { select: { id: true, name: true, email: true } } } } }
          }
        }
      }),
      prisma.inventoryItem.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'TECH', 'CLIENT'] } },
        select: { id: true, name: true, email: true, role: true, phone: true, approved: true, status: true, createdAt: true, specialization: true, yearsOfExperience: true, skills: true, profileImageUrl: true }
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
              reports: { select: { progress: true } },
              client: { select: { id: true, name: true, email: true, phone: true } }
            }
          },
          assignments: { include: { tech: { select: { id: true, name: true, email: true } } } }
        }
      }),
      userId ? prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }) : null,
      userId
        ? prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 })
        : [],
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

    const stats = {
      totalBookings: bookings.length,
      pending: bookings.filter((b) => b.status === 'PENDING').length,
      approved: bookings.filter((b) => b.status === 'APPROVED').length,
      assigned: bookings.filter((b) => b.status === 'ASSIGNED').length,
      inProgress: bookings.filter((b) => b.status === 'IN_PROGRESS').length,
      completed: bookings.filter((b) => b.status === 'COMPLETED').length,
      totalInventory: inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      lowStock: inventory.filter((item) => Number(item.quantity || 0) <= 10).length,
      technicians: activeTechs.length,
      pendingRegistrations: pendingRegs.length,
      suspendedTechnicians: suspendedTechs.length,
      rejectedTechnicians: rejectedTechs.length,
      clients: users.filter((user) => user.role === 'CLIENT').length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
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
      value: bookings.filter((b) => b.status === status).length
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

    // Technician status distribution.
    const technicianStatus = {
      active: activeTechs.filter((t) => !onLeaveTechIds.has(t.id)).length,
      onLeave: onLeaveTechIds.size,
      suspended: suspendedTechs.length,
      inactive: rejectedTechs.length + pendingRegs.filter((t) => !t.approved && t.status === 'PENDING').length,
    }

    // Recent projects with real progress (max report progress, else status-based).
    const recentProjects = projects.slice(0, 6).map((p) => {
      const reportProgress = Math.max(0, ...(p.booking?.reports || []).map((r) => Number(r.progress || 0)))
      const statusProgressMap: Record<string, number> = { APPROVED: 15, ASSIGNED: 30, IN_PROGRESS: 65, COMPLETED: 100, CANCELLED: 100, PENDING: 5 }
      const progress = reportProgress > 0 ? reportProgress : statusProgressMap[p.status || ''] || 5
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
      progress: b.status === 'COMPLETED' ? 100 : b.status === 'IN_PROGRESS' ? 65 : b.status === 'ASSIGNED' ? 30 : b.status === 'APPROVED' ? 15 : 5,
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