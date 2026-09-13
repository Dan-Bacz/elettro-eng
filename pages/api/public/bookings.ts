import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    clientName,
    email,
    phone,
    service,
    preferredDate,
    preferredTime,
    projectLocation,
    description,
  } = req.body || {}

  if (!clientName || !String(clientName).trim()) {
    return res.status(400).json({ error: 'Full name is required' })
  }
  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: 'Email address is required' })
  }
  if (!service || !String(service).trim()) {
    return res.status(400).json({ error: 'Please select a service' })
  }

  try {
    const cleanEmail = String(email).trim().toLowerCase()

    let client = await prisma.user.findUnique({ where: { email: cleanEmail } })
    if (!client) {
      client = await prisma.user.create({
        data: {
          name: String(clientName).trim(),
          email: cleanEmail,
          phone: phone ? String(phone).trim() : null,
          role: 'CLIENT',
          approved: true,
        },
      })
    }

    const title = String(service).trim()
    const details = [
      description ? String(description).trim() : '',
      projectLocation ? `Location: ${String(projectLocation).trim()}` : '',
      preferredDate ? `Preferred date: ${String(preferredDate).trim()}` : '',
      preferredTime ? `Preferred time: ${String(preferredTime).trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const booking = await prisma.booking.create({
      data: {
        clientId: client.id,
        title,
        description: details || null,
        status: 'PENDING',
        startDate: preferredDate ? new Date(String(preferredDate)) : null,
      },
    })

    const reference = `ELT-${booking.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

    return res.status(201).json({
      ok: true,
      id: booking.id,
      reference,
      message: `Booking submitted successfully. Your reference number is ${reference}.`,
    })
  } catch (error: any) {
    console.error('Public booking API error', error)
    return res.status(500).json({ error: error?.message || 'Failed to submit booking' })
  }
}