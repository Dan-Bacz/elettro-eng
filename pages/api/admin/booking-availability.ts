import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveRole } from '../../../lib/department-auth'

const prisma = new PrismaClient()

function parseDate(value: unknown) {
  const raw = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const date = new Date(`${raw}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : { raw, date }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireActiveRole(req, res, ['ADMIN'])
  if (!user) return

  if (req.method === 'GET') {
    const dates = await prisma.bookingBlackoutDate.findMany({ orderBy: { date: 'asc' } })
    return res.status(200).json({ dates: dates.map((item) => ({ id: item.id, date: item.date.toISOString().slice(0, 10), reason: item.reason })) })
  }

  const parsed = parseDate(req.body?.date)
  if (!parsed) return res.status(400).json({ error: 'A valid date is required.' })
  if (parsed.date.getUTCDay() === 0) return res.status(400).json({ error: 'Sundays are already unavailable for bookings.' })

  if (req.method === 'POST') {
    const date = await prisma.bookingBlackoutDate.upsert({
      where: { date: parsed.date },
      update: { reason: String(req.body?.reason || 'Fully booked by Admin').trim().slice(0, 200) },
      create: { date: parsed.date, reason: String(req.body?.reason || 'Fully booked by Admin').trim().slice(0, 200), createdById: user.id },
    })
    return res.status(200).json({ date: { id: date.id, date: parsed.raw, reason: date.reason } })
  }

  if (req.method === 'DELETE') {
    await prisma.bookingBlackoutDate.deleteMany({ where: { date: parsed.date } })
    return res.status(200).json({ ok: true, date: parsed.raw })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
