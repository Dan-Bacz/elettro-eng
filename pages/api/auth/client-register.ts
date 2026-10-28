import { randomBytes, createHash } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { isRateLimited } from '../../../lib/client-auth'
import { getClientVerificationUrl, sendClientVerificationEmail } from '../../../lib/email'
import { prisma } from '../../../lib/prisma'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}?/
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000
const GENERIC_MESSAGE = 'Request processed. If this address can be registered, a verification email may be delivered. Delivery is not confirmed here; if no email arrives, try again later.'

function passwordIsValid(password: string) {
  return password.length >= 12 && Buffer.byteLength(password, 'utf8') <= 72
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const name = String(req.body?.name ?? '').trim()
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const phone = String(req.body?.phone ?? '').trim()
  const password = String(req.body?.password ?? '')
  const confirmPassword = String(req.body?.confirmPassword ?? '')

  if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Enter your full name (2–120 characters).' })
  if (!EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' })

  const phoneDigits = phone.replace(/\D/g, '')
  if (phoneDigits.length < 8 || phoneDigits.length > 15) return res.status(400).json({ error: 'Enter a valid contact number.' })

  if (!passwordIsValid(password)) return res.status(400).json({ error: 'Password must be at least 12 characters and no more than 72 UTF-8 bytes.' })
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' })

  try {
    if (await isRateLimited(req, 'client-register', 5, 60 * 60 * 1000, email)) {
      return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' })
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, role: true, status: true, emailVerifiedAt: true },
    })

    if (existing) {
      // If a verified client account exists, prevent re-registration.
      if (existing.role === 'CLIENT' && existing.emailVerifiedAt) {
        return res.status(400).json({ error: 'An account with this email already exists and is verified.' })
      }
      // If a pending client account exists, treat as success (will resend verification in a separate flow).
      if (existing.role === 'CLIENT' && existing.status === 'PENDING' && !existing.emailVerifiedAt) {
        return res.status(200).json({ ok: true, message: GENERIC_MESSAGE })
      }
      // Staff accounts cannot be registered via client portal.
      if (existing.role !== 'CLIENT') {
        return res.status(400).json({ error: 'An account with this email already exists.' })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const now = new Date()
    const token = randomBytes(32).toString('hex')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(now.getTime() + VERIFY_TTL_MS)

    const result = await prisma.$transaction(async (tx) => {
      // Invalidate any existing tokens for this email.
      await tx.emailVerificationToken.updateMany({
        where: { user: { email: { equals: email, mode: 'insensitive' } } },
        data: { expiresAt: now },
      })

      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          role: 'CLIENT',
          status: 'PENDING',
          approved: false,
        },
      })

      const verificationToken = await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      })

      return { user, verificationToken }
    })

    const verificationUrl = getClientVerificationUrl(token)
    await sendClientVerificationEmail({
      email: result.user.email,
      name: result.user.name,
      verificationUrl,
    })

    return res.status(201).json({ ok: true, message: GENERIC_MESSAGE })
  } catch (error) {
    console.error('Client registration error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
}
