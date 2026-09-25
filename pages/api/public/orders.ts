import { PrismaClient } from '@prisma/client'
import { sendOrderSubmittedNotification } from '../../../lib/email'

const prisma = new PrismaClient()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^(\+?\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?[\d\s-]{7,14}$/

function isValidEmail(email: string) {
  return EMAIL_RE.test(String(email || '').trim())
}

function isValidPhone(phone: string) {
  if (!phone || !String(phone).trim()) return false
  const digits = String(phone).replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15 && PHONE_RE.test(String(phone).trim())
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { clientName, email, phone, items } = req.body || {}

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

  try {
    const cleanEmail = String(email).trim().toLowerCase()
    const cleanName = String(clientName).trim()
    const cleanPhone = String(phone).trim()

    // Deduplicate items by inventory id, clamp quantities.
    const grouped = new Map<string, { inventoryItemId: string; quantity: number }>()
    for (const it of items) {
      const id = String(it?.inventoryItemId || '').trim()
      const qty = Math.max(1, Math.min(999, Math.floor(Number(it?.quantity) || 1)))
      if (!id) continue
      grouped.set(id, { inventoryItemId: id, quantity: (grouped.get(id)?.quantity || 0) + qty })
    }
    if (grouped.size === 0) {
      return res.status(400).json({ error: 'Please select at least one product to order' })
    }

    const productIds = [...grouped.keys()]
    const products = await prisma.inventoryItem.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, unit: true, sellPrice: true, quantity: true },
    })
    const productById = new Map(products.map((p) => [p.id, p]))

    // Validate stock availability before persisting anything.
    for (const id of productIds) {
      const p = productById.get(id)
      if (!p) return res.status(400).json({ error: 'One of the selected products is no longer available' })
      const qty = grouped.get(id)!.quantity
      if (Number(p.quantity) < qty) {
        return res.status(400).json({ error: `Insufficient stock for ${p.name}` })
      }
    }

    // Upsert the client account (passwordless, same pattern as public bookings).
    let client = await prisma.user.findUnique({ where: { email: cleanEmail } })
    if (!client) {
      client = await prisma.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: 'CLIENT',
          approved: true,
        },
      })
    } else if (!client.phone) {
      client = await prisma.user.update({ where: { id: client.id }, data: { phone: cleanPhone } })
    }

    let total = 0
    const orderItems = productIds.map((id) => {
      const p = productById.get(id)!
      const qty = grouped.get(id)!.quantity
      const price = p.sellPrice != null && Number(p.sellPrice) > 0 ? Number(p.sellPrice) : 0
      total += price * qty
      return {
        inventoryItemId: p.id,
        name: p.name,
        quantity: qty,
        unit: p.unit || 'pcs',
        unitPrice: price,
      }
    })

    const order = await prisma.order.create({
      data: {
        clientId: client.id,
        clientName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        status: 'PENDING',
        total,
        items: { create: orderItems },
      },
      include: { items: true },
    })

    const reference = `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

    // Notify admins in-app so it shows up in the notifications center.
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'ORDER',
          title: 'New Product Order',
          message: `${cleanName} (${cleanEmail}) placed an order for ${orderItems.length} item(s) worth ₱${total.toLocaleString()}.`,
          link: '/admin/orders',
        })),
      })
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
      message: `Order submitted successfully. Your reference number is ${reference}.`,
    })
  } catch (error: any) {
    console.error('Public order API error', error)
    return res.status(500).json({ error: error?.message || 'Failed to submit order' })
  }
}