import type { NextApiRequest, NextApiResponse } from 'next'
import { requireVerifiedClient } from '../../../lib/client-auth'
import { prisma } from '../../../lib/prisma'

function orderReference(id: string) {
  return `ORD-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const client = await requireVerifiedClient(req, res)
    if (!client) return

    const orderId = String(req.body?.orderId ?? '').trim()
    const action = String(req.body?.action ?? '')

    if (!orderId) return res.status(400).json({ error: 'Order id is required' })

    const order = await prisma.order.findFirst({
      where: { id: orderId, clientId: client.id },
      select: {
        id: true,
        clientId: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        shippingConfirmed: true,
      },
    })

    if (!order) return res.status(404).json({ error: 'Order not found' })

    if (action === 'submit-payment') {
      if (!process.env.NEXT_PUBLIC_GCASH_ACCOUNT_NAME || !process.env.NEXT_PUBLIC_GCASH_ACCOUNT_NUMBER) {
        return res.status(503).json({ error: 'GCash payment is not configured yet. Please contact ELETTRO.' })
      }

      const paymentReference = String(req.body?.paymentReference ?? '').trim()

      if (
        order.paymentMethod !== 'GCASH' ||
        order.status !== 'APPROVED' ||
        !order.shippingConfirmed ||
        !['UNPAID', 'SUBMITTED'].includes(order.paymentStatus)
      ) {
        return res.status(409).json({ error: 'GCash payment becomes available after the order and delivery fee are confirmed.' })
      }

      if (paymentReference.length < 6 || paymentReference.length > 80) {
        return res.status(400).json({ error: 'Enter a valid GCash transfer reference (6–80 characters).' })
      }

      const updated = await prisma.order.updateMany({
        where: {
          id: order.id,
          clientId: client.id,
          status: 'APPROVED',
          shippingConfirmed: true,
          paymentStatus: order.paymentStatus,
        },
        data: { paymentReference, paymentStatus: 'SUBMITTED' },
      })

      if (updated.count !== 1) return res.status(409).json({ error: 'The order changed. Refresh and try again.' })

      try {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
        if (admins.length) {
          await prisma.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              type: 'ORDER',
              title: 'GCash Payment Submitted',
              message: `${client.name} submitted a GCash payment reference for ${orderReference(order.id)}. Verify the transfer before marking it paid.`,
              link: '/admin/orders',
            })),
          })
        }
      } catch (error) {
        console.error('Could not notify admins about GCash payment:', error)
      }

      try {
        await prisma.notification.create({
          data: {
            userId: client.id,
            type: 'ORDER',
            title: 'Payment Reference Submitted',
            message: `Your GCash reference for ${orderReference(order.id)} was submitted for verification. The order remains unpaid until our team confirms receipt.`,
            link: '/client/dashboard#orders',
          },
        })
      } catch (error) {
        console.error('Could not notify client about submitted payment:', error)
      }

      return res.status(200).json({ ok: true, paymentStatus: 'SUBMITTED' })
    }

    if (action === 'confirm-received') {
      if (!['DELIVERED', 'READY_FOR_PICKUP'].includes(order.status)) {
        return res.status(409).json({ error: 'This order is not ready to be confirmed as received.' })
      }

      const updated = await prisma.order.updateMany({
        where: { id: order.id, clientId: client.id, status: order.status },
        data: { status: 'COMPLETED' },
      })

      if (updated.count !== 1) return res.status(409).json({ error: 'The order changed. Refresh and try again.' })

      try {
        await prisma.notification.create({
          data: {
            userId: client.id,
            type: 'ORDER',
            title: order.status === 'READY_FOR_PICKUP' ? 'Pickup Confirmed' : 'Delivery Confirmed',
            message: `You confirmed receipt of ${orderReference(order.id)}.`,
            link: '/client/dashboard#orders',
          },
        })
      } catch (error) {
        console.error('Could not notify client about order receipt:', error)
      }

      return res.status(200).json({ ok: true, status: 'COMPLETED' })
    }

    return res.status(400).json({ error: 'Unsupported order action' })
  } catch (error) {
    console.error('Client order update failed:', error)
    return res.status(500).json({ error: 'Could not update your order. Please try again later.' })
  }
}
