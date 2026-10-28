import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveRole } from '../../lib/department-auth'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireActiveRole(req, res, ['ADMIN', 'SALES', 'WAREHOUSE', 'CLIENT'])
  if (!user) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const reference = typeof req.query.reference === 'string' ? req.query.reference.trim() : ''
  const releaseId = typeof req.query.releaseId === 'string' ? req.query.releaseId.trim() : ''

  const receipts = await prisma.warehouseReceipt.findMany({
    where: {
      ...(reference ? { reference } : {}),
      ...(releaseId ? { releaseId } : {}),
      ...(['SALES', 'CLIENT'].includes(user.role)
        ? { release: { request: { requesterId: user.id } } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: reference || releaseId ? 1 : 100,
    include: {
      release: {
        select: {
          id: true,
          receiptNumber: true,
          request: {
            select: {
              id: true,
              reference: true,
              requesterId: true,
              source: true
            }
          },
        },
      },
    },
  })

  if ((reference || releaseId) && receipts.length === 0) {
    return res.status(404).json({ error: 'Receipt not found' })
  }

  return res.status(200).json({ receipts })
}
