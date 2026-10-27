import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../../lib/auth'

const prisma = new PrismaClient()

function getToken(req: any) {
  const authorization = req.headers.authorization || ''
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) return authorization.slice(7)
  return req.cookies?.token || null
}

async function requireAdminOrSales(req: any, res: any) {
  const token = getToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  let payload: any
  try {
    payload = jwt.verify(token, getJwtSecret())
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }
  const user = await prisma.user.findUnique({ where: { id: String(payload.userId) } })
  if (!user || user.status !== 'ACTIVE' || (user.role !== 'ADMIN' && user.role !== 'SALES')) {
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
    const user = await requireAdminOrSales(req, res)
    if (!user) return

    if (req.method === 'GET') {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
          client: { select: { id: true, name: true, email: true, phone: true } },
          warehouseRequest: {
            select: {
              id: true,
              reference: true,
              status: true,
              _count: { select: { releases: true } },
            },
          },
        },
        select: {
          id: true,
          clientId: true,
          clientName: true,
          email: true,
          phone: true,
          address: true,
          barangay: true,
          city: true,
          province: true,
          postalCode: true,
          deliveryNotes: true,
          fulfillmentNote: true,
          paymentMethod: true,
          paymentStatus: true,
          notes: true,
          status: true,
          total: true,
          createdAt: true,
          updatedAt: true,
          paymentReference: true,
          fulfillmentMethod: true,
          shipping: true,
          shippingConfirmed: true,
          riderId: true,
          riderName: true,
          riderAssignedAt: true,
          items: true,
          client: true,
          warehouseRequest: true,
        },
      })
      return res.json({ orders: orders.map(withReference) })
    }

    if (req.method === 'PATCH') {
      const body = req.body || {}
      const { id, status, paymentStatus } = body
      const hasShipping = Object.prototype.hasOwnProperty.call(body, 'shipping')
      const hasFulfillmentNote = Object.prototype.hasOwnProperty.call(body, 'fulfillmentNote')
      const hasRiderName = Object.prototype.hasOwnProperty.call(body, 'riderName')
      const shipping = Number(body.shipping)
      const fulfillmentNote = String(body.fulfillmentNote ?? '').trim()
      const riderName = String(body.riderName ?? '').trim()
      if (!id || (!status && !paymentStatus && !hasShipping && !hasFulfillmentNote && !hasRiderName)) {
        return res.status(400).json({ error: 'Order id and an order, payment, shipping, fulfillment note, or rider update are required' })
      }
      if (hasShipping && (!Number.isFinite(shipping) || shipping < 0 || shipping > 1000000)) {
        return res.status(400).json({ error: 'Shipping fee must be between 0 and 1,000,000.' })
      }
      if (hasFulfillmentNote && fulfillmentNote.length > 500) {
        return res.status(400).json({ error: 'Fulfillment instructions must be 500 characters or fewer.' })
      }
      if (hasRiderName && riderName.length > 100) {
        return res.status(400).json({ error: 'Rider name must be 100 characters or fewer.' })
      }

      const order = await prisma.order.findUnique({
        where: { id: String(id) },
        include: {
          items: true,
          warehouseRequest: { include: { releases: { select: { id: true } } } },
        },
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      const nextByStatus: Record<string, string[]> = {
        PENDING: ['APPROVED', 'CANCELLED'],
        APPROVED: ['PROCESSING', 'CANCELLED'],
        PROCESSING: order.fulfillmentMethod === 'PICKUP' ? ['READY_FOR_PICKUP', 'CANCELLED'] : ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED'],
      }
      if (status && !nextByStatus[order.status]?.includes(status)) {
        return res.status(409).json({ error: `Order cannot move from ${order.status} to ${status}.` })
      }
      if (status === 'APPROVED' && order.fulfillmentMethod === 'DELIVERY' && !order.shippingConfirmed && !hasShipping) {
        return res.status(409).json({ error: 'Set and confirm the delivery fee before confirming this order.' })
      }
      if (hasShipping && (order.fulfillmentMethod !== 'DELIVERY' || order.status !== 'PENDING')) {
        return res.status(409).json({ error: 'Delivery fees can only be set on delivery orders awaiting confirmation.' })
      }
      if (hasFulfillmentNote && ['COMPLETED', 'CANCELLED'].includes(order.status)) {
        return res.status(409).json({ error: 'Fulfillment instructions cannot be changed on a closed order.' })
      }
      if (status && ['DELIVERED', 'READY_FOR_PICKUP'].includes(status)) {
        return res.status(400).json({ error: 'Only the client can confirm that a delivered or pickup order was received.' })
      }
      if (status === 'PROCESSING' && order.warehouseRequest) {
        return res.status(409).json({ error: 'Warehouse release verification controls order processing.' })
      }
      if (status === 'CANCELLED' && order.warehouseRequest?.releases.length) {
        return res.status(409).json({ error: 'An order with released warehouse items cannot be cancelled without an authorized return workflow.' })
      }
      if (status === 'CANCELLED' && order.paymentMethod === 'GCASH' && order.paymentStatus === 'PAID') {
        return res.status(409).json({ error: 'Handle the GCash refund before cancelling this paid order.' })
      }
      if (paymentStatus && paymentStatus !== 'PAID') {
        return res.status(400).json({ error: 'The only supported payment update is marking a received payment as paid.' })
      }
      if (status === 'PROCESSING' && order.paymentMethod === 'GCASH' && order.paymentStatus !== 'PAID' && paymentStatus !== 'PAID') {
        return res.status(409).json({ error: 'Verify the GCash payment before preparing this order.' })
      }
      if (paymentStatus === 'PAID') {
        if (order.paymentStatus === 'PAID') return res.status(409).json({ error: 'This order is already marked paid.' })
        if (order.paymentMethod === 'GCASH' && (order.paymentStatus !== 'SUBMITTED' || !order.paymentReference)) {
          return res.status(409).json({ error: 'The client must submit a GCash transfer reference before payment can be verified.' })
        }
        if (order.paymentMethod === 'CASH_ON_DELIVERY' && !['DELIVERED', 'COMPLETED'].includes(order.status)) {
          return res.status(409).json({ error: 'Confirm delivery before marking cash on delivery as paid.' })
        }
        if (order.paymentMethod === 'CASH_ON_PICKUP' && order.status !== 'COMPLETED') {
          return res.status(409).json({ error: 'The client must confirm pickup before marking cash on pickup as paid.' })
        }
      }

      const isApproval = status === 'APPROVED'
      const isCancellation = status === 'CANCELLED'
      const restoreLegacyStock = isCancellation && !order.warehouseRequest && ['APPROVED', 'PROCESSING'].includes(order.status)
      const result = await prisma.$transaction(async (tx) => {
        const claimed = await tx.order.updateMany({
          where: { id: String(id), status: order.status, paymentStatus: order.paymentStatus, updatedAt: order.updatedAt },
          data: {
            ...(status ? { status } : {}),
            ...(paymentStatus ? { paymentStatus } : {}),
            ...(hasShipping ? { shipping: Math.round(shipping * 100) / 100, shippingConfirmed: true } : {}),
            ...(hasFulfillmentNote ? { fulfillmentNote: fulfillmentNote || null } : {}),
            ...(hasRiderName ? { riderName: riderName || null, riderAssignedAt: riderName ? new Date() : null } : {}),
          },
        })
        if (claimed.count !== 1) throw new Error('ORDER_CHANGED')
        const updated = await tx.order.findUniqueOrThrow({
          where: { id: String(id) },
          include: { items: true },
        })

        if (isApproval && !order.warehouseRequest) {
          const requestId = randomUUID()
          const requestReference = `WHR-${new Date().getFullYear()}-${requestId.slice(0, 8).toUpperCase()}`
          const lines = updated.items.filter(
            (item): item is typeof item & { inventoryItemId: string } => Boolean(item.inventoryItemId),
          )
          if (lines.length !== updated.items.length) throw new Error('ORDER_ITEM_MISSING_INVENTORY')
          await tx.warehouseRequest.create({
            data: {
              id: requestId,
              reference: requestReference,
              source: 'CLIENT_ORDER',
              requesterId: updated.clientId,
              orderId: updated.id,
              customerReference: updated.clientName,
              idempotencyKey: `CLIENT-ORDER-${updated.id}`,
              items: {
                create: lines.map((item) => ({
                  inventoryItemId: item.inventoryItemId,
                  orderItemId: item.id,
                  requestedQuantity: item.quantity,
                  unit: item.unit || 'pcs',
                })),
              },
            },
          })
          const workers = await tx.user.findMany({
            where: { role: 'WAREHOUSE', status: 'ACTIVE' },
            select: { id: true },
          })
          if (workers.length) {
            await tx.notification.createMany({
              data: workers.map((worker) => ({
                userId: worker.id,
                type: 'WAREHOUSE_REQUEST',
                title: 'Approved Client Order',
                message: `Order ${withReference(updated).reference} is approved and ready for warehouse review.`,
                link: '/warehouse/requests',
              })),
            })
          }
        }

        if (isCancellation && order.warehouseRequest) {
          const requestUpdate = await tx.warehouseRequest.updateMany({
            where: {
              id: order.warehouseRequest.id,
              status: { in: ['PENDING', 'UNDER_REVIEW', 'REJECTED'] },
              updatedAt: order.warehouseRequest.updatedAt,
            },
            data: { status: 'CANCELLED', updatedAt: new Date() },
          })
          if (requestUpdate.count !== 1) throw new Error('WAREHOUSE_REQUEST_CHANGED')
        }

        if (restoreLegacyStock) {
          for (const item of updated.items) {
            if (!item.inventoryItemId) continue
            const inventory = await tx.inventoryItem.findUnique({
              where: { id: item.inventoryItemId },
              select: { quantity: true },
            })
            if (!inventory) continue
            const restored = await tx.inventoryItem.updateMany({
              where: { id: item.inventoryItemId, quantity: inventory.quantity },
              data: { quantity: { increment: item.quantity } },
            })
            if (restored.count !== 1) throw new Error('INVENTORY_CHANGED')
            await tx.inventoryMovement.create({
              data: {
                inventoryItemId: item.inventoryItemId,
                type: 'RETURN',
                quantity: item.quantity,
                stockBefore: inventory.quantity,
                stockAfter: inventory.quantity + item.quantity,
                workerId: user.id,
                reason: `Legacy cancellation of ${withReference(updated).reference}`,
              },
            })
          }
        }
        return updated
      })

      const statusChanged = Boolean(status && order.status !== status)
      const paymentChanged = Boolean(paymentStatus && order.paymentStatus !== paymentStatus)
      const shippingChanged = hasShipping && (!order.shippingConfirmed || order.shipping !== Math.round(shipping * 100) / 100)
      const fulfillmentNoteChanged = hasFulfillmentNote && order.fulfillmentNote !== (fulfillmentNote || null)
      const riderChanged = hasRiderName && order.riderName !== (riderName || null)
      if (statusChanged || paymentChanged || shippingChanged || fulfillmentNoteChanged || riderChanged) {
        try {
          await prisma.notification.create({
            data: {
              userId: result.clientId,
              type: 'ORDER',
              title: paymentChanged ? 'Payment Verified' : shippingChanged ? 'Delivery Fee Confirmed' : fulfillmentNoteChanged ? 'Fulfillment Instructions Updated' : riderChanged ? 'Rider Assigned' : 'Order Status Updated',
              message: paymentChanged
                ? `Payment for ${withReference(result).reference} has been verified by our team.`
                : shippingChanged
                  ? `The delivery fee for ${withReference(result).reference} is ₱${Math.round(shipping * 100) / 100}. Review the updated total in your dashboard.`
                  : fulfillmentNoteChanged
                    ? `The fulfillment instructions for ${withReference(result).reference} were updated.`
                    : riderChanged
                      ? `A rider has been assigned to your order ${withReference(result).reference}: ${riderName}.`
                      : `Your order ${withReference(result).reference} is now ${status.replace(/_/g, ' ')}.`,
              link: '/client/dashboard#orders',
            },
          })
        } catch (error) {
          console.error('Could not notify client about order update:', error)
        }
      }

      return res.json({ ok: true, order: withReference(result) })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Orders API error', error)
    if (error?.message === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ error: 'There is not enough stock available to approve this order.' })
    }
    if (error?.message === 'ORDER_CHANGED') {
      return res.status(409).json({ error: 'The order changed. Refresh and try again.' })
    }
    if (error?.message === 'WAREHOUSE_REQUEST_CHANGED') {
      return res.status(409).json({ error: 'The warehouse request changed. Refresh and try again.' })
    }
    if (error?.message === 'ORDER_ITEM_MISSING_INVENTORY') {
      return res.status(409).json({ error: 'The order contains an item without an inventory record and cannot be sent to warehouse.' })
    }
    return res.status(500).json({ error: error?.message || 'Failed to process order' })
  }
}