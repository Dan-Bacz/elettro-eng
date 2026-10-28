import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../../lib/auth'

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
    payload = jwt.verify(token, getJwtSecret())
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
  if (user.role !== 'ADMIN' && user.role !== 'TECH') return res.status(403).json({ error: 'Forbidden' })

  // GET: list material requests (admin = all/status filter; tech = own/bookingId filter)
  if (req.method === 'GET') {
    const where: any = {}
    if (user.role === 'TECH') {
      where.techId = user.id
    }
    if (req.query.bookingId) where.bookingId = String(req.query.bookingId)
    if (req.query.status) where.status = String(req.query.status)

    try {
      const requests = await prisma.materialRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          tech: { select: { id: true, name: true, email: true, phone: true } },
          booking: { select: { id: true, title: true, status: true, clientId: true, assignedToId: true } }
        }
      })
      return res.json({ requests })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  // POST: create material request (techs for their assigned booking; admin can too)
  if (req.method === 'POST') {
    const { bookingId, material, quantity, unit, reason, priority } = req.body || {}
    if (!bookingId || !material) {
      return res.status(400).json({ error: 'bookingId and material are required' })
    }

    try {
      const booking = await prisma.booking.findUnique({ where: { id: String(bookingId) }, select: { id: true, assignedToId: true, title: true } })
      if (!booking) return res.status(404).json({ error: 'Booking not found' })
      if (user.role === 'TECH' && booking.assignedToId !== user.id) {
        return res.status(403).json({ error: 'You can only request materials for your assigned projects' })
      }

      const materialName = String(material).trim()
      const reqQuantity = quantity != null ? Math.max(1, Math.round(Number(quantity))) : 1
      const reqUnit = unit ? String(unit).trim() : 'pcs'

      // Check or find matching inventory item
      let inventoryItem = await prisma.inventoryItem.findFirst({
        where: { name: { equals: materialName, mode: 'insensitive' } }
      })
      if (!inventoryItem) {
        inventoryItem = await prisma.inventoryItem.findFirst({
          where: { name: { contains: materialName, mode: 'insensitive' } }
        })
      }
      if (!inventoryItem) {
        inventoryItem = await prisma.inventoryItem.create({
          data: {
            name: materialName,
            quantity: 0,
            unit: reqUnit,
            category: 'Materials'
          }
        })
      }

      const request = await prisma.materialRequest.create({
        data: {
          techId: user.id,
          bookingId: booking.id,
          material: materialName,
          quantity: reqQuantity,
          unit: reqUnit,
          reason: reason ? String(reason).trim() : null,
          priority: priority && String(priority).toUpperCase() === 'URGENT' ? 'URGENT' : 'NORMAL'
        }
      })

      // Automatically create the linked WarehouseRequest
      const reqUid = (await import('crypto')).randomUUID()
      const whrReference = `WHR-TECH-${new Date().getFullYear()}-${reqUid.slice(0, 8).toUpperCase()}`

      await prisma.warehouseRequest.create({
        data: {
          id: reqUid,
          reference: whrReference,
          source: 'TECHNICIAN',
          status: 'PENDING',
          requesterId: user.id,
          bookingId: booking.id,
          projectReference: booking.title,
          materialRequestId: request.id,
          notes: reason ? String(reason).trim() : (priority ? `Priority: ${priority}` : null),
          items: {
            create: [{
              inventoryItemId: inventoryItem.id,
              requestedQuantity: reqQuantity,
              unit: reqUnit,
              notes: priority ? `Priority: ${priority}` : null
            }]
          }
        }
      }).catch((e) => console.error('Failed to create linked warehouse request:', e))

      // Notify warehouse workers about the new technician material request
      const warehouseWorkers = await prisma.user.findMany({ where: { role: 'WAREHOUSE', status: 'ACTIVE' }, select: { id: true } })
      if (warehouseWorkers.length) {
        await prisma.notification.createMany({
          data: warehouseWorkers.map((worker) => ({
            userId: worker.id,
            type: 'WAREHOUSE_REQUEST',
            title: 'New Technician Material Request',
            message: `${user.name} requested ${reqQuantity} ${reqUnit} of "${materialName}" for "${booking.title}".`,
            link: '/warehouse/requests'
          }))
        }).catch(() => {})
      }

      // Notify admins about the new request
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: 'MATERIAL_REQUEST',
            title: 'New Material Request',
            message: `${user.name} requested materials for "${booking.title}".`,
            link: '/admin/projects'
          }))
        })
      }

      return res.status(201).json({ ok: true, request, warehouseReference: whrReference })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  // PATCH: approve/reject material request (admin only)
  if (req.method === 'PATCH') {
    if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
    const { id, status, adminNote } = req.body || {}
    if (!id || !status) return res.status(400).json({ error: 'id and status are required' })

    const approved = String(status).toUpperCase() === 'APPROVED'
    const rejected = String(status).toUpperCase() === 'REJECTED'
    if (!approved && !rejected) return res.status(400).json({ error: 'status must be APPROVED or REJECTED' })

    try {
      const request = await prisma.materialRequest.findUnique({
        where: { id: String(id) },
        include: { booking: { select: { id: true, title: true, assignedToId: true } } }
      })
      if (!request) return res.status(404).json({ error: 'Material request not found' })

      const updated = await prisma.materialRequest.update({
        where: { id: String(id) },
        data: { status: approved ? 'APPROVED' : 'REJECTED', adminNote: adminNote || request.adminNote }
      })

      if (request.techId !== request.booking?.assignedToId) {
        // notify the requesting tech
        await notifyUser(
          request.techId,
          'MATERIAL_REQUEST',
          approved ? 'Material Request Approved' : 'Material Request Rejected',
          approved
            ? `Your request for "${request.material}" on "${request.booking?.title}" was approved.`
            : `Your request for "${request.material}" on "${request.booking?.title}" was rejected.`,
          '/technician/dashboard'
        )
      }

      // Also notify the assigned tech (whoever is working the project)
      if (request.booking?.assignedToId) {
        await notifyUser(
          request.booking.assignedToId,
          'MATERIAL_REQUEST',
          approved ? 'Material Request Approved' : 'Material Request Rejected',
          approved
            ? `Material request for "${request.material}" on "${request.booking?.title}" was approved.`
            : `Material request for "${request.material}" on "${request.booking?.title}" was rejected.`,
          '/technician/dashboard'
        )
      }

      return res.json({ ok: true, request: updated })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  return res.status(405).end()
}
