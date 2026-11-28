import { PrismaClient, WarehouseRequestStatus } from '@prisma/client'
import { randomUUID } from 'node:crypto'
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
    const { bookingId, material, quantity, unit, reason, priority, items } = req.body || {}
    const batch = items !== undefined
    const lines: { inventoryItemId: string; quantity: number }[] = batch && Array.isArray(items)
      ? items.map(item => ({
          inventoryItemId: typeof item?.inventoryItemId === 'string' ? item.inventoryItemId.trim() : '',
          quantity: Number(item?.quantity),
        }))
      : []
    const legacyName = typeof material === 'string' ? material.trim() : ''
    const legacyQuantity = Number(quantity ?? 1)
    const validQuantity = (value: number) => Number.isInteger(value) && value >= 1 && value <= 1_000_000
    if (!bookingId || (batch
      ? !lines.length || lines.length > 100 || lines.some(item => !item.inventoryItemId || !validQuantity(item.quantity))
      : !legacyName || !validQuantity(legacyQuantity))) {
      return res.status(400).json({ error: 'Select a project and enter a valid whole-number quantity for each material.' })
    }
    if (new Set(lines.map(item => item.inventoryItemId)).size !== lines.length) {
      return res.status(400).json({ error: 'Add each material once and set its total quantity.' })
    }

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: String(bookingId) },
        select: { id: true, assignedToId: true, title: true, project: { select: { assignments: { where: { techId: user.id }, select: { techId: true } } } } },
      })
      if (!booking) return res.status(404).json({ error: 'Booking not found' })
      if (user.role === 'TECH' && booking.assignedToId !== user.id && !booking.project?.assignments.length) {
        return res.status(403).json({ error: 'You can only request materials for your assigned projects' })
      }

      const requestReason = typeof reason === 'string' ? reason.trim() || null : null
      const requestPriority = String(priority).toUpperCase() === 'URGENT' ? 'URGENT' : 'NORMAL'
      const reqUid = randomUUID()
      const whrReference = `WHR-TECH-${new Date().getFullYear()}-${reqUid.slice(0, 8).toUpperCase()}`

      const request = await prisma.$transaction(async tx => {
        let selected: { id: string; name: string; unit: string | null; quantity: number }[]
        if (batch) {
          const inventory = await tx.inventoryItem.findMany({
            where: { id: { in: lines.map(item => item.inventoryItemId) }, deletedAt: null },
            select: { id: true, name: true, unit: true },
          })
          if (inventory.length !== lines.length) return null
          const byId = new Map(inventory.map(item => [item.id, item]))
          selected = lines.map(line => ({ ...byId.get(line.inventoryItemId)!, quantity: line.quantity }))
        } else {
          const legacyUnit = typeof unit === 'string' && unit.trim() ? unit.trim() : 'pcs'
          const inventoryItem = await tx.inventoryItem.findFirst({
            where: { name: { equals: legacyName, mode: 'insensitive' }, deletedAt: null },
          }) ?? await tx.inventoryItem.findFirst({
            where: { name: { contains: legacyName, mode: 'insensitive' }, deletedAt: null },
          }) ?? await tx.inventoryItem.create({
            data: { name: legacyName, quantity: 0, unit: legacyUnit, category: 'Materials' },
          })
          selected = [{ id: inventoryItem.id, name: legacyName, unit: legacyUnit, quantity: legacyQuantity }]
        }

        const first = selected[0]
        const created = await tx.materialRequest.create({
          data: {
            techId: user.id,
            bookingId: booking.id,
            material: selected.length === 1 ? first.name : `${first.name} + ${selected.length - 1} more`,
            quantity: selected.reduce((sum, item) => sum + item.quantity, 0),
            unit: selected.length === 1 ? first.unit || 'pcs' : null,
            reason: requestReason,
            priority: requestPriority,
          },
        })
        await tx.warehouseRequest.create({
          data: {
            id: reqUid,
            reference: whrReference,
            source: 'TECHNICIAN',
            requesterId: user.id,
            bookingId: booking.id,
            projectReference: booking.title,
            materialRequestId: created.id,
            notes: requestReason || `Priority: ${requestPriority}`,
            items: { create: selected.map(item => ({
              inventoryItemId: item.id,
              requestedQuantity: item.quantity,
              unit: item.unit || 'pcs',
            })) },
          },
        })
        return created
      })
      if (!request) return res.status(400).json({ error: 'One or more selected materials are unavailable. Refresh the warehouse list and try again.' })

      try {
        const recipients = await prisma.user.findMany({
          where: { OR: [{ role: 'ADMIN' }, { role: 'WAREHOUSE', status: 'ACTIVE' }] },
          select: { id: true, role: true },
        })
        if (recipients.length) {
          await prisma.notification.createMany({
            data: recipients.map(recipient => ({
              userId: recipient.id,
              type: recipient.role === 'WAREHOUSE' ? 'WAREHOUSE_REQUEST' : 'MATERIAL_REQUEST',
              title: 'New Technician Material Request',
              message: `${user.name} requested ${request.material} for "${booking.title}". This request is pending admin approval.`,
              link: recipient.role === 'WAREHOUSE' ? '/warehouse/requests' : '/admin/materials-requests',
            })),
          })
        }
      } catch (error) {
        console.error('Failed to send material request notifications', error)
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

      const updated = await prisma.$transaction(async (tx) => {
        const changed = await tx.materialRequest.update({
          where: { id: String(id) },
          data: { status: approved ? 'APPROVED' : 'REJECTED', adminNote: adminNote || request.adminNote }
        })
        await tx.warehouseRequest.updateMany({
          where: { materialRequestId: request.id, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
          data: { status: approved ? WarehouseRequestStatus.APPROVED : WarehouseRequestStatus.REJECTED, updatedAt: new Date() },
        })
        return changed
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
