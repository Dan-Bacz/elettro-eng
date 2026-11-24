import type { NextApiRequest, NextApiResponse } from 'next'
import { requireVerifiedClient } from '../../../lib/client-auth'
import { prisma } from '../../../lib/prisma'
import { SERVICES } from '../../../components/client/siteData'

type SupportResponse = { reply: string }

function money(value: number) {
  return `₱${value.toLocaleString('en-PH')}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SupportResponse | { error: string }>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const client = await requireVerifiedClient(req, res)
    if (!client) return

    const message = String(req.body?.message || '').trim().slice(0, 600)
    if (!message) return res.status(400).json({ error: 'Please enter a support question.' })

    const bookings = await prisma.booking.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { title: true, status: true, createdAt: true },
    })

    const lower = message.toLowerCase()
    const latest = bookings[0]
    let reply = "I can help with Elettro services, bookings, orders, and account questions. What would you like to know?"

    if (/(hello|hi|hey|good morning|good afternoon)/.test(lower)) {
      reply = `Hello ${client.name.split(' ')[0]}! I’m Elettro AI Support. I can help you check bookings, choose a service, or understand the next steps.`
    } else if (/(status|track|where|progress).*(booking|request|project)|(booking|request|project).*(status|track|progress)/.test(lower)) {
      reply = latest
        ? `Your latest booking for “${latest.title}” is currently ${latest.status.replace(/_/g, ' ').toLowerCase()}. You can open My Bookings for the complete timeline and technician updates.`
        : "You do not have a service booking yet. Open View Services to choose a service and submit a request."
    } else if (/(book|booking|request|schedule|appointment)/.test(lower)) {
      reply = "To book a service, open View Services, choose a service, select an offering, answer the project questions, and submit your preferred schedule and Mindanao project address."
    } else if (/(price|cost|budget|estimate|fee|peso|₱)/.test(lower)) {
      const service = SERVICES.find((item) => lower.includes(item.title.toLowerCase()))
      if (service) {
        const starting = Math.min(...service.offerings.map((item) => item.price))
        reply = `${service.title} offerings have starting partial estimates from ${money(starting)}. The booking form shows each selected offering and asks project-specific questions. The final amount is confirmed after review and site assessment.`
      } else {
        reply = "Each service offering has a partial estimate shown in the booking form. Select the service and offering you need to see the amount; final pricing is confirmed after project review and site assessment."
      }
    } else if (/(service|install|repair|maintenance|solar|lighting|wiring)/.test(lower)) {
      reply = `Elettro provides ${SERVICES.map((item) => item.title).join(', ')}. Open View Services to compare offerings and start a booking request.`
    } else if (/(order|product|stock|material|buy|purchase)/.test(lower)) {
      reply = "For electrical materials and products, open View Products. You can add items to your cart, choose delivery or pickup, and follow the order status from My Orders."
    } else if (/(reject|decline|cancel)/.test(lower)) {
      reply = "If a booking is rejected, you will receive an in-portal notification and SMS on your registered phone number. Contact Elettro support if you need clarification about the decision."
    } else if (/(approve|confirm)/.test(lower)) {
      reply = "After admin review, an approved booking becomes a project. You will receive an in-portal notification and SMS, then you can monitor technician assignment and progress from your dashboard."
    } else if (/(contact|phone|email|support|human|staff|team)/.test(lower)) {
      reply = "You can contact Elettro Engineering Enterprises through the support details on the public Contact page. For an existing request, include your booking reference so the team can assist faster."
    }

    return res.status(200).json({ reply })
  } catch (error) {
    console.error('Client support assistant failed:', error)
    return res.status(500).json({ error: 'The support assistant is temporarily unavailable. Please try again.' })
  }
}
