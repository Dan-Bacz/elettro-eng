import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import { sendOrderSubmittedNotification } from '../../../lib/email'
import { requireVerifiedClient } from '../../../lib/client-auth'

const prisma = new PrismaClient()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}?/
const PHONE_RE = /^(\+?\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?[\d\s-]{7,14}?/
const MAX_LINE_QTY = 999

// Normalize the friendly payment method labels used on the storefront into a
// canonical stored value.
const PAYMENT_METHOD_ALIASES: Record<string, string> = {
  GCASH: 'GCASH',
  G_CASH: 'GCASH',
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
  COD: 'CASH_ON_DELIVERY',
  CASH_ON_PICKUP: 'CASH_ON_PICKUP',
}

function isValidEmail(email: string) {
  return EMAIL_RE.test(String(email || '').trim())
}

function isValidPhone(phone: string) {
  if (!phone || !String(phone).trim()) return false
  const digits = String(phone).replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15 && PHONE_RE.test(String(phone).trim())
}

function cleanText(value: unknown, maxLen: number): string {
  const s = String(value || '').trim().replace(/\s+/g, ' ')
  return s.slice(0, maxLen)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body || {}
  let client

  try {
    client = await requireVerifiedClient(req, res)
  } catch (error) {
    console.error('Public order authentication failed:', error)
    return res.status(500).json({ error: 'Could not verify your client account.' })
  }

  if (!client) return

  const clientName = client.name
  const email = client.email
  const phone = client.phone || ''
  const { items } = body

  if (!clientName || !String(clientName).trim()) {
    return res.status(400).json({ error: 'Full name is required' })
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required' })
  }

  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: 'A valid phone number is required' })
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Please select at least one product to order' })
  }

  const fulfillmentMethod = String(body.fulfillmentMethod || 'DELIVERY').trim().toUpperCase()
  if (!['DELIVERY', 'PICKUP'].includes(fulfillmentMethod)) {
    return res.status(400).json({ error: 'Choose delivery or pickup' })
  }

  // ---- delivery information ----
  const address = cleanText(body.address, 300)
  const barangay = cleanText(body.barangay, 120)
  const city = cleanText(body.city, 120)
  const province = cleanText(body.province, 120)
  const postalCode = cleanText(body.postalCode, 20).replace(/[^0-9]/g, '')
  const deliveryNotes = cleanText(body.deliveryNotes || body.notes, 500)

  if (fulfillmentMethod === 'DELIVERY' && !address) return res.status(400).json({ error: 'Complete delivery address is required' })
  if (fulfillmentMethod === 'DELIVERY' && !city) return res.status(400).json({ error: 'Municipality / City is required' })
  if (fulfillmentMethod === 'DELIVERY' && !province) return res.status(400).json({ error: 'Province is required' })

  if (postalCode && !/^\d{4}?/.test(postalCode)) {
    return res.status(400).json({ error: 'Postal code must be a 4-digit number' })
  }

  // ---- payment method ----
  const rawMethod = String(body.paymentMethod || 'CASH_ON_DELIVERY').trim().toUpperCase().replace(/[\s-]+/g, '_')
  const paymentMethod = PAYMENT_METHOD_ALIASES[rawMethod]

  if (!paymentMethod) return res.status(400).json({ error: 'Choose a supported payment method' })

  if (paymentMethod === 'CASH_ON_DELIVERY' && fulfillmentMethod !== 'DELIVERY') {
    return res.status(400).json({ error: 'Cash on delivery is only available for delivery orders' })
  }

  if (paymentMethod === 'CASH_ON_PICKUP' && fulfillmentMethod !== 'PICKUP') {
    return res.status(400).json({ error: 'Cash on pickup is only available for pickup orders' })
  }

  if (paymentMethod === 'GCASH' && (!process.env.NEXT_PUBLIC_GCASH_ACCOUNT_NAME || !process.env.NEXT_PUBLIC_GCASH_ACCOUNT_NUMBER)) {
    return res.status(503).json({ error: 'GCash payment is not configured yet. Please choose cash or try again later.' })
  }

  const paymentStatus = paymentMethod === 'GCASH' ? 'UNPAID' : 'CASH_DUE'

  try {
    const cleanEmail = String(email).trim().toLowerCase()
    const cleanName = String(clientName).trim()
    const cleanPhone = String(phone).trim()

    // Shipping is confirmed by the team after review - never trusted from the
    // browser. Everything below is recomputed from database values.
    const shipping = 0

    // Deduplicate items by inventory id.
    const grouped = new Map<string, { inventoryItemId: string; quantity: number }>()
    for (const it of items) {
      const id = String(it?.inventoryItemId || '').trim()
      const qty = it?.quantity
      // Reject negative / zero / non-integer quantities instead of silently fixing them.
      const num = Number(qty)
      if (!id || !Number.isFinite(num)) continue
      if (Math.floor(num) !== num || num < 1 || num > MAX_LINE_QTY) {
        return res.status(400).json({ error: 'Quantity must be a whole number between 1 and 999' })
      }
      grouped.set(id, { inventoryItemId: id, quantity: (grouped.get(id)?.quantity || 0) + num })
    }

    if (grouped.size === 0) {
      return res.status(400).json({ error: 'Please select at least one product to order' })
    }

    const productIds = [...grouped.keys()]
    const products = await prisma.inventoryItem.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, unit: true, sellPrice: true, quantity: true },
    })

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One of the selected products is no longer available' })
    }

    const productById = new Map(products.map((p) => [p.id, p]))

    // Validate stock availability before persisting anything.
    for (const id of productIds) {
      const p = productById.get(id)!
      const qty = grouped.get(id)!.quantity
      if (Number(p.quantity) < qty) {
        return res.status(400).json({ error: `Insufficient stock for ${p.name}` })
      }
    }

    // Recalculate everything from the database. Reject items that have no
    // configured selling price (card UI disables carting those).
    let total = 0
    const orderItems = productIds.map((id) => {
      const p = productById.get(id)!
      const qty = grouped.get(id)!.quantity
      const price = p.sellPrice != null && Number(p.sellPrice) > 0 ? Number(p.sellPrice) : null
      if (price == null) throw new Error(`Selling price is not set for ${p.name}`)
      total += price * qty
      return {
        inventoryItemId: p.id,
        name: p.name,
        quantity: qty,
        unit: p.unit || 'pcs',
        unitPrice: round2(price),
      }
    })

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          clientId: client.id,
          clientName: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          address: address || null,
          barangay: barangay || null,
          city: city || null,
          province: province || null,
          postalCode: postalCode || null,
          deliveryNotes: deliveryNotes || null,
          notes: deliveryNotes || null,
          paymentMethod,
          paymentStatus,
          fulfillmentMethod,
          shippingConfirmed: fulfillmentMethod === 'PICKUP',
          shipping,
          status: 'PENDING',
          total: round2(total),
          items: { create: orderItems },
        },
        include: { items: true },
      })

      const reference = `ORD-${created.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

      const requestItems = created.items.map((item) => {
        if (!item.inventoryItemId) throw new Error('ORDER_ITEM_MISSING_INVENTORY')
        return {
          inventoryItemId: item.inventoryItemId,
          orderItemId: item.id,
          requestedQuantity: item.quantity,
          unit: item.unit || 'pcs',
        }
      })

      const requestId = randomUUID()
      const warehouseReference = `WHR-${new Date().getFullYear()}-${requestId.slice(0, 8).toUpperCase()}`

      await tx.warehouseRequest.create({
        data: {
          id: requestId,
          reference: warehouseReference,
          source: 'CLIENT_ORDER',
          requesterId: client.id,
          orderId: created.id,
          customerReference: cleanName,
          idempotencyKey: `CLIENT-ORDER-${created.id}`,
          items: {
            create: requestItems,
          },
        },
      })

      await tx.notification.create({
        data: {
          userId: client.id,
          type: 'ORDER',
          title: 'Order Placed',
          message: `Your order ${reference} was received. Track payment and fulfillment updates in your dashboard.`,
          link: '/client/dashboard#orders',
        },
      })

      const warehouseWorkers = await tx.user.findMany({
        where: { role: 'WAREHOUSE', status: 'ACTIVE' },
        select: { id: true },
      })

      if (warehouseWorkers.length) {
        await tx.notification.createMany({
          data: warehouseWorkers.map((worker) => ({
            userId: worker.id,
            type: 'WAREHOUSE_REQUEST',
            title: 'New Client Order Request',
            message: `Order ${reference} is waiting for review.`,
            link: '/warehouse/requests',
          })),
        })
      }

      return created
    })

    const reference = `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

    // Notify admins in-app so it shows up in the notifications center.
    try {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: 'ORDER',
            title: 'New Product Order',
            message: `${cleanName} (${cleanEmail}) placed a ${fulfillmentMethod.toLowerCase()} order for ${orderItems.length} item(s) worth ₱${round2(total).toLocaleString()} via ${paymentMethod}.`,
            link: '/admin/orders',
          })),
        })
      }
    } catch (error) {
      console.error('Failed to notify admins about a new product order:', error)
    }

    // Notify the client by email (non-blocking failure)
    void sendOrderSubmittedNotification({
      name: cleanName,
      email: cleanEmail,
      reference,
      items: orderItems.map((it) => ({ name: it.name, quantity: it.quantity, unit: it.unit, unitPrice: it.unitPrice })),
      total,
    })

    return res.status(201).json({
      ok: true,
      id: order.id,
      reference,
      paymentMethod,
      paymentStatus,
      fulfillmentMethod,
      status: 'PENDING',
      total: round2(total),
      message: `Order submitted successfully. Your reference number is ${reference}.`,
    })
  } catch (error: any) {
    console.error('Public order API error', error)
    if (error?.message === 'ORDER_ITEM_MISSING_INVENTORY') {
      return res.status(409).json({ error: 'The order contains an item without an inventory record and could not be submitted.' })
    }
    return res.status(500).json({ error: error?.message || 'Failed to submit order' })
  }
}
