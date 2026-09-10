import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { serialize } from 'cookie'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' })

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const u: any = user
    if (!u.password) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, u.password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    if (u.role === 'TECH' && !u.approved) {
      return res.status(403).json({ error: 'Your account is pending admin approval. Please wait for an administrator to approve your registration before logging in.' })
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })
    const cookie = serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    })
    res.setHeader('Set-Cookie', cookie)

    return res.json({ ok: true, token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
