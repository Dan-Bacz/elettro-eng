import { PrismaClient } from '@prisma/client'
import { getSessionUser, getTokenFromRequest } from '../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const token = getTokenFromRequest(req)
      if (!token) return res.status(401).json({ error: 'Authentication required' })
      const session = await getSessionUser(token)
      if (!session) return res.status(401).json({ error: 'Invalid session' })
      if (session.role !== 'ADMIN' || session.status !== 'ACTIVE') return res.status(403).json({ error: 'Forbidden' })

      const { role } = req.query || {}
      const where: any = {}
      if (role === 'TECH' || role === 'SALES' || role === 'WAREHOUSE') where.role = role
      else if (role === 'CLIENT') where.role = 'CLIENT'
      else if (role === 'ADMIN') where.role = 'ADMIN'
      else where.role = { in: ['ADMIN', 'SALES', 'WAREHOUSE', 'TECH', 'CLIENT'] }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, phone: true, approved: true, status: true,
          address: true, specialization: true, yearsOfExperience: true, skills: true, profileImageUrl: true,
          rejectionReason: true, createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      return res.json({ users })
    } catch (error: any) {
      console.error('Users API error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }
  return res.status(405).end()
}