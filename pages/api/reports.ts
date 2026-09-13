import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

function getToken(req: any) {
  const authorization = req.headers.authorization || ''
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) return authorization.slice(7)
  return req.cookies?.token || null
}

async function requireUser(req: any, res: any) {
  const token = getToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  let payload: any
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }
  const user = await prisma.user.findUnique({ where: { id: String(payload.userId) } })
  if (!user || user.status !== 'ACTIVE') return res.status(401).json({ error: 'Invalid session' })
  return user
}

export default async function handler(req: any, res: any) {
  const user = await requireUser(req, res)
  if (!user) return

  if (req.method === 'GET') {
    try {
      const reports = await prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
          booking: { select: { id: true, title: true, status: true, clientId: true, assignedToId: true } }
        }
      })
      const activities = await prisma.technicianActivity.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          tech: { select: { id: true, name: true, email: true } },
          booking: { select: { id: true, title: true, status: true } }
        }
      })
      return res.json({ reports, activities })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch reports' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { bookingId, content, progress, workDone, issues, nextWork, photoUrls } = req.body
      if (!bookingId || !content) {
        return res.status(400).json({ error: 'Booking and content are required' })
      }
      const booking = await prisma.booking.findUnique({ where: { id: String(bookingId) }, select: { id: true, assignedToId: true, title: true } })
      if (!booking) return res.status(404).json({ error: 'Booking not found' })
      if (user.role === 'TECH' && booking.assignedToId !== user.id) {
        return res.status(403).json({ error: 'You can only report on your assigned projects' })
      }

      const newReport = await prisma.report.create({
        data: {
          authorId: user.id,
          bookingId: booking.id,
          content: String(content),
          progress: progress != null ? Math.max(0, Math.min(100, Math.round(Number(progress)))) : null,
          workDone: workDone || null,
          issues: issues || null,
          nextWork: nextWork || null,
          photoUrls: photoUrls || null
        },
        include: {
          author: { select: { id: true, name: true } },
          booking: { select: { id: true, title: true } }
        }
      })

      // Optionally auto-update booking progress toward IN_PROGRESS
      if (progress != null && Number(progress) > 0) {
        const current = await prisma.booking.findUnique({ where: { id: booking.id }, select: { status: true } })
        if (current && current.status !== 'COMPLETED' && current.status !== 'IN_PROGRESS') {
          await prisma.booking.update({ where: { id: booking.id }, data: { status: 'IN_PROGRESS' } }).catch(() => {})
        }
      }

      // Notify admins about a new technician progress report
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: 'REPORT',
            title: 'New Progress Report',
            message: `${user.name} submitted a progress report for "${booking.title}".`,
            link: '/admin/projects'
          }))
        })
      }

      return res.status(201).json(newReport)
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to create report' })
    }
  }

  return res.status(405).end()
}