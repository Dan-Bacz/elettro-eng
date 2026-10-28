import { InventoryMovementType, Prisma, PrismaClient, WarehouseRequestStatus } from '@prisma/client'
import { randomUUID } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveRole } from '../../lib/department-auth'

const prisma = new PrismaClient()

const MAX_NOTES_LENGTH = 1000

type SubmittedLine = {
  requestItemId: string
  quantity: number
  unavailableQuantity: number
  discrepancyNotes: string | null
}

function text(value: unknown, maxLength: number): string | null {
  const result = String(value ?? '').trim()
  return result ? result.slice(0, maxLength) : null
}

function getIdempotencyKey(req: NextApiRequest): string | null {
  const value = req.headers['idempotency-key'] ?? req.body?.idempotencyKey
  if (typeof value !== 'string') return null
  const key = value.trim()
  return key.length >= 8 && key.length <= 128 ? key : null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireActiveRole(req, res, ['WAREHOUSE'])
  if (!user) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const requestId = typeof req.body?.requestId === 'string' ? req.body.requestId.trim() : ''
  const idempotencyKey = getIdempotencyKey(req)

  if (!requestId) return res.status(400).json({ error: 'Warehouse request id is required' })
  if (!idempotencyKey) return res.status(400).json({ error: 'A valid idempotency key is required' })

  const rawItems = req.body?.items
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 100) {
    return res.status(400).json({ error: 'Provide at least one item for verification' })
  }

  const lines: SubmittedLine[] = []
  const seen = new Set<string>()

  for (const raw of rawItems) {
    const requestItemId = typeof raw?.requestItemId === 'string' ? raw.requestItemId.trim() : ''
    const quantity = Number(raw?.quantity)
    const unavailableQuantity = Number(raw?.unavailableQuantity ?? 0)
    const notes = text(raw?.discrepancyNotes, MAX_NOTES_LENGTH)

    if (!requestItemId || seen.has(requestItemId)) {
      return res.status(400).json({ error: 'Each verified request item must be listed only once' })
    }
    if (raw.verified !== true) return res.status(400).json({ error: 'Every submitted item must be physically verified' })
    if (!Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(unavailableQuantity) || unavailableQuantity < 0) {
      return res.status(400).json({ error: 'Release and unavailable quantities must be whole numbers of zero or more' })
    }

    seen.add(requestItemId)
    lines.push({ requestItemId, quantity, unavailableQuantity, discrepancyNotes: notes })
  }

  if (!lines.some((line) => line.quantity > 0)) {
    return res.status(400).json({ error: 'At least one item must have a positive release quantity' })
  }

  const existingRelease = await prisma.warehouseRelease.findUnique({
    where: { idempotencyKey },
    include: { receipt: true },
  })

  if (existingRelease) {
    if (existingRelease.releasedById !== user.id || existingRelease.requestId !== requestId) {
      return res.status(409).json({ error: 'Idempotency key is already in use' })
    }
    return res.status(200).json({ release: existingRelease, duplicate: true })
  }

  const releaseId = randomUUID()
  const receiptNumber = `WRR-${new Date().getFullYear()}-${releaseId.slice(0, 8).toUpperCase()}`
  const receiptId = randomUUID()

  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.warehouseRequest.findUnique({
        where: { id: requestId },
        include: {
          requester: { select: { id: true, name: true, role: true } },
          order: {
            select: {
              id: true,
              status: true,
              fulfillmentMethod: true,
              paymentMethod: true,
              paymentStatus: true,
              clientId: true,
              updatedAt: true,
            },
          },
          items: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                  quantity: true,
                  reorderLevel: true
                },
              },
            },
          },
        },
      })

      if (!request) throw new Error('REQUEST_NOT_FOUND')
      if (!['UNDER_REVIEW', 'PARTIALLY_FULFILLED'].includes(request.status)) throw new Error('REQUEST_NOT_RELEASEABLE')

      if (request.source === 'CLIENT_ORDER' && (!request.order || !['APPROVED', 'PROCESSING'].includes(request.order.status))) {
        throw new Error('ORDER_NOT_APPROVED')
      }

      if (request.order?.paymentMethod === 'GCASH' && request.order.paymentStatus !== 'PAID') {
        throw new Error('ORDER_PAYMENT_NOT_VERIFIED')
      }

      const requestItems = new Map(request.items.map((item) => [item.id, item]))
      const changedItems: {
        line: SubmittedLine
        item: (typeof request.items)[number]
        stockBefore: number
        stockAfter: number
        remaining: number
      }[] = []

      for (const line of lines) {
        const item = requestItems.get(line.requestItemId)
        if (!item) throw new Error('INVALID_REQUEST_ITEM')

        const remaining = item.requestedQuantity - item.releasedQuantity
        if (remaining <= 0 || line.quantity + line.unavailableQuantity > remaining) {
          throw new Error('INVALID_RELEASE_QUANTITY')
        }

        if ((line.quantity < remaining || line.unavailableQuantity > 0) && !line.discrepancyNotes) {
          throw new Error('DISCREPANCY_NOTES_REQUIRED')
        }

        const stockBefore = item.inventoryItem.quantity
        if (line.quantity > stockBefore) throw new Error('INSUFFICIENT_STOCK')

        if (line.quantity > 0) {
          const updatedStock = await tx.inventoryItem.updateMany({
            where: { id: item.inventoryItemId, quantity: { gte: line.quantity } },
            data: { quantity: { decrement: line.quantity } },
          })
          if (updatedStock.count !== 1) throw new Error('INSUFFICIENT_STOCK')
        }

        const updatedRequestItem = await tx.warehouseRequestItem.updateMany({
          where: {
            id: item.id,
            releasedQuantity: item.releasedQuantity,
            unavailableQuantity: item.unavailableQuantity,
          },
          data: {
            releasedQuantity: { increment: line.quantity },
            unavailableQuantity: line.unavailableQuantity,
          },
        })
        if (updatedRequestItem.count !== 1) throw new Error('REQUEST_ITEM_CHANGED')

        changedItems.push({
          line,
          item,
          stockBefore,
          stockAfter: stockBefore - line.quantity,
          remaining: remaining - line.quantity,
        })
      }

      const allRequestedQuantitiesReleased = request.items.every((item) => {
        const changed = changedItems.find((entry) => entry.item.id === item.id)
        const released = item.releasedQuantity + (changed?.line.quantity ?? 0)
        return released === item.requestedQuantity
      })

      const requestStatus: WarehouseRequestStatus = allRequestedQuantitiesReleased
        ? WarehouseRequestStatus.FULFILLED
        : WarehouseRequestStatus.PARTIALLY_FULFILLED

      const createdRelease = await tx.warehouseRelease.create({
        data: {
          id: releaseId,
          requestId: request.id,
          releasedById: user.id,
          receiptNumber,
          idempotencyKey,
          notes: text(req.body?.notes, MAX_NOTES_LENGTH),
          items: {
            create: changedItems.map(({ line, item, stockBefore, stockAfter }) => ({
              requestItemId: item.id,
              verified: true,
              quantity: line.quantity,
              unit: item.unit || item.inventoryItem.unit || 'pcs',
              stockBefore,
              stockAfter,
              discrepancyNotes: line.discrepancyNotes,
            })),
          },
        },
      })

      for (const { line, item, stockBefore, stockAfter } of changedItems) {
        if (line.quantity > 0) {
          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: item.inventoryItemId,
              type: InventoryMovementType.STOCK_RELEASED,
              quantity: line.quantity,
              stockBefore,
              stockAfter,
              requestId: request.id,
              releaseId: createdRelease.id,
              workerId: user.id,
              reason: `Warehouse release ${receiptNumber}`,
            },
          })
        }

        if (stockBefore > item.inventoryItem.reorderLevel && stockAfter <= item.inventoryItem.reorderLevel) {
          const admins = await tx.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
          if (admins.length) {
            await tx.notification.createMany({
              data: admins.map((admin) => ({
                userId: admin.id,
                type: 'LOW_STOCK',
                title: 'Low Stock Alert',
                message: `${item.inventoryItem.name} reached ${stockAfter} ${item.unit || item.inventoryItem.unit || 'pcs'} after release.`,
                link: '/admin/inventory',
              })),
            })
          }
        }
      }

      const now = new Date()
      const requestUpdate = await tx.warehouseRequest.updateMany({
        where: { id: request.id, status: request.status, updatedAt: request.updatedAt },
        data: { status: requestStatus, updatedAt: now },
      })
      if (requestUpdate.count !== 1) throw new Error('REQUEST_CHANGED')

      if (request.order) {
        const orderStatus = requestStatus === WarehouseRequestStatus.FULFILLED
          ? request.order.fulfillmentMethod === 'PICKUP' ? 'READY_FOR_PICKUP' : 'PROCESSING'
          : request.order.status

        if (orderStatus !== request.order.status) {
          const orderUpdate = await tx.order.updateMany({
            where: { id: request.order.id, status: request.order.status, updatedAt: request.order.updatedAt },
            data: { status: orderStatus, updatedAt: now },
          })
          if (orderUpdate.count !== 1) throw new Error('ORDER_CHANGED')
        }
      }

      const snapshot: Prisma.InputJsonObject = {
        title: 'ELETTRO ENGINEERING ENTERPRISES — WAREHOUSE MATERIAL RELEASE RECEIPT',
        receiptNumber,
        requestReference: request.reference,
        salesRequester: request.requester.name,
        warehouseWorker: user.name,
        customerReference: request.customerReference ?? '',
        projectReference: request.projectReference ?? '',
        releaseDate: now.toISOString(),
        notes: text(req.body?.notes, MAX_NOTES_LENGTH) ?? '',
        items: changedItems.map(({ line, item, stockBefore, stockAfter, remaining }) => ({
          name: item.inventoryItem.name,
          sku: item.inventoryItem.sku ?? '',
          requestedQuantity: item.requestedQuantity,
          previouslyReleased: item.releasedQuantity,
          releasedQuantity: line.quantity,
          totalReleased: item.releasedQuantity + line.quantity,
          outstandingQuantity: remaining,
          unavailableQuantity: line.unavailableQuantity,
          unit: item.unit || item.inventoryItem.unit || 'pcs',
          verified: true,
          stockBefore,
          stockAfter,
          remarks: line.discrepancyNotes ?? '',
        })),
      }

      const receipt = await tx.warehouseReceipt.create({
        data: { id: receiptId, reference: receiptNumber, releaseId, snapshot },
      })

      if (request.requester.role === 'SALES' || request.requester.role === 'CLIENT') {
        await tx.notification.create({
          data: {
            userId: request.requesterId,
            type: 'WAREHOUSE_RELEASE',
            title: requestStatus === WarehouseRequestStatus.FULFILLED ? 'Materials Released' : 'Partial Materials Release',
            message: `${receiptNumber} is available for warehouse request ${request.reference}.`,
            link: request.requester.role === 'CLIENT' ? '/client/dashboard' : '/sales/receipts',
          },
        })
      }

      if (request.order) {
        await tx.notification.create({
          data: {
            userId: request.order.clientId,
            type: 'ORDER',
            title: requestStatus === WarehouseRequestStatus.FULFILLED ? 'Order Ready for Fulfillment' : 'Order Partially Fulfilled',
            message: `Warehouse release ${receiptNumber} was recorded for your order.`,
            link: '/client/dashboard',
          },
        })
      }

      return { release: createdRelease, receipt, status: requestStatus }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return res.status(201).json(result)
  } catch (error) {
    if (error instanceof Error) {
      const errors: Record<string, { status: number; message: string }> = {
        REQUEST_NOT_FOUND: { status: 404, message: 'Warehouse request not found' },
        REQUEST_NOT_RELEASEABLE: { status: 409, message: 'Request must be under review or partially fulfilled before release' },
        ORDER_NOT_APPROVED: { status: 409, message: 'Client order must be approved before materials can be released' },
        ORDER_PAYMENT_NOT_VERIFIED: { status: 409, message: 'Verify the GCash payment before releasing this order' },
        INVALID_REQUEST_ITEM: { status: 400, message: 'A submitted line does not belong to this request' },
        INVALID_RELEASE_QUANTITY: { status: 409, message: 'Release quantity exceeds the remaining authorized quantity' },
        DISCREPANCY_NOTES_REQUIRED: { status: 400, message: 'Add a discrepancy note when an item cannot be fully released' },
        INSUFFICIENT_STOCK: { status: 409, message: 'Available stock changed or is insufficient for this release' },
        REQUEST_ITEM_CHANGED: { status: 409, message: 'Request item changed during release; refresh and try again' },
        REQUEST_CHANGED: { status: 409, message: 'Request changed during release; refresh and try again' },
        ORDER_CHANGED: { status: 409, message: 'Order changed during release; refresh and try again' },
      }

      const mapped = errors[error.message]
      if (mapped) return res.status(mapped.status).json({ error: mapped.message })

      if (error.message.includes('Unique constraint')) {
        const duplicate = await prisma.warehouseRelease.findUnique({ where: { idempotencyKey }, include: { receipt: true } })
        if (duplicate?.releasedById === user.id) return res.status(200).json({ release: duplicate, duplicate: true })
        return res.status(409).json({ error: 'This release was already submitted' })
      }
    }

    console.error('Warehouse release failed:', error)
    return res.status(500).json({ error: 'Could not complete the warehouse release' })
  }
}
