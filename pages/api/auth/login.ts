import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' })

  try {
    // Look up user in DB
    let user = await prisma.user.findUnique({ where: { email } })

    // If user not found, allow fallback creation using default admin creds.
    // Defaults can be overridden via env: DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD
    const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'eldred@elettro.com'
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'

    if (!user) {
      // If credentials match the default admin, create the user and proceed
      if (email === defaultAdminEmail && password === defaultAdminPassword) {
        const hashed = await bcrypt.hash(defaultAdminPassword, 10)
        try {
          user = await prisma.user.create({
            data: {
              name: 'Admin',
              email: defaultAdminEmail,
              password: hashed,
              role: 'ADMIN'
            }
          })
          console.log('Auto-created default admin user in DB:', user.email)
        } catch (createErr) {
          console.error('Failed to create default admin user:', createErr)
          return res.status(500).json({ error: 'Failed to create admin user. Ensure DATABASE_URL is set in production.' })
        }
      } else {
        return res.status(401).json({ error: 'Invalid credentials' })
      }
    }

    // Cast to any because Prisma generated types may be out-of-sync in some environments
    const u: any = user
    if (!u.password) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, u.password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    // Authentication success. For now, return user basic info.
    return res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  } finally {
    // do not disconnect prisma here for reuse across requests
  }
}
