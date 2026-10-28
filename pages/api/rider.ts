import { PrismaClient, DeliveryStatus, OrderStatus } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser, getTokenFromRequest } from '../../lib/auth'
import { uploadToCloudinary } from '../../lib/cloudinary'

const prisma = new PrismaClient()

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
    responseLimit: '12mb',
  },
}

function withOrderDetails(order: any) {
  const reference = `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
  return {
    ...order,
    reference,
    trackingNumber: order.trackingNumber || `ELE-DLV-${new Date(order.createdAt).getFullYear()}-${order.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
    deliveryStatus: order.deliveryStatus || 'AWAITING_ASSIGNMENT',
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getTokenFromRequest(req)
  if (!token) return res.status(401).json({ error: 'Authentication required' })

  const user = await getSessionUser(token)
  if (!user || user.status !== 'ACTIVE') return res.status(401).json({ error: 'Invalid or inactive session' })

  if (user.role !== 'RIDER') {
    return res.status(403).json({ error: 'Forbidden: Rider access only' })
  }

  // GET: Load assigned deliveries for authenticated rider
  if (req.method === 'GET') {
    try {
      const orders = await prisma.order.findMany({
        where: { riderId: user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              name: true,
              quantity: true,
              unit: true,
              unitPrice: true,
            },
          },
          proofOfDelivery: true,
          deliveryHistories: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      })

      const detailedOrders = orders.map(withOrderDetails)

      // Calculate statistics
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let todayCount = 0
      let pendingCount = 0
      let inTransitCount = 0
      let completedCount = 0
      let failedCount = 0

      for (const ord of detailedOrders) {
        const isToday = new Date(ord.updatedAt) >= today
        const status = ord.deliveryStatus

        if (isToday) todayCount++
        if (['ASSIGNED', 'PREPARING_DISPATCH'].includes(status)) pendingCount++
        if (status === 'IN_TRANSIT') inTransitCount++
        if (status === 'DELIVERED') completedCount++
        if (['DELIVERY_FAILED', 'CANCELLED', 'RETURNED'].includes(status)) failedCount++
      }

      return res.status(200).json({
        ok: true,
        rider: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        orders: detailedOrders,
        stats: {
          today: todayCount,
          pending: pendingCount,
          inTransit: inTransitCount,
          completed: completedCount,
          failed: failedCount,
        },
      })
    } catch (error: any) {
      console.error('Rider GET error:', error)
      return res.status(500).json({ error: error.message || 'Failed to fetch deliveries' })
    }
  }

  // PATCH: Update delivery status (e.g., IN_TRANSIT, DELIVERY_FAILED, CANCELLATION_REQUESTED, RETURN_REQUESTED)
  if (req.method === 'PATCH') {
    const { orderId, status, reason, notes } = req.body || {}

    if (!orderId || !status) {
      return res.status(400).json({ error: 'Order id and status are required' })
    }

    if (status === 'DELIVERED') {
      return res.status(400).json({
        error: 'Orders can only be marked DELIVERED by uploading a photo proof of delivery via POST.',
      })
    }

    const allowedTransitions: Record<string, DeliveryStatus[]> = {
      ASSIGNED: [DeliveryStatus.PREPARING_DISPATCH, DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERY_FAILED, DeliveryStatus.CANCELLATION_REQUESTED],
      PREPARING_DISPATCH: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERY_FAILED, DeliveryStatus.CANCELLATION_REQUESTED],
      IN_TRANSIT: [DeliveryStatus.DELIVERY_FAILED, DeliveryStatus.CANCELLATION_REQUESTED, DeliveryStatus.RETURN_REQUESTED],
      DELIVERY_FAILED: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.RETURN_REQUESTED],
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id: String(orderId) },
        include: { items: true },
      })

      if (!order) return res.status(404).json({ error: 'Order not found' })

      if (order.riderId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You are not assigned to this delivery' })
      }

      const currentDeliveryStatus = order.deliveryStatus || DeliveryStatus.ASSIGNED
      const allowedNext = allowedTransitions[currentDeliveryStatus] || []

      if (!allowedNext.includes(status as DeliveryStatus)) {
        return res.status(409).json({
          error: `Cannot transition delivery from ${currentDeliveryStatus} to ${status}`,
        })
      }

      if (['DELIVERY_FAILED', 'CANCELLATION_REQUESTED', 'RETURN_REQUESTED'].includes(status) && (!reason || !String(reason).trim())) {
        return res.status(400).json({ error: 'A specific reason is required for failed delivery, cancellation, or return.' })
      }

      const trackingNumber = order.trackingNumber || `ELE-DLV-${new Date(order.createdAt).getFullYear()}-${order.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`

      const updated = await prisma.$transaction(async (tx) => {
        const ord = await tx.order.update({
          where: { id: order.id },
          data: {
            deliveryStatus: status as DeliveryStatus,
            trackingNumber,
            deliveryFailedReason: reason ? String(reason).trim() : order.deliveryFailedReason,
            status: status === DeliveryStatus.IN_TRANSIT ? OrderStatus.SHIPPED : order.status,
            updatedAt: new Date(),
          },
        })

        await tx.deliveryHistory.create({
          data: {
            orderId: order.id,
            trackingNumber,
            status: status as DeliveryStatus,
            actorId: user.id,
            actorRole: 'RIDER',
            notes: reason ? `${reason}${notes ? ` - ${notes}` : ''}` : notes || null,
          },
        })

        // Notify sales officers about delivery status changes
        const salesUsers = await tx.user.findMany({
          where: { role: 'SALES', status: 'ACTIVE' },
          select: { id: true },
        })

        if (salesUsers.length) {
          await tx.notification.createMany({
            data: salesUsers.map((sales) => ({
              userId: sales.id,
              type: 'DELIVERY_UPDATE',
              title: status === DeliveryStatus.IN_TRANSIT ? 'Order In Transit' : 'Delivery Issue Reported',
              message: `Rider ${user.name} updated ${withOrderDetails(order).reference} to ${status.replace(/_/g, ' ')}${reason ? `: ${reason}` : ''}.`,
              link: '/sales/orders',
            })),
          })
        }

        return ord
      })

      return res.status(200).json({ ok: true, order: withOrderDetails(updated) })
    } catch (error: any) {
      console.error('Rider PATCH error:', error)
      return res.status(500).json({ error: error.message || 'Failed to update delivery status' })
    }
  }

  // POST: Photo Proof of Delivery submission and completion
  if (req.method === 'POST') {
    const { orderId, imageData, recipientName, notes } = req.body || {}

    if (!orderId || !imageData) {
      return res.status(400).json({ error: 'Order ID and photo proof image are required' })
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id: String(orderId) },
        include: { items: true, proofOfDelivery: true },
      })

      if (!order) return res.status(404).json({ error: 'Order not found' })

      if (order.riderId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You are not assigned to this delivery' })
      }

      if (order.deliveryStatus === DeliveryStatus.DELIVERED && order.proofOfDelivery) {
        return res.status(409).json({ error: 'This delivery has already been marked as DELIVERED with proof.' })
      }

      // Upload photo proof to Cloudinary
      const uploadResult = await uploadToCloudinary(String(imageData).trim(), 'elettro-delivery-proof')
      if (!uploadResult || !uploadResult.secure_url) {
        return res.status(500).json({
          error: 'Failed to securely upload proof photograph to Cloudinary. Please try again.',
        })
      }

      const trackingNumber = order.trackingNumber || `ELE-DLV-${new Date(order.createdAt).getFullYear()}-${order.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`

      const result = await prisma.$transaction(async (tx) => {
        // Create or update ProofOfDelivery
        const proof = await tx.proofOfDelivery.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            trackingNumber,
            riderId: user.id,
            imageUrl: uploadResult.secure_url,
            imagePublicId: uploadResult.public_id,
            notes: notes ? String(notes).trim() : null,
            recipientName: recipientName ? String(recipientName).trim() : order.clientName,
            deliveredAt: new Date(),
          },
          update: {
            imageUrl: uploadResult.secure_url,
            imagePublicId: uploadResult.public_id,
            notes: notes ? String(notes).trim() : null,
            recipientName: recipientName ? String(recipientName).trim() : order.clientName,
            deliveredAt: new Date(),
          },
        })

        // Log DeliveryHistory
        await tx.deliveryHistory.create({
          data: {
            orderId: order.id,
            trackingNumber,
            status: DeliveryStatus.DELIVERED,
            actorId: user.id,
            actorRole: 'RIDER',
            notes: notes ? `Delivered with photo proof. Notes: ${notes}` : 'Delivered with photo proof.',
          },
        })

        // Update Order to DELIVERED
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            deliveryStatus: DeliveryStatus.DELIVERED,
            status: OrderStatus.DELIVERED,
            trackingNumber,
            updatedAt: new Date(),
          },
        })

        // Notify client
        await tx.notification.create({
          data: {
            userId: order.clientId,
            type: 'ORDER_DELIVERED',
            title: 'Order Delivered',
            message: `Your order ${withOrderDetails(order).reference} has been delivered by rider ${user.name}.`,
            link: '/client/dashboard',
          },
        }).catch(() => {})

        // Notify sales officers
        const salesWorkers = await tx.user.findMany({
          where: { role: 'SALES', status: 'ACTIVE' },
          select: { id: true },
        })

        if (salesWorkers.length) {
          await tx.notification.createMany({
            data: salesWorkers.map((sales) => ({
              userId: sales.id,
              type: 'DELIVERY_COMPLETED',
              title: 'Delivery Completed',
              message: `Order ${withOrderDetails(order).reference} was delivered by ${user.name}. Proof photo is available for review.`,
              link: '/sales/orders',
            })),
          }).catch(() => {})
        }

        return { order: updatedOrder, proof }
      })

      return res.status(200).json({
        ok: true,
        order: withOrderDetails(result.order),
        proof: result.proof,
      })
    } catch (error: any) {
      console.error('Rider POST error:', error)
      return res.status(500).json({ error: error.message || 'Failed to complete delivery with proof' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
