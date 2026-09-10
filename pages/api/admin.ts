import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    try {
      const { action, bookingId, assignToId, status, startDate, endDate, name, email, password, role, userId } = req.body

      // Approve booking request
      if (action === 'approve') {
        const b = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'APPROVED' },
          include: { client: true, assignedTo: true }
        })
        return res.json(b)
      }

      // Assign technician to project/booking
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
        return res.json(b)
      }

      // Update booking status directly (e.g. IN_PROGRESS, COMPLETED, CANCELLED)
      if (action === 'update_status') {
        const b = await prisma.booking.update({
          where: { id: bookingId },
          data: { status },
          include: { client: true, assignedTo: true }
        })
        return res.json(b)
      }

      // Delete booking
      if (action === 'delete_booking') {
        await prisma.technicianActivity.deleteMany({ where: { bookingId } })
        await prisma.report.deleteMany({ where: { bookingId } })
        await prisma.booking.delete({ where: { id: bookingId } })
        return res.json({ success: true, deletedId: bookingId })
      }

      // Create new user (Technician, Client, or Admin)
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
            role: role || 'TECH'
          }
        })
        return res.status(201).json(newUser)
      }

      // Delete user
      if (action === 'delete_user') {
        if (!userId) return res.status(400).json({ error: 'User ID is required' })
        await prisma.user.delete({ where: { id: userId } })
        return res.json({ success: true, deletedUserId: userId })
      }

      return res.status(400).json({ error: 'Invalid action' })
    } catch (error: any) {
      console.error('Admin API error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  return res.status(405).end()
}
