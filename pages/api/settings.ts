import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

const SETTING_KEYS = ['orgName', 'supportEmail', 'supportPhone', 'lowStockThreshold', 'address', 'adminEmail'] as const

export default async function handler(req: any, res: any) {
  const authorization = req.headers.authorization || ''
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : req.cookies?.token
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }

  if (req.method === 'GET') {
    try {
      const rows = await prisma.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } })
      const settings: Record<string, string> = {}
      for (const row of rows) settings[row.key] = row.value || ''
      return res.json({ settings })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to load settings' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body?.settings || {}
      const updates: Promise<{ key: string; value: string | null; updatedAt: Date }>[] = []
      for (const key of SETTING_KEYS) {
        if (typeof body[key] === 'string') {
          updates.push(prisma.setting.upsert({
            where: { key },
            update: { value: body[key].trim() },
            create: { key, value: body[key].trim() }
          }))
        }
      }
      await Promise.all(updates)
      return res.json({ ok: true, message: 'Settings saved successfully' })
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to save settings' })
    }
  }

  return res.status(405).end()
}