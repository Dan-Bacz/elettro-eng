import { PrismaClient, WarehouseRequestStatus } from '@prisma/client'
import { randomUUID } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveRole } from '../../lib/department-auth'

const prisma = new PrismaClient()
const REQUESTER_ROLES = ['SALES', 'WAREHOUSE', 'ADMIN'] as const
const MAX_REQUEST_LINES = 100
const MAX_QUANTITY = 1_000_000

function cleanOptionalText(value: unknown, maxLength: number): string | null {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, maxLength) : null
}

function getIdempotencyKey(req: NextApiRequest): string | null {
  const value = req.headers['idempotency-key'] ?? req.body?.idempotencyKey
  if (typeof value !== 'string') return null
  const key = value.trim()
  return key.length >= 8 && key.length <= 128 ? key : null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireActiveRole(req, res, REQUESTER_ROLES)
  if (!user) return

  if (req.method === 'GET') {
    const rawStatus = typeof req.query.status === 'string' ? req.query.status : undefined
    if (rawStatus && !Object.values(WarehouseRequestStatus).includes(rawStatus as WarehouseRequestStatus)) {
      return res.status(400).json({ error: 'Invalid request status' })
    }

    const requests = await prisma.warehouseRequest.findMany({
      where: {
        ...(user.role === 'SALES' ? { requesterId: user.id } : {}),
        ...(rawStatus ? { status: rawStatus as WarehouseRequestStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        order: { select: { id: true, status: true, fulfillmentMethod: true, paymentMethod: true, paymentStatus: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true, category: true, unit: true, quantity: true, reorderLevel: true } },
          },
        },
        releases: {
          orderBy: { createdAt: 'desc' },
          include: {
            releasedBy: { select: { id: true, name: true } },
            items: { include: { requestItem: { include: { inventoryItem: { select: { name: true, sku: true } } } } } },
            receipt: { select: { id: true, reference: true, createdAt: true } },
          },
        },
      },
    })
    return res.status(200).json({ requests })
  }

  if (req.method === 'POST') {
    if (user.role !== 'SALES') return res.status(403).json({ error: 'Only sales workers can create warehouse requests' })

    const lines = req.body?.items
    if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_REQUEST_LINES) {
      return res.status(400).json({ error: `Provide between 1 and ${MAX_REQUEST_LINES} request items` })
    }

    const normalizedLines: { inventoryItemId: string; requestedQuantity: number; notes: string | null }[] = []
    const ids = new Set<string>()
    for (const line of lines) {
      const inventoryItemId = typeof line?.inventoryItemId === 'string' ? line.inventoryItemId.trim() : ''
      const requestedQuantity = Number(line?.quantity)
      if (!inventoryItemId || !Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > MAX_QUANTITY) {
        return res.status(400).json({ error: 'Each item must have a valid product and a whole-number quantity greater than zero' })
      }
      if (ids.has(inventoryItemId)) return res.status(400).json({ error: 'A product may only appear once in a request' })
      ids.add(inventoryItemId)
      normalizedLines.push({
        inventoryItemId,
        requestedQuantity,
        notes: cleanOptionalText(line.notes, 500),
      })
    }

    const idempotencyKey = getIdempotencyKey(req)
    if (req.headers['idempotency-key'] || req.body?.idempotencyKey) {
      if (!idempotencyKey) return res.status(400).json({ error: 'Idempotency key must be 8 to 128 characters' })
      const existing = await prisma.warehouseRequest.findUnique({
        where: { idempotencyKey },
        include: { items: { include: { inventoryItem: true } } },
      })
      if (existing) {
        if (existing.requesterId !== user.id) return res.status(409).json({ error: 'Idempotency key is already in use' })
        return res.status(200).json({ request: existing, duplicate: true })
      }
    }

    const products = await prisma.inventoryItem.findMany({
      where: { id: { in: normalizedLines.map((line) => line.inventoryItemId) } },
      select: { id: true, name: true, unit: true },
    })
    if (products.length !== normalizedLines.length) {
      return res.status(400).json({ error: 'One or more selected products no longer exist' })
    }
    const productsById = new Map(products.map((product) => [product.id, product]))
    const requestId = randomUUID()
    const reference = `WHR-${new Date().getFullYear()}-${requestId.slice(0, 8).toUpperCase()}`

    try {
      const request = await prisma.$transaction(async (tx) => {
        const created = await tx.warehouseRequest.create({
          data: {
            id: requestId,
            reference,
            requesterId: user.id,
            idempotencyKey: idempotencyKey ?? undefined,
            customerReference: cleanOptionalText(req.body?.customerReference, 200),
            projectReference: cleanOptionalText(req.body?.projectReference, 200),
            notes: cleanOptionalText(req.body?.notes, 1000),
            items: {
              create: normalizedLines.map((line) => ({
                inventoryItemId: line.inventoryItemId,
                requestedQuantity: line.requestedQuantity,
                unit: productsById.get(line.inventoryItemId)?.unit || 'pcs',
                notes: line.notes,
              })),
            },
          },
          include: { items: { include: { inventoryItem: true } } },
        })

        const warehouseWorkers = await tx.user.findMany({
          where: { role: 'WAREHOUSE', status: 'ACTIVE' },
          select: { id: true },
        })
        if (warehouseWorkers.length) {
          await tx.notification.createMany({
            data: warehouseWorkers.map((worker) => ({
              userId: worker.id,
              type: 'WAREHOUSE_REQUEST',
              title: 'New Sales Warehouse Request',
              message: `${user.name} submitted request ${reference}.`,
              link: '/warehouse/requests',
            })),
          })
        }
        return created
      })
      return res.status(201).json({ request })
    } catch (error) {
      if (idempotencyKey) {
        const existing = await prisma.warehouseRequest.findUnique({
          where: { idempotencyKey },
          include: { items: { include: { inventoryItem: true } } },
        })
        if (existing?.requesterId === user.id) return res.status(200).json({ request: existing, duplicate: true })
      }
      console.error('Warehouse request creation failed:', error)
      return res.status(500).json({ error: 'Could not create warehouse request' })
    }
  }

  if (req.method === 'PATCH') {
    const id = typeof req.body?.id === 'string' ? req.body.id : ''
    const status = req.body?.status
    if (!id || typeof status !== 'string') return res.status(400).json({ error: 'Request id and status are required' })

    const request = await prisma.warehouseRequest.findUnique({
      where: { id },
      include: { releases: { select: { id: true } } },
    })
    if (!request) return res.status(404).json({ error: 'Warehouse request not found' })

    let allowed = false
    if (user.role === 'SALES' && request.requesterId === user.id && status === 'CANCELLED') {
      allowed = ['PENDING', 'UNDER_REVIEW'].includes(request.status) && request.releases.length === 0
    } else if (user.role === 'WAREHOUSE') {
      allowed =
        (status === 'UNDER_REVIEW' && request.status === 'PENDING') ||
        (status === 'REJECTED' && ['PENDING', 'UNDER_REVIEW'].includes(request.status) && request.releases.length === 0)
    }
    if (!allowed) return res.status(403).json({ error: 'This request transition is not permitted' })

    const nextStatus = status as WarehouseRequestStatus
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.warehouseRequest.updateMany({
        where: { id: request.id, status: request.status, updatedAt: request.updatedAt },
        data: { status: nextStatus, updatedAt: new Date() },
      })
      if (changed.count !== 1) throw new Error('REQUEST_CHANGED')

      const requester = await tx.user.findUniqueOrThrow({
        where: { id: request.requesterId },
        select: { id: true, role: true },
      })
      if (requester.role === 'SALES' || requester.role === 'CLIENT') {
        await tx.notification.create({
          data: {
            userId: requester.id,
            type: 'WAREHOUSE_REQUEST',
            title: nextStatus === 'UNDER_REVIEW' ? 'Warehouse Request Accepted' : nextStatus === 'REJECTED' ? 'Warehouse Request Rejected' : 'Warehouse Request Cancelled',
            message: `Request ${request.reference} is now ${nextStatus.toLowerCase().replace('_', ' ')}.`,
            link: requester.role === 'CLIENT' ? '/client/dashboard' : '/sales/requests',
          },
        })
      }
      return tx.warehouseRequest.findUniqueOrThrow({
        where: { id: request.id },
        include: { items: { include: { inventoryItem: true } } },
      })
    })

    return res.status(200).json({ request: updated })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
