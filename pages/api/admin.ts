import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default async function handler(req, res){
  if (req.method === 'POST'){
    const { bookingId, action, assignToId } = req.body
    if (action === 'approve'){
      const b = await prisma.booking.update({ where: { id: bookingId }, data: { status: 'APPROVED' }})
      return res.json(b)
    }

    if (action === 'assign'){
      const b = await prisma.booking.update({ where: { id: bookingId }, data: { assignedToId: assignToId, status: 'ASSIGNED' }})
      return res.json(b)
    }
  }

  return res.status(405).end()
}
