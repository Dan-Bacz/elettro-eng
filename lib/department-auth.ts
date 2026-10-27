import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser, getTokenFromRequest, type SessionUser } from './auth'

export async function requireActiveRole(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: readonly SessionUser['role'][]
): Promise<SessionUser | null> {
  const token = getTokenFromRequest(req)
  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }

  const user = await getSessionUser(token)
  if (!user) {
    res.status(401).json({ error: 'Invalid session' })
    return null
  }
  if (user.status !== 'ACTIVE') {
    res.status(403).json({ error: 'Your account is not active' })
    return null
  }
  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }

  return user
}
