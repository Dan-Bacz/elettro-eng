import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const reports = await prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
          booking: { select: { id: true, title: true, status: true, clientId: true } }
        }
      })
      const activities = await prisma.technicianActivity.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          tech: { select: { id: true, name: true, email: true } },
          booking: { select: { id: true, title: true, status: true } }
        }
      })
      return res.json({ reports, activities })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch reports' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { authorId, bookingId, content } = req.body
      if (!authorId || !bookingId || !content) {
        return res.status(400).json({ error: 'Author, booking, and content are required' })
      }
      const newReport = await prisma.report.create({
        data: { authorId, bookingId, content },
        include: {
          author: { select: { id: true, name: true } },
          booking: { select: { id: true, title: true } }
        }
      })
      return res.status(201).json(newReport)
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to create report' })
    }
  }

  return res.status(405).end()
}
