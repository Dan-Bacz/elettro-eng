import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { serialize } from 'cookie'
import { getJwtSecret } from '../../../lib/auth'
import { isRateLimited } from '../../../lib/client-auth'
import { prisma } from '../../../lib/prisma'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const INVALID_MESSAGE = 'Invalid email or password, or the account is not verified and active.'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  if (!EMAIL_RE.test(email) || password.length < 1 || password.length > 128) {
    return res.status(401).json({ error: INVALID_MESSAGE })
  }

  try {
    if (await isRateLimited(req, 'client-login', 10, 15 * 60 * 1000, email)) {
      return res.status(429).json({ error: 'Too many sign-in attempts. Please wait and try again.' })
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })
    if (!user || user.role !== 'CLIENT' || !user.password) {
      return res.status(401).json({ error: INVALID_MESSAGE })
    }

    const passwordMatches = await bcrypt.compare(password, user.password)
    if (!passwordMatches || !user.emailVerifiedAt || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: INVALID_MESSAGE })
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, status: user.status },
      getJwtSecret(),
      { expiresIn: '7d' },
    )
    res.setHeader('Set-Cookie', serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    }))
    res.setHeader('Cache-Control', 'no-store')

    return res.status(200).json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (error) {
    console.error('Client login failed:', error)
    return res.status(500).json({ error: 'Could not sign in. Please try again later.' })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '16kb' } },
}
