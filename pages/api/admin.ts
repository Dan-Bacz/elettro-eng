import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sendTechnicianApprovalNotification } from '../../lib/email'

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

async function notifyUser(userId: string, type: string, title: string, message: string, link?: string) {
  try {
    await prisma.notification.create({ data: { userId, type, title, message, link } })
  } catch (e) {
    console.error('Failed to create notification', e)
  }
}

export default async function handler(req: any, res: any) {
  const user = await requireUser(req, res)
  if (!user) return

  if (req.method === 'GET') {
    if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
    try {
      const registrations = await prisma.user.findMany({
        where: { role: 'TECH' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, phone: true, approved: true, status: true, address: true, specialization: true, yearsOfExperience: true, skills: true, profileImageUrl: true, rejectionReason: true, createdAt: true }
      })
      return res.json({ registrations })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, bookingId, assignToId, status, startDate, endDate, name, email, password, role, userId, reason } = req.body

      // --- User registration lifecycle (admin only) ---

      if (action === 'approve_user' || action === 'reject_user' || action === 'suspend_user' || action === 'activate_user' || action === 'create_user' || action === 'delete_user') {
        if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
      }

      // --- Booking lifecycle: approve/assign/delete admin only; TECH may update status on assigned bookings ---

      if (action === 'approve' || action === 'assign' || action === 'delete_booking') {
        if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
      }

      if (action === 'update_status' && user.role === 'TECH') {
        const assigned = await prisma.booking.findUnique({ where: { id: bookingId }, select: { assignedToId: true } })
        if (!assigned || assigned.assignedToId !== user.id) return res.status(403).json({ error: 'Forbidden' })
      }

      if (action === 'approve_user') {
        const uid = req.body.userId
        if (!uid) return res.status(400).json({ error: 'User ID is required' })
        const user = await prisma.user.update({
          where: { id: uid },
          data: { approved: true, status: 'ACTIVE', rejectionReason: null },
          select: { id: true, name: true, email: true, role: true, approved: true, status: true }
        })
        await notifyUser(uid, 'ACCOUNT', 'Registration Approved', `Your technician account has been approved. You can now sign in and access your dashboard.`, '/technician/login')
        await sendTechnicianApprovalNotification({ name: user.name, email: user.email })
        return res.json({ success: true, user })
      }

      if (action === 'reject_user') {
        const uid = req.body.userId
        if (!uid) return res.status(400).json({ error: 'User ID is required' })
        const user = await prisma.user.update({
          where: { id: uid },
          data: { approved: false, status: 'REJECTED', rejectionReason: reason || 'Your application was not approved at this time.' },
          select: { id: true, name: true, email: true, role: true, status: true }
        })
        await notifyUser(uid, 'ACCOUNT', 'Registration Rejected', (reason || 'Your application was not approved at this time.'), '/technician/login')
        return res.json({ success: true, user })
      }

      if (action === 'suspend_user') {
        const uid = req.body.userId
        if (!uid) return res.status(400).json({ error: 'User ID is required' })
        const user = await prisma.user.update({
          where: { id: uid },
          data: { status: 'SUSPENDED' },
          select: { id: true, name: true, email: true, role: true, status: true }
        })
        await notifyUser(uid, 'ACCOUNT', 'Account Suspended', (reason || 'Your account has been suspended by an administrator.'), '/technician/login')
        return res.json({ success: true, user })
      }

      if (action === 'activate_user') {
        const uid = req.body.userId
        if (!uid) return res.status(400).json({ error: 'User ID is required' })
        const user = await prisma.user.update({
          where: { id: uid },
          data: { approved: true, status: 'ACTIVE', rejectionReason: null },
          select: { id: true, name: true, email: true, role: true, status: true }
        })
        return res.json({ success: true, user })
      }

      // --- Booking lifecycle ---

      if (action === 'approve') {
        const b = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'APPROVED' },
          include: { client: true, assignedTo: true }
        })
        return res.json(b)
      }

      if (action === 'assign') {
        const dataToUpdate: any = {
          assignedToId: assignToId || null,
          status: assignToId ? 'ASSIGNED' : 'APPROVED'
        }
        if (startDate) dataToUpdate.startDate = new Date(startDate)
        if (endDate) dataToUpdate.endDate = new Date(endDate)

        const b = await prisma.booking.update({
          where: { id: bookingId },
          data: dataToUpdate,
          include: { client: true, assignedTo: true }
        })
        if (assignToId && status) {
          await prisma.booking.update({ where: { id: bookingId }, data: { status } })
        }
        if (assignToId) {
          await notifyUser(assignToId, 'ASSIGNMENT', 'New Job Assigned', `You have been assigned to "${b.title}".`, '/technician/dashboard')
        }
        return res.json(b)
      }

      if (action === 'update_status') {
        const b = await prisma.booking.update({
          where: { id: bookingId },
          data: { status, ...(typeof req.body.budget !== 'undefined' ? { budget: req.body.budget ? Number(req.body.budget) : null } : {}) },
          include: { client: true, assignedTo: true }
        })
        if (b.assignedToId) {
          await notifyUser(b.assignedToId, 'ASSIGNMENT', `Booking status updated to ${status}`, `"${b.title}" is now ${status}.`, '/technician/dashboard')
        }
        return res.json(b)
      }

      if (action === 'delete_booking') {
        await prisma.technicianActivity.deleteMany({ where: { bookingId } })
        await prisma.report.deleteMany({ where: { bookingId } })
        await prisma.booking.delete({ where: { id: bookingId } })
        return res.json({ success: true, deletedId: bookingId })
      }

      // --- User creation ---

      if (action === 'create_user') {
        if (!email || !name) {
          return res.status(400).json({ error: 'Name and email are required' })
        }
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
          return res.status(400).json({ error: 'User with this email already exists' })
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null
        const newUser = await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: role || 'TECH',
            approved: true,
            status: 'ACTIVE'
          }
        })
        return res.status(201).json(newUser)
      }

      if (action === 'delete_user') {
        const uid = req.body.userId || userId
        if (!uid) return res.status(400).json({ error: 'User ID is required' })
        await prisma.user.delete({ where: { id: uid } })
        return res.json({ success: true, deletedUserId: uid })
      }

      return res.status(400).json({ error: 'Invalid action' })
    } catch (error: any) {
      console.error('Admin API error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  return res.status(405).end()
}