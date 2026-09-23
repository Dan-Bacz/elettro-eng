export type Role = 'ADMIN' | 'TECH' | 'CLIENT'
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'
export type BookingStatusValue = 'PENDING' | 'APPROVED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type UserObj = {
  id: string
  name: string
  email: string
  role: Role
  phone?: string | null
  approved?: boolean
  status?: UserStatus
  address?: string | null
  specialization?: string | null
  yearsOfExperience?: number | null
  skills?: string | null
  profileImageUrl?: string | null
  rejectionReason?: string | null
  createdAt?: string
}

export type BookingObj = {
  id: string
  title: string
  description?: string | null
  status: BookingStatusValue
  clientId: string
  client?: UserObj | null
  assignedToId?: string | null
  assignedTo?: UserObj | null
  startDate?: string | null
  endDate?: string | null
  budget?: number | null
  createdAt: string
  technicianActivities?: ActivityObj[]
  reports?: ReportObj[]
  project?: ProjectObj | null
}

export type ProjectAssignmentObj = {
  id: string
  techId: string
  tech?: Pick<UserObj, 'id' | 'name' | 'email'>
}

export type ProjectObj = {
  id: string
  bookingId: string
  title?: string
  status?: BookingStatusValue
  startDate?: string | null
  endDate?: string | null
  createdAt?: string
  assignments: ProjectAssignmentObj[]
}

export type ActivityObj = {
  id: string
  techId: string
  tech?: Pick<UserObj, 'id' | 'name' | 'email'>
  bookingId: string
  message: string
  createdAt: string
}

export type ReportObj = {
  id: string
  authorId: string
  author?: Pick<UserObj, 'id' | 'name' | 'email'>
  bookingId: string
  booking?: Pick<BookingObj, 'id' | 'title' | 'status'>
  content: string
  createdAt: string
}

export type InventoryItemObj = {
  id: string
  name: string
  sku?: string | null
  category?: string | null
  brand?: string | null
  model?: string | null
  description?: string | null
  quantity: number
  unit?: string | null
  buyPrice?: number | null
  sellPrice?: number | null
  reorderLevel?: number
  imageUrl?: string | null
  imagePublicId?: string | null
  imageData?: string | null
  createdAt?: string
}

export type DashboardData = {
  stats: {
    totalBookings: number
    pending: number
    approved: number
    assigned: number
    inProgress: number
    completed: number
    totalInventory: number
    lowStock: number
    technicians: number
    pendingRegistrations: number
    suspendedTechnicians: number
    rejectedTechnicians: number
    clients: number
    admins: number
  }
  statusBreakdown: { status: string; value: number }[]
  recentBookings: { id: string; title: string; status: string; clientName: string; createdAt: string }[]
  inventoryAlerts: { id: string; name: string; quantity: number; sku: string | null }[]
  bookings: BookingObj[]
  inventory: InventoryItemObj[]
  technicians: UserObj[]
  pendingUsers: UserObj[]
  suspendedUsers: UserObj[]
  rejectedUsers: UserObj[]
  clients: UserObj[]
  admins: UserObj[]
}

export const BOOKING_STATUSES: BookingStatusValue[] = ['PENDING', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
export const TECH_STATUSES: UserStatus[] = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  APPROVED: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  ASSIGNED: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  IN_PROGRESS: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  CANCELLED: 'bg-red-500/15 text-red-600 border-red-500/30',
  ACTIVE: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  SUSPENDED: 'bg-red-500/15 text-red-600 border-red-500/30',
  REJECTED: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
}

export function formatDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '—'
  }
}

export function statusProgress(status: string) {
  const map: Record<string, number> = { PENDING: 5, APPROVED: 20, ASSIGNED: 40, IN_PROGRESS: 70, COMPLETED: 100, CANCELLED: 100 }
  return map[status] ?? 5
}