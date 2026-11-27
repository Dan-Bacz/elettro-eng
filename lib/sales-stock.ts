import type { Prisma } from '@prisma/client'

export async function getSalesStock(tx: Prisma.TransactionClient) {
  const [released, sold, ordered] = await Promise.all([
    tx.warehouseRelease.findMany({
      where: {
        receivedBySalesId: { not: null },
        request: { source: 'INTERNAL_SALES' },
      },
      select: {
        items: {
          select: {
            quantity: true,
            requestItem: {
              select: {
                inventoryItemId: true,
                inventoryItem: {
                  select: { id: true, name: true, sku: true, unit: true, sellPrice: true, imageUrl: true, category: true, deletedAt: true },
                },
              },
            },
          },
        },
      },
    }),
    tx.salesSaleItem.groupBy({
      by: ['inventoryItemId'],
      _sum: { quantity: true },
    }),
    tx.orderItem.groupBy({
      by: ['inventoryItemId'],
      where: { order: { usesSalesStock: true, status: { not: 'CANCELLED' } } },
      _sum: { quantity: true },
    }),
  ])

  const soldByItem = new Map(sold.map((row) => [row.inventoryItemId, row._sum.quantity || 0]))
  const orderedByItem = new Map(ordered.map((row) => [row.inventoryItemId, row._sum.quantity || 0]))
  const stock = new Map<string, {
    item: NonNullable<typeof released[number]['items'][number]['requestItem']['inventoryItem']>
    released: number
    sold: number
  }>()

  for (const release of released) {
    for (const line of release.items) {
      if (!line.requestItem.inventoryItem || line.requestItem.inventoryItem.deletedAt) continue
      const id = line.requestItem.inventoryItemId
      const current = stock.get(id) || { item: line.requestItem.inventoryItem, released: 0, sold: soldByItem.get(id) || 0 }
      current.released += line.quantity
      stock.set(id, current)
    }
  }

  return [...stock.values()]
    .map(({ item, released: releasedQuantity, sold: soldQuantity }) => {
      const orderQuantity = orderedByItem.get(item.id) || 0
      return {
        ...item,
        releasedQuantity,
        soldQuantity,
        availableQuantity: Math.max(0, releasedQuantity - soldQuantity - orderQuantity),
      }
    })
}
