import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { getJwtSecret } from '../../lib/auth'

const prisma = new PrismaClient()

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
}

function getToken(req: any) {
  const authorization = req.headers.authorization || ''
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) return authorization.slice(7)
  return req.cookies?.token || null
}

function authenticate(req: any, res: any) {
  const token = getToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    return jwt.verify(token, getJwtSecret())
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const payload = authenticate(req, res)
    if (!payload || typeof payload === 'number') return res.status(401).json({ error: 'Invalid session' })
    if (!['ADMIN', 'TECH'].includes(payload.role)) return res.status(403).json({ error: 'Forbidden' })

    const techUserId = req.query.techId || payload.userId
    if (payload.role === 'TECH' && String(techUserId) !== String(payload.userId)) return res.status(403).json({ error: 'Forbidden' })

    try {
      const [tech, bookings] = await Promise.all([
        prisma.user.findUnique({
          where: { id: String(techUserId) },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            available: true,
            approved: true,
            specialization: true,
            yearsOfExperience: true,
            skills: true,
            profileImageUrl: true
          }
        }),
        prisma.booking.findMany({
          where: {
            OR: [
              { assignedToId: String(techUserId) },
              { project: { assignments: { some: { techId: String(techUserId) } } } }
            ]
          },
          orderBy: { createdAt: 'desc' },
          include: {
            client: { select: { id: true, name: true, email: true, phone: true } },
            technicianActivities: {
              orderBy: { createdAt: 'desc' },
              include: { tech: { select: { id: true, name: true } } }
            },
            reports: {
              orderBy: { createdAt: 'desc' },
              include: { author: { select: { id: true, name: true } } }
            },
            materialRequests: {
              orderBy: { createdAt: 'desc' },
              include: {
                warehouseRequest: {
                  select: {
                    reference: true,
                    items: {
                      select: { id: true, requestedQuantity: true, unit: true, inventoryItem: { select: { name: true } } },
                    },
                  },
                },
              },
            },
            materialUsages: {
              orderBy: { createdAt: 'desc' },
              include: { inventoryItem: { select: { id: true, name: true, unit: true } }, tech: { select: { id: true, name: true } } },
            },
            project: {
              include: { assignments: { include: { tech: { select: { id: true, name: true } } } } }
            }
          }
        })
      ])

      if (!tech) return res.status(404).json({ error: 'Technician not found' })
      return res.json({ tech, bookings })
    } catch (error: any) {
      console.error('Tech API error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    const payload = authenticate(req, res)
    if (!payload || typeof payload === 'number') return res.status(401).json({ error: 'Invalid session' })
    if (!['ADMIN', 'TECH'].includes(payload.role)) return res.status(403).json({ error: 'Forbidden' })
    if (payload.status === 'SUSPENDED') return res.status(403).json({ error: 'Your account has been suspended' })

    const { techId, bookingId, message } = req.body
    if (!techId || !bookingId || !message) {
      return res.status(400).json({ error: 'techId, bookingId, and message are required' })
    }

    if (payload.role === 'TECH' && String(techId) !== String(payload.userId)) {
      return res.status(403).json({ error: 'You can only post updates for your own account' })
    }

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: String(bookingId) },
        select: { id: true, clientId: true, title: true, assignedToId: true },
      })

      if (!booking) return res.status(404).json({ error: 'Booking not found' })

      if (payload.role === 'TECH' && booking.assignedToId !== String(payload.userId)) {
        const isMember = await prisma.projectAssignment.findFirst({
          where: { project: { bookingId: booking.id }, techId: String(payload.userId) },
        })
        if (!isMember) return res.status(403).json({ error: 'You can only post updates for your assigned projects' })
      }

      const act = await prisma.technicianActivity.create({ data: { techId, bookingId, message } })

      await prisma.notification.create({
        data: {
          userId: booking.clientId,
          type: 'BOOKING',
          title: 'Service Progress Updated',
          message: `A service update was added to your booking "${booking.title}".`,
          link: `/client/dashboard#booking-${booking.id}`,
        },
      })

      return res.status(201).json(act)
    } catch (error: any) {
      console.error('Tech API error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  if (req.method === 'PATCH') {
    const payload = authenticate(req, res)
    if (!payload || typeof payload === 'number') return res.status(401).json({ error: 'Invalid session' })
    if (payload.role !== 'TECH') return res.status(403).json({ error: 'Only technicians can update their profile' })
    if (payload.status === 'SUSPENDED') return res.status(403).json({ error: 'Your account has been suspended' })

    try {
      const current = await prisma.user.findUnique({
        where: { id: String(payload.userId) },
        select: { id: true, role: true, status: true }
      })

      if (!current) return res.status(404).json({ error: 'Technician not found' })
      if (current.role !== 'TECH' || current.status !== 'ACTIVE') return res.status(403).json({ error: 'Active technician account required.' })

      const { name, profileImage, removeImage, available } = req.body || {}
      const fullName = typeof name === 'string' ? name.trim() : ''
      if (name !== undefined && (!fullName || fullName.length > 100)) {
        return res.status(400).json({ error: 'Enter a full name of up to 100 characters.' })
      }
      let profileImageUrl: string | null | undefined

      if (removeImage === true) {
        profileImageUrl = null
      } else if (profileImage !== undefined) {
        const raw = String(profileImage || '').trim()
        if (!raw) {
          profileImageUrl = null
        } else if (raw.startsWith('data:')) {
          const uploaded = await uploadToCloudinary(raw, 'technician-img')
          if (!uploaded) return res.status(502).json({ error: 'Unable to save your photo right now. Please try again.' })
          profileImageUrl = uploaded.secure_url
        } else if (/^https?:\/\//i.test(raw)) {
          profileImageUrl = raw
        } else {
          return res.status(400).json({ error: 'profileImage must be a base64 data URL or an http(s) URL' })
        }
      }

      const updated = await prisma.user.update({
        where: { id: current.id },
        data: {
          ...(name !== undefined ? { name: fullName } : {}),
          ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
          ...(typeof available === 'boolean' ? { available } : {}),
        },
        select: { id: true, name: true, profileImageUrl: true, available: true }
      })

      return res.json({ success: true, ...updated })
    } catch (error: any) {
      console.error('Tech API error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  return res.status(405).end()
}
