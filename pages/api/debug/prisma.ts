export default async function handler(req, res) {
  const hasDatabaseUrl = !!process.env.DATABASE_URL
  try {
    // Lazy-import Prisma so build-time issues don't break the route
    let PrismaClient
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      PrismaClient = require('@prisma/client').PrismaClient
    } catch (impErr) {
      console.error('Failed to require @prisma/client:', impErr?.message || impErr)
      return res.status(500).json({ ok: false, message: 'Failed to load Prisma client', details: String(impErr?.message || impErr), hasDatabaseUrl })
    }

    const prisma = new PrismaClient()
    try {
      await prisma.$connect()
      const userCount = await prisma.user.count()
      await prisma.$disconnect()
      return res.json({ ok: true, userCount, hasDatabaseUrl })
    } catch (dbErr) {
      console.error('Prisma runtime error:', dbErr)
      try { await prisma.$disconnect() } catch(e) {}
      return res.status(500).json({ ok: false, message: 'Prisma runtime error', details: String(dbErr), hasDatabaseUrl })
    }
  } catch (err) {
    console.error('Unexpected debug error:', err)
    return res.status(500).json({ ok: false, message: 'Unexpected error', details: String(err) })
  }
}
