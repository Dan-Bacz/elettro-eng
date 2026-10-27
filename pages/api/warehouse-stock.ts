import { InventoryMovementType, Prisma, PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveRole } from '../../lib/department-auth'

const prisma = new PrismaClient()
const MAX_QUANTITY = 1_000_000

function cleanReason(value: unknown): string {
  return String(value ?? '').trim().slice(0, 1000)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireActiveRole(req, res, ['WAREHOUSE', 'ADMIN'])
  if (!user) return

  if (req.method === 'GET') {
    const inventoryItemId = typeof req.query.inventoryItemId === 'string' ? req.query.inventoryItemId : ''
    const movements = await prisma.inventoryMovement.findMany({
      where: inventoryItemId ? { inventoryItemId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
        worker: { select: { id: true, name: true, role: true } },
        request: { select: { id: true, reference: true } },
        release: { select: { id: true, receiptNumber: true } },
      },
    })
    return res.status(200).json({ movements })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (user.role !== 'WAREHOUSE') return res.status(403).json({ error: 'Only warehouse workers can record stock movements' })

  const inventoryItemId = typeof req.body?.inventoryItemId === 'string' ? req.body.inventoryItemId.trim() : ''
  const action = req.body?.action
  const reason = cleanReason(req.body?.reason)
  const quantity = Number(req.body?.quantity)
  if (!inventoryItemId) return res.status(400).json({ error: 'Inventory item is required' })
  if (!reason) return res.status(400).json({ error: 'A reason is required for every stock movement' })
  if (!Number.isInteger(quantity) || quantity === 0 || Math.abs(quantity) > MAX_QUANTITY) {
    return res.status(400).json({ error: 'Quantity must be a non-zero whole number within the allowed limit' })
  }
  if (action !== 'receive' && action !== 'adjust') {
    return res.status(400).json({ error: 'Choose a stock receipt or adjustment action' })
  }
  if (action === 'receive' && quantity < 1) {
    return res.status(400).json({ error: 'Received quantity must be greater than zero' })
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventoryItem.findUnique({
        where: { id: inventoryItemId },
        select: { id: true, name: true, quantity: true, reorderLevel: true },
      })
      if (!inventory) throw new Error('INVENTORY_NOT_FOUND')
      const stockAfter = inventory.quantity + quantity
      if (stockAfter < 0) throw new Error('NEGATIVE_STOCK')
      const changed = await tx.inventoryItem.updateMany({
        where: { id: inventory.id, quantity: inventory.quantity },
        data: { quantity: stockAfter },
      })
      if (changed.count !== 1) throw new Error('STOCK_CHANGED')

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryItemId: inventory.id,
          type: action === 'receive' ? InventoryMovementType.STOCK_RECEIVED : InventoryMovementType.ADJUSTMENT,
          quantity,
          stockBefore: inventory.quantity,
          stockAfter,
          workerId: user.id,
          reason,
        },
      })

      if (inventory.quantity > inventory.reorderLevel && stockAfter <= inventory.reorderLevel) {
        const admins = await tx.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
        if (admins.length) {
          await tx.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              type: 'LOW_STOCK',
              title: 'Low Stock Alert',
              message: `${inventory.name} reached ${stockAfter} after a warehouse stock adjustment.`,
              link: '/admin/inventory',
            })),
          })
        }
      }
      return movement
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return res.status(201).json({ movement })
  } catch (error) {
    if (error instanceof Error) {
      const errors: Record<string, { status: number; message: string }> = {
        INVENTORY_NOT_FOUND: { status: 404, message: 'Inventory item not found' },
        NEGATIVE_STOCK: { status: 409, message: 'Stock cannot be adjusted below zero' },
        STOCK_CHANGED: { status: 409, message: 'Stock changed during this action. Refresh and retry.' },
      }
      const mapped = errors[error.message]
      if (mapped) return res.status(mapped.status).json({ error: mapped.message })
    }
    console.error('Warehouse stock movement failed:', error)
    return res.status(500).json({ error: 'Could not record stock movement' })
  }
}
