import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveRole } from '../../lib/department-auth'
import { technicianMaterialRequestFilter } from '../../lib/technician-material-requests'
import { isProfilePhotoDataUrl } from '../../lib/profile-photo-data'
import { MAX_REPORT_PHOTO_LENGTH } from '../../lib/report-photos'

const prisma = new PrismaClient()

async function canAccessBooking(user: { id: string; role: string }, bookingId: string) {
  if (user.role === 'ADMIN') return true
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, OR: [{ assignedToId: user.id }, { project: { assignments: { some: { techId: user.id } } } }] },
    select: { id: true },
  })
  return !!booking
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireActiveRole(req, res, ['ADMIN', 'TECH'])
  if (!user) return

  if (req.method === 'GET') {
    if (req.query.projects === '1' && user.role === 'TECH') {
      const projects = await prisma.booking.findMany({
        where: { OR: [{ assignedToId: user.id }, { project: { assignments: { some: { techId: user.id } } } }] },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          warehouseRequests: {
            where: technicianMaterialRequestFilter(user.id),
            select: {
              items: {
                where: { inventoryItem: { deletedAt: null } },
                select: {
                  requestedQuantity: true,
                  inventoryItem: { select: { id: true, name: true, unit: true } },
                },
              },
            },
          },
        },
      })
      return res.status(200).json({ projects })
    }
    if (typeof req.query.usageId === 'string' && (req.query.photo === 'receipt' || req.query.photo === 'product')) {
      const evidence = await prisma.projectMaterialUsageEvidence.findUnique({
        where: { usageId: req.query.usageId },
        select: { usage: { select: { bookingId: true } }, receiptPhoto: true, productPhoto: true },
      })
      if (!evidence || !(await canAccessBooking(user, evidence.usage.bookingId))) return res.status(404).end()
      const photo = req.query.photo === 'receipt' ? evidence.receiptPhoto : evidence.productPhoto
      if (!isProfilePhotoDataUrl(photo)) return res.status(404).end()
      const [header, encoded] = photo.split(',')
      res.setHeader('Content-Type', header.slice(5, -7))
      res.setHeader('Cache-Control', 'private, no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      return res.status(200).send(Buffer.from(encoded, 'base64'))
    }
    const bookingId = typeof req.query.bookingId === 'string' ? req.query.bookingId : ''
    if (user.role === 'TECH' && bookingId && !(await canAccessBooking(user, bookingId))) return res.status(403).json({ error: 'You can only view usage for assigned projects.' })
    const usages = await prisma.projectMaterialUsage.findMany({
      where: bookingId ? { bookingId } : user.role === 'TECH' ? { techId: user.id } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { inventoryItem: { select: { id: true, name: true, sku: true, unit: true } }, tech: { select: { id: true, name: true } }, booking: { select: { id: true, title: true } } },
    })
    return res.status(200).json({ usages })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const bookingId = String(req.body?.bookingId || '').trim()
  const inventoryItemId = String(req.body?.inventoryItemId || '').trim()
  const materialName = typeof req.body?.materialName === 'string' ? req.body.materialName.trim().slice(0, 160) : ''
  const quantity = Number(req.body?.quantity)
  const note = String(req.body?.note || '').trim().slice(0, 500) || null
  if (!bookingId || !Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) return res.status(400).json({ error: 'Choose a project and enter a valid whole-number quantity.' })
  if (!(await canAccessBooking(user, bookingId))) return res.status(403).json({ error: 'You can only record usage for assigned projects.' })
  const item = inventoryItemId ? await prisma.inventoryItem.findFirst({
    where: {
      id: inventoryItemId,
      deletedAt: null,
      ...(user.role === 'TECH' ? {
        warehouseRequestItems: { some: { request: { bookingId, ...technicianMaterialRequestFilter(user.id) } } },
      } : {}),
    },
    select: { id: true, unit: true },
  }) : null
  if (inventoryItemId && !item) {
    if (user.role === 'TECH') return res.status(400).json({ error: 'Choose a material you requested for this project.' })
    return res.status(404).json({ error: 'Inventory item not found.' })
  }
  let evidence
  if (!inventoryItemId) {
    if (!materialName) return res.status(400).json({ error: 'Enter the name of the unrequested material.' })
    const { receiptPhoto, productPhoto } = req.body
    if (!isProfilePhotoDataUrl(receiptPhoto) || receiptPhoto.length > MAX_REPORT_PHOTO_LENGTH ||
        !isProfilePhotoDataUrl(productPhoto) || productPhoto.length > MAX_REPORT_PHOTO_LENGTH) {
      return res.status(400).json({ error: 'Capture both the receipt and the product used.' })
    }
    evidence = { create: { receiptPhoto, productPhoto } }
  }
  const unit = item?.unit || (!item && typeof req.body?.unit === 'string' ? req.body.unit.trim().slice(0, 24) : '') || 'pcs'
  const usage = await prisma.projectMaterialUsage.create({
    data: { bookingId, inventoryItemId: item?.id ?? null, materialName: item ? null : materialName, techId: user.id, quantity, unit, note, evidence },
    include: { inventoryItem: { select: { id: true, name: true, sku: true, unit: true } }, tech: { select: { id: true, name: true } } },
  })
  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { title: true } })
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'MATERIAL_USAGE',
          title: 'Project Material Usage Recorded',
          message: `${user.name} recorded ${quantity} ${unit} used on "${booking?.title || 'project'}".`,
          link: `/admin/projects/${bookingId}`,
        })),
      })
    }
  } catch (error) {
    console.error('Failed to send material usage notifications', error)
  }
  return res.status(201).json({ usage })
}
