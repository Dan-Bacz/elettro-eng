import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { parse } from 'cookie'
import { getTokenFromRequest } from '../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(req, res){
  try{
    const token = getTokenFromRequest(req)
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    let payload: any
    try{
      payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    }catch(e){
      return res.status(401).json({ error: 'Invalid token' })
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return res.status(401).json({ error: 'User not found' })

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
        address: user.address,
        specialization: user.specialization,
        yearsOfExperience: user.yearsOfExperience,
        skills: user.skills,
        profileImageUrl: user.profileImageUrl
      }
    })
  }catch(err){
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}