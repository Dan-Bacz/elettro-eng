import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { sendLeaveDecisionNotification } from '../../../lib/email'

const prisma = new PrismaClient()

function getToken(req: any) {
  const authorization = req.headers.authorization || ''
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) return authorization.slice(7)
  return req.cookies?.token || null
}

async function requireAdmin(req: any, res: any) {
  const token = getToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  let payload: any
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }
  const user = await prisma.user.findUnique({ where: { id: String(payload.userId) } })
  if (!user || user.status !== 'ACTIVE' || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  return user
}

async function notifyUser(userId: string, type: string, title: string, message: string, link?: string) {
  try {
    await prisma.notification.create({ data: { userId, type, title, message, link } })
  } catch (e) {
    console.error('Failed to create notification', e)
  }
}

function humanizeType(type: string) {
  return String(type || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c: string) => c.toUpperCase())
}

function formatDate(d: any) {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '-'
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

export default async function handler(req: any, res: any) {
  const admin = await requireAdmin(req, res)
  if (!admin) return

  if (req.method === 'GET') {
    try {
      const [leaves, techs] = await Promise.all([
        prisma.leaveRequest.findMany({
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          include: { tech: { select: { id: true, name: true, email: true } } }
        }),
        prisma.user.findMany({
          where: { role: 'TECH', status: 'ACTIVE' },
          select: { id: true, name: true, email: true }
        })
      ])

      // Ensure every tech has leave credits (default 15 vacation / 15 sick).
      await Promise.all(techs.map(t =>
        prisma.leaveCredits.upsert({
          where: { techId: t.id },
          create: { techId: t.id, vacation: 15, sick: 15 },
          update: {}
        })
      ))

      const credits = await prisma.leaveCredits.findMany({
        where: { techId: { in: techs.map(t => t.id) } },
        include: { tech: { select: { id: true, name: true, email: true } } }
      })

      return res.json({ leaves, credits })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, leaveId, note } = req.body
      if (!['approve', 'reject'].includes(String(action || ''))) {
        return res.status(400).json({ error: 'Unknown action.' })
      }
      if (!leaveId) return res.status(400).json({ error: 'Leave ID is required.' })

      const leave = await prisma.leaveRequest.findUnique({
        where: { id: String(leaveId) },
        include: { tech: { select: { id: true, name: true, email: true } } }
      })
      if (!leave) return res.status(404).json({ error: 'Leave request not found.' })
      if (leave.status !== 'PENDING') {
        return res.status(400).json({ error: `This request is already ${leave.status.replace('_', ' ').toLowerCase()}.` })
      }

      const adminNote = String(note || '').trim() || null
      const decidedBy = admin.name

      if (action === 'approve') {
        // Vacation and Sick leave consume earned credits (CSC Form No. 6).
        if ((leave.type === 'VACATION' || leave.type === 'SICK') && leave.days > 0) {
          const credits = await prisma.leaveCredits.upsert({
            where: { techId: leave.techId },
            create: { techId: leave.techId, vacation: 15, sick: 15 },
            update: {}
          })
          const kind = leave.type === 'VACATION' ? 'vacation' : 'sick'
          const total = leave.type === 'VACATION' ? credits.vacation : credits.sick
          const used = leave.type === 'VACATION' ? credits.vacationUsed : credits.sickUsed
          const available = total - used
          if (leave.days > available) {
            return res.status(400).json({
              error: `Insufficient ${kind} leave credits. ${leave.tech.name} has ${available} of ${total} ${kind} day(s) available but requested ${leave.days}.`
            })
          }
          if (leave.type === 'VACATION') {
            await prisma.leaveCredits.update({
              where: { techId: leave.techId },
              data: { vacationUsed: used + leave.days }
            })
          } else {
            await prisma.leaveCredits.update({
              where: { techId: leave.techId },
              data: { sickUsed: used + leave.days }
            })
          }
        }

        await prisma.leaveRequest.update({
          where: { id: leave.id },
          data: { status: 'APPROVED', adminNote, decidedBy, decidedAt: new Date(), approvedDays: leave.days }
        })

        await notifyUser(
          leave.techId,
          'LEAVE',
          'Leave Approved',
          `Your ${humanizeType(leave.type)} leave (${leave.days} day(s), ${formatDate(leave.fromDate)} to ${formatDate(leave.toDate)}) has been approved.`,
          '/technician/dashboard'
        )
        await sendLeaveDecisionNotification({
          name: leave.tech.name,
          email: leave.tech.email,
          typeLabel: humanizeType(leave.type),
          fromDate: formatDate(leave.fromDate),
          toDate: formatDate(leave.toDate),
          days: leave.days,
          status: 'APPROVED',
          note: adminNote
        })

        return res.json({ success: true, status: 'APPROVED' })
      }

      // reject
      await prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: 'REJECTED', adminNote, decidedBy, decidedAt: new Date() }
      })

      await notifyUser(
        leave.techId,
        'LEAVE',
        'Leave Rejected',
        `Your ${humanizeType(leave.type)} leave (${leave.days} day(s), ${formatDate(leave.fromDate)} to ${formatDate(leave.toDate)}) was not approved.${adminNote ? ` Reason: ${adminNote}` : ''}`,
        '/technician/dashboard'
      )
      await sendLeaveDecisionNotification({
        name: leave.tech.name,
        email: leave.tech.email,
        typeLabel: humanizeType(leave.type),
        fromDate: formatDate(leave.fromDate),
        toDate: formatDate(leave.toDate),
        days: leave.days,
        status: 'REJECTED',
        note: adminNote
      })

      return res.json({ success: true, status: 'REJECTED' })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}