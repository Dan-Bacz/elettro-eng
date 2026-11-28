import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../../lib/auth'
import { isProfilePhotoDataUrl } from '../../lib/profile-photo-data'
import { MAX_REPORT_PHOTOS, MAX_REPORT_PHOTO_LENGTH } from '../../lib/report-photos'

const prisma = new PrismaClient()

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }

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
    payload = jwt.verify(token, getJwtSecret())
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

  if (user.role !== 'ADMIN' && user.role !== 'TECH') return res.status(403).json({ error: 'Forbidden' })

  if (req.method === 'GET') {
    try {
      const reports = await prisma.report.findMany({
        where: user.role === 'TECH' ? {
          booking: {
            OR: [
              { assignedToId: user.id },
              { project: { is: { assignments: { some: { techId: user.id } } } } },
            ],
          },
        } : {},
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
          booking: { select: { id: true, title: true, status: true, clientId: true, assignedToId: true } }
        }
      })

      const activities = await prisma.technicianActivity.findMany({
        where: user.role === 'TECH' ? {
          booking: {
            OR: [
              { assignedToId: user.id },
              { project: { is: { assignments: { some: { techId: user.id } } } } },
            ],
          },
        } : {},
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
      const { bookingId, content, progress, workDone, issues, nextWork, photos = [], checklist, completeProject } = req.body
      if (!bookingId || !content) {
        return res.status(400).json({ error: 'Booking and content are required' })
      }
      if (!Array.isArray(photos) || photos.length > MAX_REPORT_PHOTOS || photos.some((photo) =>
        typeof photo !== 'string' || photo.length > MAX_REPORT_PHOTO_LENGTH || !isProfilePhotoDataUrl(photo))) {
        return res.status(400).json({ error: 'Attach up to three valid photos.' })
      }
      const completing = completeProject === true
      if (!completing && user.role === 'TECH' && photos.length === 0) {
        return res.status(400).json({ error: 'Capture at least one progress photo before submitting the report.' })
      }
      if (completing && (photos.length === 0 || Number(progress ?? 0) !== 0)) {
        return res.status(400).json({ error: 'Capture at least one final result photo to complete the project.' })
      }

      const booking = await prisma.booking.findUnique({
        where: { id: String(bookingId) },
        select: { id: true, clientId: true, assignedToId: true, title: true }
      })

      if (!booking) return res.status(404).json({ error: 'Booking not found' })

      if (user.role === 'TECH' && booking.assignedToId !== user.id) {
        const isMember = await prisma.projectAssignment.findFirst({
          where: { project: { bookingId: booking.id }, techId: user.id }
        })
        if (!isMember) {
          return res.status(403).json({ error: 'You can only report on your assigned projects' })
        }
      }

      const normalizedChecklist = Array.isArray(checklist)
        ? checklist
            .map((item: any) => ({
              id: String(item?.id || '').slice(0, 80),
              text: String(item?.text || '').trim().slice(0, 300),
              checked: item?.checked === true,
              status: item?.status === 'COMPLETED' || item?.checked === true ? 'COMPLETED' : 'IN_PROGRESS',
            }))
            .filter((item: { text: string }) => item.text)
            .slice(0, 50)
        : []
      const workDetails = normalizedChecklist.length > 0
        ? JSON.stringify({ summary: String(workDone || '').trim().slice(0, 2000), checklist: normalizedChecklist })
        : (workDone || null)

      const increment = progress != null ? Number(progress) : 0
      if (!Number.isInteger(increment) || increment < 0 || increment > 100) {
        return res.status(400).json({ error: 'Progress addition must be a whole number from 0 to 100.' })
      }

      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.booking.findUnique({
          where: { id: booking.id },
          select: { status: true },
        })
        if (!current || current.status === 'COMPLETED' || (user.role === 'TECH' && current.status === 'CANCELLED')) {
          return { error: 'This project is closed.' }
        }
        const latestReport = await tx.report.findFirst({
          where: { bookingId: booking.id },
          orderBy: { createdAt: 'desc' },
          select: { progress: true },
        })
        const currentProgress = latestReport?.progress ?? 0
        const nextProgress = currentProgress + increment
        if (completing && currentProgress !== 100) {
          return { error: 'Submit progress reports until the project reaches 100% before completing it.' }
        }
        if (nextProgress > 100) {
          return { error: `Progress cannot exceed 100%. Current progress is ${currentProgress}%. Add ${100 - currentProgress}% or less.` }
        }

        const newReport = await tx.report.create({
          data: {
            authorId: user.id,
            bookingId: booking.id,
            content: String(content),
            progress: completing || progress != null ? nextProgress : null,
            workDone: workDetails,
            issues: issues || null,
            nextWork: nextWork || null,
            photoUrls: photos.length ? JSON.stringify(photos) : null
          },
          include: {
            author: { select: { id: true, name: true } },
            booking: { select: { id: true, title: true } }
          }
        })

        const status = completing ? 'COMPLETED' : progress != null && nextProgress > 0 ? 'IN_PROGRESS' : current.status
        if (status !== current.status) {
          await tx.booking.update({ where: { id: booking.id }, data: { status } })
          await tx.project.updateMany({ where: { bookingId: booking.id }, data: { status } })
        }
        return { report: newReport }
      }, { isolationLevel: 'Serializable' })
      if (!result.report) return res.status(400).json({ error: result.error })

      // Notify admins about a new technician progress report
      try {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
        if (admins.length) {
          await prisma.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              type: 'REPORT',
              title: completing ? 'Final Project Results' : 'New Progress Report',
              message: `${user.name} submitted ${completing ? 'final results' : 'a progress report'} for "${booking.title}".`,
              link: `/admin/projects/${booking.id}`
            }))
          })
        }

        await prisma.notification.create({
          data: {
            userId: booking.clientId,
            type: 'BOOKING',
            title: completing ? 'Service Completed' : 'Service Progress Updated',
            message: completing ? `Your booking "${booking.title}" is complete.` : `A progress report was added to your booking "${booking.title}".`,
            link: `/client/dashboard#booking-${booking.id}`,
          },
        })
      } catch (error) {
        console.error('Failed to send report notifications', error)
      }

      return res.status(201).json(result.report)
    } catch (error: any) {
      if (error.code === 'P2034') return res.status(409).json({ error: 'Another update was submitted. Refresh the job before trying again.' })
      return res.status(500).json({ error: error.message || 'Failed to create report' })
    }
  }

  return res.status(405).end()
}
