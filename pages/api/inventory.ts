import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default async function handler(req, res){
  if (req.method === 'GET'){
    const items = await prisma.inventoryItem.findMany()
    return res.json(items)
  }

  if (req.method === 'POST'){
    const data = req.body
    const it = await prisma.inventoryItem.create({ data })
    return res.status(201).json(it)
  }

  return res.status(405).end()
}
