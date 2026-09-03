import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  if (req.method === 'GET'){
    const list = await prisma.booking.findMany({})
    return res.json(list)
  }

  if (req.method === 'POST'){
    const data = req.body
    const b = await prisma.booking.create({ data })
    return res.status(201).json(b)
  }

  return res.status(405).end()
}
