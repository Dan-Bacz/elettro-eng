import { createHash } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser, getTokenFromRequest } from './auth'
import { prisma } from './prisma'

export async function requireVerifiedClient(req: NextApiRequest, res: NextApiResponse) {
  const token = getTokenFromRequest(req)
  const session = await getSessionUser(token)
  if (!session) {
    res.status(401).json({ error: 'Sign in with a verified client account to continue.' })
    return null
  }

  if (session.role !== 'CLIENT') {
    res.status(403).json({ error: 'A client account is required to continue.' })
    return null
  }

  const client = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
    },
  })

  if (!client || client.status !== 'ACTIVE' || !client.emailVerifiedAt) {
    res.status(403).json({ error: 'Verify your email address before continuing.' })
    return null
  }
  return client
}

function hashRateLimitKey(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function requestAddress(req: NextApiRequest) {
  const realIp = req.headers['x-real-ip']
  const forwarded = req.headers['x-forwarded-for']
  const value = (typeof realIp === 'string' ? realIp : Array.isArray(realIp) ? realIp[0] : '') ||
    (typeof forwarded === 'string' ? forwarded.split(',')[0] : Array.isArray(forwarded) ? forwarded[0]?.split(',')[0] : '')
  return value?.trim() || 'unknown'
}

export async function isRateLimited(
  req: NextApiRequest,
  scope: string,
  limit: number,
  windowMs: number,
  email?: string,
) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMs)
  const keys = [
    `ip:${hashRateLimitKey(`${scope}:${requestAddress(req)}`)}`,
    ...(email ? [`email:${hashRateLimitKey(`${scope}:${email.trim().toLowerCase()}`)}`] : []),
  ]

  const buckets = await Promise.all(keys.map((key) => prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "AuthRateLimit" ("key", "count", "windowStartedAt")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE
    SET
      "count" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= ${windowStart} THEN 1
        ELSE "AuthRateLimit"."count" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= ${windowStart} THEN ${now}
        ELSE "AuthRateLimit"."windowStartedAt"
      END
    RETURNING "count"
  `))

  return buckets.some((bucket) => Number(bucket[0]?.count ?? 0) > limit)
}
