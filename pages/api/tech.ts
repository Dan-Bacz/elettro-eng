import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default async function handler(req, res){
  if (req.method === 'POST'){
    const { techId, bookingId, message } = req.body
    const act = await prisma.technicianActivity.create({ data: { techId, bookingId, message }})
    return res.status(201).json(act)
  }

  return res.status(405).end()
}
