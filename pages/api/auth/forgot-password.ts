import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { sendPasswordResetCodeEmail } from '../../../lib/email'
import { CODE_TTL_MINUTES, isValidEmail } from '../../../lib/password-reset'

const prisma = new PrismaClient()

const RESEND_COOLDOWN_MS = 60 * 1000
const GENERIC_MESSAGE = 'If that email belongs to an active technician account, a reset code is on its way.'

// Pads the response so the endpoint does not reveal which emails are registered.
const MIN_RESPONSE_MS = 400

function generateCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000
  return String(n).padStart(6, '0')
}

function padResponse(startedAt: number) {
  const wait = Math.max(0, MIN_RESPONSE_MS - (Date.now() - startedAt))
  return new Promise((r) => setTimeout(r, wait))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const startedAt = Date.now()
  const email = String(req.body?.email ?? '').trim().toLowerCase()

  if (!isValidEmail(email)) {
    await padResponse(startedAt)
    return res.status(400).json({ ok: false, error: 'Enter a valid email address' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })

    // Technician accounts only. Unknown emails, admins, clients, and technicians
    // with a non-active status all fall through to the same generic response.
    const eligible = !!user && user.role === 'TECH' && (user.status || 'ACTIVE') === 'ACTIVE' && !!user.password

    if (eligible) {
      const now = new Date()
      const lastCode = await prisma.passwordResetCode.findFirst({
        where: { userId: user!.id },
        orderBy: { createdAt: 'desc' },
      })
      const justSent = lastCode && !lastCode.usedAt && now.getTime() - lastCode.createdAt.getTime() < RESEND_COOLDOWN_MS

      if (!justSent) {
        // Invalidate anything still outstanding so only the newest code works.
        await prisma.passwordResetCode.updateMany({
          where: { userId: user!.id, usedAt: null },
          data: { usedAt: now },
        })

        const code = generateCode()
        await prisma.passwordResetCode.create({
          data: {
            userId: user!.id,
            codeHash: await bcrypt.hash(code, 10),
            expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
          },
        })

        try {
          await sendPasswordResetCodeEmail({
            name: user!.name,
            email: user!.email,
            code,
            expiresInMinutes: CODE_TTL_MINUTES,
          })
        } catch (e) {
          console.error('forgot-password: failed to send reset email', (e as Error)?.message || e)
          return res.status(500).json({ ok: false, error: 'Could not send the reset email. Please try again later.' })
        }
      }
    }

    await padResponse(startedAt)
    return res.status(200).json({
      ok: true,
      message: GENERIC_MESSAGE,
      cooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    })
  } catch (err) {
    console.error('forgot-password: unexpected error', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '16kb' } },
}
