type SalesOrderCompletion = {
  status?: string | null
  warehouseRequest?: { status?: string | null } | null
}

/**
 * Sales are recognized only after the customer has confirmed receipt.
 * Warehouse-linked orders must also have their request fully fulfilled.
 */
export function isFullyReceivedSale(order: SalesOrderCompletion) {
  return (
    order.status === 'COMPLETED' &&
    (!order.warehouseRequest || order.warehouseRequest.status === 'FULFILLED')
  )
}
