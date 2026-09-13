import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export type SessionUser = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'TECH' | 'CLIENT'
  approved: boolean
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'
  createdAt: Date
}

// Verifies the JWT and returns the matching user (or null).
export async function getSessionUser(token?: string | null): Promise<SessionUser | null> {
  if (!token) return null
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId?: string }
    if (!payload?.userId) return null
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return null
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as any,
      approved: user.approved,
      status: user.status as any,
      createdAt: user.createdAt,
    }
  } catch (e) {
    return null
  }
}

// Reads the token from a NextApiRequest (Authorization header or cookie).
export function getTokenFromRequest(req: any): string | null {
  const authorization = req.headers?.authorization || ''
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice(7)
  }
  try {
    const cookie = req?.cookies?.token || (typeof req.headers?.cookie === 'string'
      ? req.headers.cookie.split(';').map((c: string) => c.trim()).find((c: string) => c.startsWith('token='))?.slice(6)
      : null)
    return cookie || null
  } catch {
    return null
  }
}