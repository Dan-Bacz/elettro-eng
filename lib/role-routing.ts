import type { SessionUser } from './auth'

export function dashboardPathForRole(role: SessionUser['role']): string | null {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard'
    case 'TECH':
      return '/technician/dashboard'
    case 'SALES':
      return '/sales/dashboard'
    case 'WAREHOUSE':
      return '/warehouse/dashboard'
    case 'CLIENT':
      return '/client/dashboard'
  }
}
