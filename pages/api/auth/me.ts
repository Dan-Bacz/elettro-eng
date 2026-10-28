import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { getJwtSecret, getTokenFromRequest } from '../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    let payload: any
    try {
      payload = jwt.verify(token, getJwtSecret())
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return res.status(401).json({ error: 'User not found' })

    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone,
        approved: user.approved,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        address: user.address,
        specialization: user.specialization,
        yearsOfExperience: user.yearsOfExperience,
        skills: user.skills,
        profileImageUrl: user.profileImageUrl
      }
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
