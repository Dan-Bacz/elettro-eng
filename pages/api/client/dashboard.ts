import type { NextApiRequest, NextApiResponse } from 'next'
import { requireVerifiedClient } from '../../../lib/client-auth'
import { prisma } from '../../../lib/prisma'

function reference(prefix: 'ELT' | 'ORD', id: string) {
  return `${prefix}-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')

  try {
    const client = await requireVerifiedClient(req, res)
    if (!client) return

    const [bookings, orders, notifications] = await Promise.all([
      prisma.booking.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { id: true, name: true } },
          project: {
            include: {
              assignments: { include: { tech: { select: { id: true, name: true } } } },
            },
          },
          technicianActivities: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
          reports: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
        },
      }),
      prisma.order.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: 'desc' },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      }),
      prisma.notification.findMany({
        where: { userId: client.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const pendingBookings = bookings.filter((booking) => booking.status === 'PENDING').length
    const activeBookings = bookings.filter((booking) =>
      ['APPROVED', 'ASSIGNED', 'IN_PROGRESS'].includes(booking.status),
    ).length
    const awaitingOrders = orders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status)).length

    return res.status(200).json({
      user: client,
      counts: {
        bookings: bookings.length,
        pendingBookings,
        activeBookings,
        orders: orders.length,
        awaitingOrders,
      },
      bookings: bookings.map((booking) => ({
        ...booking,
        reference: reference('ELT', booking.id),
        assignedTechnicians: Array.from(new Map(
          [
            booking.assignedTo,
            ...(booking.project?.assignments.map((assignment) => assignment.tech) ?? []),
          ]
            .filter((technician): technician is { id: string; name: string } => technician !== null)
            .map((technician) => [technician.id, technician]),
        ).values()),
        latestUpdate: [
          booking.technicianActivities[0]
            ? { message: 'A technician activity was recorded for this booking.', createdAt: booking.technicianActivities[0].createdAt }
            : null,
          booking.reports[0]
            ? { message: 'A technician progress report was added to this booking.', createdAt: booking.reports[0].createdAt }
            : null,
        ]
          .filter((update): update is { message: string; createdAt: Date } => update !== null)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
      })),
      orders: orders.map((order) => ({ ...order, reference: reference('ORD', order.id) })),
      notifications,
    })
  } catch (error) {
    console.error('Client dashboard failed:', error)
    return res.status(500).json({ error: 'Could not load your dashboard. Please try again later.' })
  }
}
