import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveRole } from '../../lib/department-auth'

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
  const quantity = Number(req.body?.quantity)
  const note = String(req.body?.note || '').trim().slice(0, 500) || null
  if (!bookingId || !inventoryItemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) return res.status(400).json({ error: 'Choose a material and enter a valid whole-number quantity.' })
  if (!(await canAccessBooking(user, bookingId))) return res.status(403).json({ error: 'You can only record usage for assigned projects.' })
  const item = await prisma.inventoryItem.findFirst({ where: { id: inventoryItemId, deletedAt: null }, select: { id: true, unit: true } })
  if (!item) return res.status(404).json({ error: 'Inventory item not found.' })
  const usage = await prisma.projectMaterialUsage.create({ data: { bookingId, inventoryItemId, techId: user.id, quantity, unit: item.unit || 'pcs', note }, include: { inventoryItem: { select: { id: true, name: true, sku: true, unit: true } }, tech: { select: { id: true, name: true } } } })
  return res.status(201).json({ usage })
}
