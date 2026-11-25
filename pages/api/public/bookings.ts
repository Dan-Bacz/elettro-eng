import { PrismaClient } from '@prisma/client'
import { uploadToCloudinary } from '../../../lib/cloudinary'
import { sendBookingSubmittedNotification } from '../../../lib/email'
import { sendTextbeeSms, BOOKING_SUBMITTED_SMS_MESSAGE } from '../../../lib/textbee'
import { requireVerifiedClient } from '../../../lib/client-auth'

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
    service,
    preferredDate,
    preferredTime,
    province,
    cityMunicipality,
    barangay,
    fullAddress,
    projectLocation,
    offeringDetails,
    estimatedAmount,
    bookingQuestions,
    description,
    buildingType,
    installations,
    offerings,
    attachment,
  } = req.body || {}

  if (!service || !String(service).trim()) {
    return res.status(400).json({ error: 'Please select a service' })
  }

  const cleanDate = String(preferredDate || '').trim()
  const cleanTime = String(preferredTime || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return res.status(400).json({ error: 'Please choose a valid booking date.' })
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cleanTime)) return res.status(400).json({ error: 'Please choose a booking time.' })
  const bookingDay = new Date(`${cleanDate}T00:00:00.000Z`)
  const [hour, minute] = cleanTime.split(':').map(Number)
  if (bookingDay.getUTCDay() === 0) return res.status(400).json({ error: 'Bookings are unavailable every Sunday.' })
  if (hour < 6 || hour > 18 || (hour === 18 && minute > 0)) return res.status(400).json({ error: 'Bookings are available from 6:00 AM to 6:00 PM.' })

  try {
    const client = await requireVerifiedClient(req, res)
    if (!client) return

    const blackout = await prisma.bookingBlackoutDate.findUnique({ where: { date: bookingDay }, select: { reason: true } })
    if (blackout) return res.status(400).json({ error: blackout.reason || 'This date is fully booked. Please choose another date.' })

    const cleanName = client.name
    const cleanEmail = client.email
    const phone = client.phone

    // Optional project photo -> Cloudinary
    let attachmentUrl: string | null = null
    const rawAttachment = attachment ? String(attachment).trim() : ''
    if (rawAttachment && rawAttachment.startsWith('data:')) {
      const uploaded = await uploadToCloudinary(rawAttachment, 'elettro-bookings')
      if (uploaded) attachmentUrl = uploaded.secure_url
    }

    const title = String(service).trim()
    const locationParts = [province, cityMunicipality, barangay, fullAddress]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
    const cleanProjectLocation = locationParts.length
      ? locationParts.join(', ')
      : String(projectLocation || '').trim()

    if (!cleanProjectLocation) {
      return res.status(400).json({ error: 'Please provide the complete Mindanao booking address.' })
    }

    const cleanEstimate = Number(estimatedAmount)
    const cleanQuestions = Array.isArray(bookingQuestions)
      ? bookingQuestions
        .map((item: any) => ({
          offering: String(item?.offering || '').trim(),
          question: String(item?.question || '').trim(),
          answer: String(item?.answer || '').trim(),
        }))
        .filter((item: { offering: string; question: string; answer: string }) => item.question && item.answer)
      : []
    const cleanOfferingDetails = Array.isArray(offeringDetails)
      ? offeringDetails
        .map((item: any) => ({ name: String(item?.name || '').trim(), price: Number(item?.price) }))
        .filter((item: { name: string; price: number }) => item.name && Number.isFinite(item.price))
      : []

    const selectedOffers = Array.isArray(offerings) && offerings.length
      ? offerings.map((i: string) => String(i).trim()).filter(Boolean)
      : Array.isArray(installations) && installations.length
        ? installations.map((i: string) => String(i).trim()).filter(Boolean)
        : []

    const details = [
      cleanName ? `Client name: ${cleanName}` : '',
      cleanEmail ? `Client email: ${cleanEmail}` : '',
      phone ? `Client phone: ${String(phone).trim()}` : '',
      selectedOffers.length ? `Selected offerings: ${selectedOffers.join(', ')}` : '',
      cleanOfferingDetails.length ? `Offering prices: ${cleanOfferingDetails.map((item: { name: string; price: number }) => `${item.name} (₱${item.price.toLocaleString()})`).join(', ')}` : '',
      Number.isFinite(cleanEstimate) && cleanEstimate > 0 ? `Estimated partial amount: ₱${cleanEstimate.toLocaleString()}` : '',
      buildingType ? `Building type: ${String(buildingType).trim()}` : '',
      `Location: ${cleanProjectLocation}`,
      preferredDate ? `Preferred date: ${String(preferredDate).trim()}` : '',
      preferredTime ? `Preferred time: ${String(preferredTime).trim()}` : '',
      cleanQuestions.length ? `Booking questions:\n${cleanQuestions.map((item: { offering: string; question: string; answer: string }) => `- ${item.offering}: ${item.question}\n  Answer: ${item.answer}`).join('\n')}` : '',
      description ? String(description).trim() : '',
      attachmentUrl ? `Attachment: ${attachmentUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          clientId: client.id,
          title,
          description: details || null,
          status: 'PENDING',
          startDate: new Date(`${cleanDate}T${cleanTime}:00.000Z`),
        },
      })

      const reference = `ELT-${created.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

      await tx.notification.create({
        data: {
          userId: client.id,
          type: 'BOOKING',
          title: 'Service Booking Submitted',
          message: `Your booking ${reference} was received and is under review.`,
          link: `/client/dashboard#booking-${created.id}`,
        },
      })

      return created
    })

    const reference = `ELT-${booking.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

    // Notify the client by email (non-blocking failure)
    void sendBookingSubmittedNotification({
      name: cleanName,
      email: cleanEmail,
      service: title,
      reference,
      buildingType: buildingType ? String(buildingType).trim() : undefined,
      offerings: selectedOffers,
      preferredDate: cleanDate,
      preferredTime: cleanTime,
      address: cleanProjectLocation,
      estimatedAmount: Number.isFinite(cleanEstimate) && cleanEstimate > 0 ? cleanEstimate : undefined,
    })

    // Notify the client by SMS via the TextBee Android gateway (non-blocking failure)
    void sendTextbeeSms(phone ? String(phone).trim() : null, BOOKING_SUBMITTED_SMS_MESSAGE)

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
