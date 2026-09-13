import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
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

      const { role } = req.query || {}
      const where: any = {}
      if (role === 'TECH') where.role = 'TECH'
      else if (role === 'CLIENT') where.role = 'CLIENT'
      else if (role === 'ADMIN') where.role = 'ADMIN'
      else where.role = { in: ['ADMIN', 'TECH', 'CLIENT'] }

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