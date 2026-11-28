export const riderDeliveryTransitions: Record<string, readonly string[]> = {
  ASSIGNED: ['PREPARING_DISPATCH', 'IN_TRANSIT', 'DELIVERY_FAILED', 'CANCELLED'],
  PREPARING_DISPATCH: ['IN_TRANSIT', 'DELIVERY_FAILED', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERY_FAILED', 'CANCELLED', 'RETURN_REQUESTED'],
  DELIVERY_FAILED: ['IN_TRANSIT', 'CANCELLED', 'RETURN_REQUESTED'],
}

export function riderDeliveryNeedsReason(status: string) {
  return ['DELIVERY_FAILED', 'CANCELLED', 'CANCELLATION_REQUESTED', 'RETURN_REQUESTED'].includes(status)
}

export function formatDeliveryTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
  }).format(new Date(value)) + ' PHT'
}

export function riderDeliveryLabel(status: string) {
  return status === 'DELIVERED' ? 'Completed' : status.replaceAll('_', ' ').toLowerCase().replace(/^./, first => first.toUpperCase())
}
