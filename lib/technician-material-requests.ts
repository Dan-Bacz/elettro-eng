import type { Prisma } from '@prisma/client'

export function technicianMaterialRequestFilter(techId: string): Prisma.WarehouseRequestWhereInput {
  return {
    source: 'TECHNICIAN',
    requesterId: techId,
    status: { notIn: ['CANCELLED', 'REJECTED'] },
  }
}
