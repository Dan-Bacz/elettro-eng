import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).end()

  const authorization = req.headers.authorization || ''
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : req.cookies?.token
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }

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
        }
      }
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    return res.json(booking)
  } catch (error: any) {
    console.error('Booking detail error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}