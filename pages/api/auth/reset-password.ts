import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { checkResetCode, isValidEmail } from '../../../lib/password-reset'

const prisma = new PrismaClient()

const MIN_PASSWORD_LENGTH = 6

/**
 * Final step: re-checks the emailed code and, if valid, replaces the password.
 * The code is burned on success (and on expiry/failed attempts) inside
 * checkResetCode, so it can never be replayed.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const code = String(req.body?.code ?? '').trim()
  const password = String(req.body?.password ?? '')

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Enter a valid email address' })
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
  }

  try {
    const result = await checkResetCode(email, code)
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, error: result.error })
    }

    const hashed = await bcrypt.hash(password, 10)
    const usedAt = new Date()
    await prisma.$transaction([
      prisma.user.update({ where: { id: result.userId }, data: { password: hashed } }),
      prisma.passwordResetCode.update({ where: { id: result.recordId }, data: { usedAt } }),
      prisma.passwordResetCode.updateMany({ where: { userId: result.userId, usedAt: null }, data: { usedAt } }),
    ])

    return res.status(200).json({ ok: true, message: 'Your password has been reset. You can sign in now.' })
  } catch (err) {
    console.error('reset-password: unexpected error', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '16kb' } },
}
