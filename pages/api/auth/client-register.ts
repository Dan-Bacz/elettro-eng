import { randomBytes, createHash } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { isRateLimited } from '../../../lib/client-auth'
import { getClientVerificationUrl, sendClientVerificationEmail } from '../../../lib/email'
import { prisma } from '../../../lib/prisma'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
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
    if (await isRateLimited(req, 'client-register', 8, 60 * 60 * 1000, email)) {
      return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' })
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })

    if (!existing || (
      existing.role === 'CLIENT' &&
      !existing.password &&
      !existing.emailVerifiedAt &&
      existing.status !== 'SUSPENDED' &&
      existing.status !== 'REJECTED'
    )) {
      const passwordHash = await bcrypt.hash(password, 12)
      const user = await prisma.$transaction(async (tx) => {
        const account = existing
          ? await tx.user.update({
              where: { id: existing.id },
              data: {
                name,
                email,
                phone,
                password: passwordHash,
                status: 'PENDING',
                approved: false,
                emailVerifiedAt: null,
              },
            })
          : await tx.user.create({
              data: {
                name,
                email,
                phone,
                password: passwordHash,
                role: 'CLIENT',
                status: 'PENDING',
                approved: false,
              },
            })

        const now = new Date()
        await tx.emailVerificationToken.updateMany({
          where: { userId: account.id, usedAt: null },
          data: { usedAt: now },
        })
        const token = randomBytes(32).toString('hex')
        await tx.emailVerificationToken.create({
          data: {
            userId: account.id,
            tokenHash: hashToken(token),
            expiresAt: new Date(now.getTime() + VERIFY_TTL_MS),
          },
        })
        return { id: account.id, token }
      })
      try {
        await sendClientVerificationEmail({
          name,
          email,
          verificationUrl: getClientVerificationUrl(user.token),
        })
      } catch (error) {
        console.error('Client registration verification email delivery failed:', error)
      }
    }

    return res.status(202).json({ ok: true, message: GENERIC_MESSAGE })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(202).json({ ok: true, message: GENERIC_MESSAGE })
    }
    console.error('Client registration failed:', error)
    return res.status(500).json({ error: 'Could not complete registration. Please try again later.' })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '16kb' } },
}
