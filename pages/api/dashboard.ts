import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const authorization = req.headers.authorization || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : req.cookies?.token
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }

  try {
    const [bookings, inventory, users] = await Promise.all([
      prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } }
        }
      }),
      prisma.inventoryItem.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'TECH', 'CLIENT'] } },
        select: { id: true, name: true, email: true, role: true }
      })
    ])

    const stats = {
      totalBookings: bookings.length,
      pending: bookings.filter((b) => b.status === 'PENDING').length,
      approved: bookings.filter((b) => b.status === 'APPROVED').length,
      assigned: bookings.filter((b) => b.status === 'ASSIGNED').length,
      inProgress: bookings.filter((b) => b.status === 'IN_PROGRESS').length,
      completed: bookings.filter((b) => b.status === 'COMPLETED').length,
      totalInventory: inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      lowStock: inventory.filter((item) => Number(item.quantity || 0) <= 10).length,
      technicians: users.filter((user) => user.role === 'TECH').length,
      clients: users.filter((user) => user.role === 'CLIENT').length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
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

    const recentBookings = bookings.slice(0, 5).map((booking) => ({
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
      inventory,
      technicians: users.filter((u) => u.role === 'TECH'),
      clients: users.filter((u) => u.role === 'CLIENT'),
      admins: users.filter((u) => u.role === 'ADMIN')
    })
  } catch (error) {
    console.error('dashboard summary error:', error)
    return res.status(500).json({ error: 'Failed to load dashboard data' })
  }
}
