import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { parse } from 'cookie'

const prisma = new PrismaClient()

export default async function handler(req, res){
  try{
    const cookies = parse(req.headers.cookie || '')
    const token = cookies.token
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    let payload: any
    try{
      payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    }catch(e){
      return res.status(401).json({ error: 'Invalid token' })
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return res.status(401).json({ error: 'User not found' })

    return res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } })
  }catch(err){
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
