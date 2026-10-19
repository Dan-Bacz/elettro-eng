import { PrismaClient } from '@prisma/client'
import { getSessionUser, getTokenFromRequest } from '../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = getTokenFromRequest(req)
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  const session = await getSessionUser(token)
  if (!session) return res.status(401).json({ error: 'Invalid session' })
  if (session.status !== 'ACTIVE') return res.status(403).json({ error: 'Forbidden' })

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: String(req.query.id) },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        assignedTo: { select: { id: true, name: true, email: true, phone: true, specialization: true, profileImageUrl: true } },
        technicianActivities: {
          orderBy: { createdAt: 'desc' },
          include: { tech: { select: { id: true, name: true, email: true } } }
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true, email: true } } }
        },
        project: {
          include: {
            assignments: { include: { tech: { select: { id: true, name: true, email: true } } } }
          }
        }
      }
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (session.role === 'CLIENT') {
      const client = await prisma.user.findUnique({
        where: { id: session.id },
        select: { emailVerifiedAt: true },
      })
      if (!client?.emailVerifiedAt || booking.clientId !== session.id) {
        return res.status(404).json({ error: 'Booking not found' })
      }
    } else if (session.role === 'TECH') {
      const isAssigned = booking.assignedToId === session.id ||
        booking.project?.assignments.some((assignment) => assignment.techId === session.id)
      if (!isAssigned) return res.status(403).json({ error: 'Forbidden' })
    }
    return res.json(booking)
  } catch (error: any) {
    console.error('Booking detail error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}