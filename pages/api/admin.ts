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

      // --- Booking lifecycle: approve/assign/decline/delete admin only; TECH may update status on assigned bookings ---

      if (action === 'approve' || action === 'assign' || action === 'add_technician' || action === 'decline' || action === 'delete_booking') {
        if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
      }

      if (action === 'update_status') {
        const bookingRow = await prisma.booking.findUnique({
          where: { id: bookingId },
          select: { assignedToId: true, status: true }
        })
        if (!bookingRow) return res.status(404).json({ error: 'Booking not found' })

        const project = await prisma.project.findUnique({
          where: { bookingId },
          select: { id: true, status: true }
        })
        const teamCount = project
          ? await prisma.projectAssignment.count({ where: { projectId: project.id } })
          : 0

        if (user.role === 'TECH') {
          const isMember = teamCount > 0 && project
            ? await prisma.projectAssignment.findUnique({
                where: { projectId_techId: { projectId: project.id, techId: user.id } }
              })
            : null
          if (bookingRow.assignedToId !== user.id && !isMember) {
            return res.status(403).json({ error: 'You can only update status on projects assigned to you' })
          }
        }

        if (user.role === 'ADMIN') {
          const requested = status ? String(status) : bookingRow.status
          // Once a project is running or finished (in progress / completed / cancelled) the
          // technicians own its status. Admin may still update an approved project before work starts.
          if ((bookingRow.status === 'IN_PROGRESS' || bookingRow.status === 'COMPLETED' || bookingRow.status === 'CANCELLED') && requested !== bookingRow.status) {
            return res.status(403).json({ error: `This project is "${bookingRow.status.replace('_', ' ')}" and is managed by the assigned technicians. You can only change status while the project is approved.` })
          }
          if (teamCount > 0 && requested !== bookingRow.status) {
            return res.status(403).json({ error: 'Project status is managed by the assigned technicians once technicians are assigned. Technicians report progress from their dashboard.' })
          }
        }
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
        // Approving a booking automatically creates its project
        const existingProject = await prisma.project.findUnique({ where: { bookingId } })
        if (!existingProject) {
          await prisma.project.create({
            data: {
              bookingId,
              title: b.title,
              description: b.description,
              startDate: b.startDate,
              endDate: b.endDate,
              status: 'APPROVED'
            }
          })
        } else {
          await prisma.project.update({
            where: { bookingId },
            data: { title: b.title, description: b.description, startDate: b.startDate, endDate: b.endDate, status: 'APPROVED' }
          })
        }
        if (b.clientId) {
          await notifyUser(b.clientId, 'BOOKING', 'Booking Approved', `Your booking "${b.title}" has been approved and converted into a project.`, '/client')
        }
        return res.json(b)
      }

      if (action === 'assign') {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          select: { assignedToId: true, title: true, description: true, startDate: true, endDate: true }
        })
        if (!booking) return res.status(404).json({ error: 'Booking not found' })

        const dataToUpdate: any = {}
        if (assignToId) {
          dataToUpdate.assignedToId = booking.assignedToId || assignToId
          dataToUpdate.status = 'ASSIGNED'
        } else {
          dataToUpdate.assignedToId = null
          dataToUpdate.status = 'APPROVED'
        }
        if (startDate) dataToUpdate.startDate = new Date(startDate)
        if (endDate) dataToUpdate.endDate = new Date(endDate)

        const b = await prisma.booking.update({
          where: { id: bookingId },
          data: dataToUpdate,
          include: { client: true, assignedTo: true }
        })

        const project = await prisma.project.upsert({
          where: { bookingId },
          update: {
            title: booking.title,
            description: booking.description,
            startDate: dataToUpdate.startDate,
            endDate: dataToUpdate.endDate,
            status: assignToId ? 'ASSIGNED' : 'APPROVED'
          },
          create: {
            bookingId,
            title: booking.title,
            description: booking.description,
            startDate: dataToUpdate.startDate || null,
            endDate: dataToUpdate.endDate || null,
            status: assignToId ? 'ASSIGNED' : 'APPROVED'
          }
        })

        if (assignToId) {
          await prisma.projectAssignment.upsert({
            where: { projectId_techId: { projectId: project.id, techId: assignToId } },
            update: {},
            create: { projectId: project.id, techId: assignToId }
          })
          await notifyUser(assignToId, 'ASSIGNMENT', 'New Job Assigned', `You have been assigned to "${b.title}".`, '/technician/dashboard')
        } else {
          await prisma.projectAssignment.deleteMany({ where: { projectId: project.id } })
        }
        return res.json(b)
      }

      if (action === 'add_technician') {
        if (!assignToId) return res.status(400).json({ error: 'Technician is required' })
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          select: { assignedToId: true, title: true, description: true, startDate: true, endDate: true, status: true, clientId: true }
        })
        if (!booking) return res.status(404).json({ error: 'Booking not found' })
        if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
          return res.status(400).json({ error: 'Technicians cannot be added to a finished project.' })
        }

        const project = await prisma.project.upsert({
          where: { bookingId },
          update: { title: booking.title, description: booking.description },
          create: {
            bookingId,
            title: booking.title,
            description: booking.description,
            startDate: booking.startDate || null,
            endDate: booking.endDate || null,
            status: 'ASSIGNED'
          }
        })

        const exists = await prisma.projectAssignment.findUnique({
          where: { projectId_techId: { projectId: project.id, techId: assignToId } }
        })
        if (!exists) {
          await prisma.projectAssignment.create({ data: { projectId: project.id, techId: assignToId } })
        }

        const b = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            assignedToId: booking.assignedToId || assignToId,
            ...(booking.status === 'PENDING' || booking.status === 'APPROVED' ? { status: 'ASSIGNED' } : {})
          },
          include: { client: true, assignedTo: true }
        })

        if (project.status === 'APPROVED') {
          await prisma.project.update({ where: { id: project.id }, data: { status: 'ASSIGNED' } })
        }
        await notifyUser(assignToId, 'ASSIGNMENT', 'Added to Project Team', `You have been added to the project team for "${b.title}".`, '/technician/dashboard')
        return res.json(b)
      }

      if (action === 'decline') {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          select: { status: true, title: true, clientId: true, client: true }
        })
        if (!booking) return res.status(404).json({ error: 'Booking not found' })
        if (booking.status !== 'PENDING' && booking.status !== 'APPROVED') {
          return res.status(400).json({ error: 'Only pending or approved bookings can be declined.' })
        }
        const project = await prisma.project.findUnique({ where: { bookingId }, select: { id: true } })
        if (project) {
          const teamCount = await prisma.projectAssignment.count({ where: { projectId: project.id } })
          if (teamCount > 0) {
            return res.status(400).json({ error: 'This project already has assigned technicians and cannot be declined.' })
          }
        }
        const b = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CANCELLED' },
          include: { client: true, assignedTo: true }
        })
        if (project) {
          await prisma.project.update({ where: { bookingId }, data: { status: 'CANCELLED' } })
        }
        if (booking.clientId) {
          await notifyUser(booking.clientId, 'BOOKING', 'Booking Declined', `Your booking "${booking.title}" was declined by our team. Please contact us for details.`, '/client')
        }
        return res.json(b)
      }

      if (action === 'update_status') {
        const b = await prisma.booking.update({
          where: { id: bookingId },
          data: { status, ...(typeof req.body.budget !== 'undefined' ? { budget: req.body.budget ? Number(req.body.budget) : null } : {}) },
          include: { client: true, assignedTo: true }
        })
        const projectExists = await prisma.project.findUnique({ where: { bookingId }, select: { id: true } })
        if (projectExists) {
          await prisma.project.update({ where: { bookingId }, data: { status } })
        }
        if (b.assignedToId) {
          await notifyUser(b.assignedToId, 'ASSIGNMENT', `Booking status updated to ${status}`, `"${b.title}" is now ${status}.`, '/technician/dashboard')
        }
        return res.json(b)
      }

      if (action === 'delete_booking') {
        await prisma.project.deleteMany({ where: { bookingId } })
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