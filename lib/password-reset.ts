import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export const CODE_TTL_MINUTES = 15
export const MAX_CODE_ATTEMPTS = 5

export type CodeCheck =
  | { ok: true; userId: string; recordId: string }
  | { ok: false; error: string; status: number }

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

export function isValidEmail(value: unknown) {
  const email = normalizeEmail(value)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Verifies a 6-digit code against the newest unused code for a technician.
 * A wrong code increments the attempt counter; once the cap is hit the code is
 * burned and a new one must be requested. A correct code is not consumed here.
 */
export async function checkResetCode(emailValue: unknown, codeValue: unknown): Promise<CodeCheck> {
  const email = normalizeEmail(emailValue)
  const code = String(codeValue ?? '').trim()

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, status: 400, error: 'Enter the 6-digit code from your email' }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.role !== 'TECH') {
    return { ok: false, status: 400, error: 'This reset code is not valid' }
  }

  const record = await prisma.passwordResetCode.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    return { ok: false, status: 400, error: 'This reset code has already been used. Request a new one.' }
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetCode.update({ where: { id: record.id }, data: { usedAt: new Date() } })
    return { ok: false, status: 400, error: 'This reset code has expired. Request a new one.' }
  }

  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    await prisma.passwordResetCode.update({ where: { id: record.id }, data: { usedAt: new Date() } })
    return { ok: false, status: 429, error: 'Too many incorrect attempts. Request a new code.' }
  }

  const matches = await bcrypt.compare(code, record.codeHash)
  if (!matches) {
    const updated = await prisma.passwordResetCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    if (updated.attempts >= MAX_CODE_ATTEMPTS) {
      await prisma.passwordResetCode.update({ where: { id: record.id }, data: { usedAt: new Date() } })
      return { ok: false, status: 429, error: 'Too many incorrect attempts. Request a new code.' }
    }
    const left = MAX_CODE_ATTEMPTS - updated.attempts
    return {
      ok: false,
      status: 400,
      error: left > 1 ? `That code is not correct. ${left} attempts remaining.` : 'That code is not correct. 1 attempt remaining.',
    }
  }

  return { ok: true, userId: user.id, recordId: record.id }
}
