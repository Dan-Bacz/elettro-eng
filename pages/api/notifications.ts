import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

function getToken(req: any) {
  const authorization = req.headers.authorization || ''
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) return authorization.slice(7)
  return req.cookies?.token || null
}

export default async function handler(req: any, res: any) {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Authentication required' })

    let payload: any
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    } catch {
      return res.status(401).json({ error: 'Invalid session' })
    }
    const userId = payload.userId
    if (!userId) return res.status(401).json({ error: 'Invalid session' })

    if (req.method === 'GET') {
      const queryRole = String(req.query.role || '').toUpperCase()
      const where: any = userId ? { userId } : {}
      if (queryRole === 'ALL') delete where.userId
      const notifications = await prisma.notification.findMany({
        where: { userId: where.userId as string },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
      const unread = notifications.filter((n) => !n.read).length
      return res.json({ notifications, unread })
    }

    if (req.method === 'POST') {
      const { title, message, type, link } = req.body || {}
      if (!title) return res.status(400).json({ error: 'Notification title is required' })
      const notification = await prisma.notification.create({
        data: { userId, title, message: message || null, type: type || 'INFO', link: link || null }
      })
      return res.status(201).json(notification)
    }

    if (req.method === 'PATCH') {
      const { id, markAll } = req.body || {}
      if (id) {
        const notification = await prisma.notification.updateMany({
          where: { id: String(id), userId },
          data: { read: true }
        })
        return res.json({ ok: true, updated: notification.count })
      }
      if (markAll) {
        const updated = await prisma.notification.updateMany({ where: { userId }, data: { read: true } })
        return res.json({ ok: true, updated: updated.count })
      }
      return res.status(400).json({ error: 'Notification id or markAll is required' })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {}
      if (!id) return res.status(400).json({ error: 'Notification id is required' })
      await prisma.notification.deleteMany({ where: { id: String(id), userId } })
      return res.json({ ok: true })
    }

    return res.status(405).end()
  } catch (error: any) {
    console.error('Notifications API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}