import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'

const prisma = new PrismaClient()

function dayStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const dates = await prisma.bookingBlackoutDate.findMany({ orderBy: { date: 'asc' }, select: { date: true, reason: true } })
  return res.status(200).json({ dates: dates.map((item) => ({ date: item.date.toISOString().slice(0, 10), reason: item.reason })) })
}
