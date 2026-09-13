import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { serialize } from 'cookie'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password, client } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' })

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const u: any = user
    if (!u.password) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, u.password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    if (u.role === 'TECH') {
      const status = u.status || (u.approved ? 'ACTIVE' : 'PENDING')
      if (status === 'PENDING') {
        return res.status(403).json({ error: 'Your account is pending admin approval. Please wait for an administrator to approve your registration before logging in.' })
      }
      if (status === 'REJECTED') {
        return res.status(403).json({ error: u.rejectionReason ? `Your registration was rejected: ${u.rejectionReason}` : 'Your registration was rejected by the administrator. Please contact support for more information.' })
      }
      if (status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Your account has been suspended by an administrator. Please contact support for more information.' })
      }
      // ACTIVE technicians can sign in from the technician web dashboard or the Android app
    }

    const token = jwt.sign({ userId: user.id, role: user.role, status: u.status }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })
    const cookie = serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    })
    res.setHeader('Set-Cookie', cookie)

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: u.status || (u.approved ? 'ACTIVE' : 'PENDING'),
        name: user.name
      }
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}