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

export type OrderItemObj = {
  id: string
  name: string
  quantity: number
  unit?: string | null
  unitPrice: number
  inventoryItemId?: string | null
  createdAt?: string
}

export type OrderObj = {
  id: string
  reference: string
  clientName: string
  email: string
  phone: string
  address?: string | null
  barangay?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  deliveryNotes?: string | null
  paymentMethod?: string
  paymentStatus?: string
  notes?: string | null
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED'
  total: number
  createdAt: string
  items: OrderItemObj[]
  client?: { id: string; name: string; email: string; phone?: string | null }
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
    pendingLeaves: number
    onLeave: number
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
  admin: { name: string; email: string } | null
  bookingTrend: { date: string; count: number }[]
  activityTrend: { date: string; count: number }[]
  serviceBreakdown: { service: string; count: number }[]
  stockBreakdown: { status: 'In Stock' | 'Low Stock' | 'Out of Stock'; value: number }[]
  stockSummary: {
    totalItems: number
    inStock: number
    lowStock: number
    outOfStock: number
    totalUnits: number
    topLow: { id: string; name: string; quantity: number; status: string }[]
  }
  flow: { status: string; label: string; count: number; latestAt: string | null }[]
  technicianStatus: { active: number; onLeave: number; suspended: number; inactive: number }
  recentProjects: {
    id: string
    title: string
    status: string
    clientName: string
    progress: number
    techCount: number
    createdAt: string
    bookId: string
  }[]
  recentBookingsAll: {
    id: string
    title: string
    service: string
    status: string
    clientName: string
    technicianName: string | null
    createdAt: string
    progress: number
  }[]
  notifications: {
    id: string
    type: string
    title: string
    message: string | null
    link: string | null
    read: boolean
    createdAt: string
  }[]
  pendingLeaves: number
}

export const BOOKING_STATUSES: BookingStatusValue[] = ['PENDING', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
export const TECH_STATUSES: UserStatus[] = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']

export type LeaveStatusValue = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type LeaveTypeValue =
  | 'VACATION'
  | 'SICK'
  | 'MATERNITY'
  | 'PATERNITY'
  | 'SOLO_PARENT'
  | 'SPECIAL_PRIVILEGE'
  | 'STUDY'
  | 'VAWC'
  | 'REHABILITATION'
  | 'SPECIAL_EMERGENCY'
  | 'OTHER'

export type LeaveObj = {
  id: string
  techId: string
  tech?: Pick<UserObj, 'id' | 'name' | 'email'>
  type: LeaveTypeValue
  fromDate: string
  toDate: string
  days: number
  commutation?: string
  addressDuringLeave?: string | null
  medicalCertificate?: boolean
  reason?: string | null
  status: LeaveStatusValue
  adminNote?: string | null
  approvedDays?: number | null
  decidedBy?: string | null
  decidedAt?: string | null
  createdAt?: string
}

export type LeaveCreditsObj = {
  id: string
  techId: string
  tech?: Pick<UserObj, 'id' | 'name' | 'email'>
  vacation: number
  sick: number
  vacationUsed: number
  sickUsed: number
}

export const LEAVE_TYPES: { value: LeaveTypeValue; label: string }[] = [
  { value: 'VACATION', label: 'Vacation Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'MATERNITY', label: 'Maternity Leave' },
  { value: 'PATERNITY', label: 'Paternity Leave' },
  { value: 'SOLO_PARENT', label: 'Solo Parent Leave' },
  { value: 'SPECIAL_PRIVILEGE', label: 'Special Privilege' },
  { value: 'STUDY', label: 'Study Leave' },
  { value: 'VAWC', label: 'VAWC Leave' },
  { value: 'REHABILITATION', label: 'Rehabilitation Leave' },
  { value: 'SPECIAL_EMERGENCY', label: 'Special Emergency' },
  { value: 'OTHER', label: 'Other' },
]

export function leaveTypeLabel(type: string) {
  const found = LEAVE_TYPES.find((t) => t.value === type)
  if (found) return found.label
  return String(type || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

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