import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  try {
    await prisma.$connect()
    const userCount = await prisma.user.count()
    return res.json({ ok: true, userCount })
  } catch (err: any) {
    console.error('Prisma debug error:', err)
    return res.status(500).json({ ok: false, error: String(err), stack: err?.stack })
  } finally {
    try { await prisma.$disconnect() } catch(e) { /* ignore */ }
  }
}
