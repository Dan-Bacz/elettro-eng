import { PrismaClient } from '@prisma/client'
import { uploadToCloudinary } from '../../../lib/cloudinary'
import { sendBookingSubmittedNotification } from '../../../lib/email'

const prisma = new PrismaClient()

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
}

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
    buildingType,
    installations,
    offerings,
    attachment,
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

    // Optional project photo -> Cloudinary
    let attachmentUrl: string | null = null
    const rawAttachment = attachment ? String(attachment).trim() : ''
    if (rawAttachment && rawAttachment.startsWith('data:')) {
      const uploaded = await uploadToCloudinary(rawAttachment, 'elettro-bookings')
      if (uploaded) attachmentUrl = uploaded.secure_url
    }

    const title = String(service).trim()
    const selectedOffers = Array.isArray(offerings) && offerings.length
      ? offerings.map((i: string) => String(i).trim()).filter(Boolean)
      : Array.isArray(installations) && installations.length
        ? installations.map((i: string) => String(i).trim()).filter(Boolean)
        : []
    const details = [
      selectedOffers.length ? `Selected offerings: ${selectedOffers.join(', ')}` : '',
      buildingType ? `Building type: ${String(buildingType).trim()}` : '',
      projectLocation ? `Location: ${String(projectLocation).trim()}` : '',
      preferredDate ? `Preferred date: ${String(preferredDate).trim()}` : '',
      preferredTime ? `Preferred time: ${String(preferredTime).trim()}` : '',
      description ? String(description).trim() : '',
      attachmentUrl ? `Attachment: ${attachmentUrl}` : '',
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

    // Notify the client by email (non-blocking failure)
    void sendBookingSubmittedNotification({
      name: String(clientName).trim(),
      email: cleanEmail,
      service: title,
      reference,
      buildingType: buildingType ? String(buildingType).trim() : undefined,
      offerings: selectedOffers,
      preferredDate: preferredDate ? String(preferredDate).trim() : undefined,
      preferredTime: preferredTime ? String(preferredTime).trim() : undefined,
      address: projectLocation ? String(projectLocation).trim() : undefined,
    })

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