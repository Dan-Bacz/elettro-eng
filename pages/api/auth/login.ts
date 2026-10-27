import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { serialize } from 'cookie'
import { getJwtSecret } from '../../../lib/auth'
import { isRateLimited } from '../../../lib/client-auth'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const expectedRole = String(req.body?.expectedRole || '').trim().toUpperCase()
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' })
  if (expectedRole && expectedRole !== 'WAREHOUSE') {
    return res.status(400).json({ error: 'Unsupported sign-in portal' })
  }

  try {
    if (await isRateLimited(req, 'staff-login', 10, 15 * 60 * 1000, email)) {
      return res.status(429).json({ error: 'Too many sign-in attempts. Please wait and try again.' })
    }
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const u: any = user
    if (!u.password) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, u.password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    if (u.role === 'CLIENT') {
      return res.status(403).json({ error: 'Client accounts must use the client sign-in page.' })
    }

    if (expectedRole && u.role !== expectedRole) {
      return res.status(403).json({ error: 'This sign-in page is for Warehouse accounts. Use the sign-in page for your department.' })
    }

    if (u.role !== 'ADMIN' && u.role !== 'TECH' && u.role !== 'SALES' && u.role !== 'WAREHOUSE') {
      return res.status(403).json({ error: 'Client accounts must use the client sign-in page.' })
    }

    if (u.role !== 'ADMIN') {
      const status = u.status || (u.approved ? 'ACTIVE' : 'PENDING')
      if (status === 'PENDING') {
        return res.status(403).json({ error: 'Your account is pending admin activation. Please wait for an administrator to activate it before logging in.' })
      }
      if (status === 'REJECTED') {
        return res.status(403).json({ error: u.rejectionReason ? `Your registration was rejected: ${u.rejectionReason}` : 'Your registration was rejected by the administrator. Please contact support for more information.' })
      }
      if (status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Your account has been suspended by an administrator. Please contact support for more information.' })
      }
      // ACTIVE technicians can sign in from the technician web dashboard or the Android app
    }

    const token = jwt.sign({ userId: user.id, role: user.role, status: u.status }, getJwtSecret(), { expiresIn: '7d' })
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