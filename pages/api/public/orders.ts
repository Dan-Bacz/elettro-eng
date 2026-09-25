import { PrismaClient } from '@prisma/client'
import { sendOrderSubmittedNotification } from '../../../lib/email'

const prisma = new PrismaClient()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^(\+?\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?[\d\s-]{7,14}$/
const MAX_LINE_QTY = 999

// Normalize the friendly payment method labels used on the storefront into a
// canonical stored value.
const PAYMENT_METHOD_ALIASES: Record<string, string> = {
  GCASH: 'GCASH',
  G_CASH: 'GCASH',
  MAYA: 'MAYA',
  MAYA_PAYMAYA: 'MAYA',
  PAYMAYA: 'MAYA',
  CARD: 'CARD',
  CREDIT_CARD: 'CARD',
  CREDIT: 'CARD',
  DEBIT: 'CARD',
  CREDIT_DEBIT_CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  BANK: 'BANK_TRANSFER',
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
  COD: 'CASH_ON_DELIVERY',
  CASH: 'CASH_ON_DELIVERY',
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
  const { clientName, email, phone, items } = body

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

  // ---- delivery information ----
  const address = cleanText(body.address, 300)
  const barangay = cleanText(body.barangay, 120)
  const city = cleanText(body.city, 120)
  const province = cleanText(body.province, 120)
  const postalCode = cleanText(body.postalCode, 20).replace(/[^0-9]/g, '')
  const deliveryNotes = cleanText(body.deliveryNotes || body.notes, 500)

  if (!address) return res.status(400).json({ error: 'Complete delivery address is required' })
  if (!city) return res.status(400).json({ error: 'Municipality / City is required' })
  if (!province) return res.status(400).json({ error: 'Province is required' })
  if (postalCode && !/^\d{4}$/.test(postalCode)) {
    return res.status(400).json({ error: 'Postal code must be a 4-digit number' })
  }

  // ---- payment method ----
  const rawMethod = String(body.paymentMethod || 'CASH_ON_DELIVERY').trim().toUpperCase().replace(/[\s-]+/g, '_')
  const paymentMethod = PAYMENT_METHOD_ALIASES[rawMethod] || 'CASH_ON_DELIVERY'
  const paymentStatus = paymentMethod === 'CASH_ON_DELIVERY' ? 'COD' : 'UNPAID'

  try {
    const cleanEmail = String(email).trim().toLowerCase()
    const cleanName = String(clientName).trim()
    const cleanPhone = String(phone).trim()
    // Shipping is confirmed by the team after review — never trusted from the
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
      return tx.order.create({
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
          shipping,
          status: 'PENDING',
          total: round2(total),
          items: { create: orderItems },
        },
        include: { items: true },
      })
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
          message: `${cleanName} (${cleanEmail}) placed an order for ${orderItems.length} item(s) worth ₱${round2(total).toLocaleString()} via ${paymentMethod}.`,
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
      paymentMethod,
      paymentStatus,
      status: 'PENDING',
      total: round2(total),
      message: `Order submitted successfully. Your reference number is ${reference}.`,
    })
  } catch (error: any) {
    console.error('Public order API error', error)
    return res.status(500).json({ error: error?.message || 'Failed to submit order' })
  }
}