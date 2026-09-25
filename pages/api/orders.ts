import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

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

function withReference(order: any): any {
  return {
    ...order,
    reference: `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
  }
}

export default async function handler(req: any, res: any) {
  try {
    const user = await requireAdmin(req, res)
    if (!user) return

    if (req.method === 'GET') {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
          client: { select: { id: true, name: true, email: true, phone: true } },
        },
      })
      return res.json({ orders: orders.map(withReference) })
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body || {}
      if (!id || !status) return res.status(400).json({ error: 'Order id and status are required' })
      const allowed = ['PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED']
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }

      const order = await prisma.order.findUnique({ where: { id: String(id) } })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      // Only reduce stock once, when an order moves into APPROVED.
      const isApproval = status === 'APPROVED' && order.status !== 'APPROVED'
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: String(id) },
          data: { status },
          include: { items: true },
        })

        if (isApproval) {
          for (const item of updated.items) {
            if (!item.inventoryItemId) continue
            await tx.inventoryItem.update({
              where: { id: item.inventoryItemId },
              data: { quantity: { decrement: item.quantity } },
            })
          }
        }

        return updated
      })

      await prisma.notification.create({
        data: {
          userId: result.clientId,
          type: 'ORDER',
          title: 'Order Status Updated',
          message: `Your order ${withReference(result).reference} is now ${status}. Thank you for choosing Elettro.`,
          link: '/contact',
        },
      })

      return res.json({ ok: true, order: withReference(result) })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Orders API error', error)
    return res.status(500).json({ error: error?.message || 'Failed to process order' })
  }
}