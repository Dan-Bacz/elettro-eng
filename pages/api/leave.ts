import { PrismaClient, LeaveType } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

const LEAVE_TYPES: Record<string, LeaveType> = {
  VACATION: 'VACATION',
  SICK: 'SICK',
  MATERNITY: 'MATERNITY',
  PATERNITY: 'PATERNITY',
  SOLO_PARENT: 'SOLO_PARENT',
  SPECIAL_PRIVILEGE: 'SPECIAL_PRIVILEGE',
  STUDY: 'STUDY',
  VAWC: 'VAWC',
  REHABILITATION: 'REHABILITATION',
  SPECIAL_EMERGENCY: 'SPECIAL_EMERGENCY',
  OTHER: 'OTHER',
}

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

// Number of working days (Mon-Fri) between two dates, inclusive.
function countWorkingDays(from: Date, to: Date) {
  let total = 0
  const cursor = new Date(from)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)
  while (cursor <= end) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) total++
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.max(1, total)
}

async function notifyAdmins(type: string, title: string, message: string, link: string) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true }
    })
    await prisma.notification.createMany({
      data: admins.map(a => ({ userId: a.id, type, title, message, link }))
    })
  } catch (e) {
    console.error('Failed to notify admins', e)
  }
}

export default async function handler(req: any, res: any) {
  const user = await requireUser(req, res)
  if (!user) return
  if (user.role !== 'TECH') return res.status(403).json({ error: 'Only technicians can manage leave.' })

  if (req.method === 'GET') {
    try {
      const [leaves, credits] = await Promise.all([
        prisma.leaveRequest.findMany({
          where: { techId: user.id },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.leaveCredits.upsert({
          where: { techId: user.id },
          create: { techId: user.id, vacation: 15, sick: 15 },
          update: {}
        })
      ])
      return res.json({ credits, leaves })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { type, from, to, commutation, addressDuringLeave, medicalCertificate, reason } = req.body
      const leaveType = LEAVE_TYPES[String(type || '').toUpperCase()]
      if (!leaveType) return res.status(400).json({ error: 'Type of leave is required.' })

      const fromDate = from ? new Date(String(from)) : null
      const toDate = to ? new Date(String(to)) : null
      if (!fromDate || isNaN(fromDate.getTime()) || !toDate || isNaN(toDate.getTime())) {
        return res.status(400).json({ error: 'Inclusive dates are required.' })
      }
      if (fromDate > toDate) {
        return res.status(400).json({ error: '"To" date must be on or after the "From" date.' })
      }

      const days = countWorkingDays(fromDate, toDate)
      const comm = String(commutation || 'NOT_REQUESTED').toUpperCase() === 'REQUESTED' ? 'REQUESTED' : 'NOT_REQUESTED'

      const leave = await prisma.leaveRequest.create({
        data: {
          techId: user.id,
          type: leaveType,
          fromDate,
          toDate,
          days,
          commutation: comm,
          addressDuringLeave: String(addressDuringLeave || '').trim() || null,
          medicalCertificate: Boolean(medicalCertificate),
          reason: String(reason || '').trim() || null,
        }
      })

      await notifyAdmins(
        'LEAVE',
        'New Leave Application',
        `${user.name} applied for ${days} day(s) of ${leaveType.replace('_', ' ')}.`,
        '/admin/leave'
      )

      return res.status(201).json({ success: true, leave })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}