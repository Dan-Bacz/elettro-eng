"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type UserObj = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'TECH' | 'CLIENT'
  phone?: string
  approved?: boolean
  createdAt?: string
}

type BookingObj = {
  id: string
  title: string
  description?: string
  status: 'PENDING' | 'APPROVED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  clientId: string
  client?: UserObj
  assignedToId?: string
  assignedTo?: UserObj
  startDate?: string
  endDate?: string
  createdAt: string
  technicianActivities?: any[]
  reports?: any[]
}

type InventoryItemObj = {
  id: string
  name: string
  sku?: string
  category?: string
  brand?: string
  model?: string
  description?: string
  quantity: number
  unit?: string
  imageUrl?: string
  imageData?: string
  createdAt?: string
}

type DashboardData = {
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
  clients: UserObj[]
  admins: UserObj[]
}

type InventoryForm = {
  id?: string
  name: string
  sku: string
  category: string
  brand: string
  model: string
  description: string
  quantity: number
  unit: string
  imageUrl: string
  imageData: string
}

const emptyForm: InventoryForm = {
  name: '',
  sku: '',
  category: '',
  brand: '',
  model: '',
  description: '',
  quantity: 1,
  unit: 'pcs',
  imageUrl: '',
  imageData: ''
}

const navItems = [
  { key: 'dashboard', label: 'Dashboard', emoji: '▣' },
  { key: 'bookings', label: 'Bookings', emoji: '🧾' },
  { key: 'projects', label: 'Projects', emoji: '🛠️' },
  { key: 'registrations', label: 'Registrations', emoji: '📋' },
  { key: 'inventory', label: 'Inventory', emoji: '📦' },
  { key: 'technicians', label: 'Technicians', emoji: '👷' },
  { key: 'clients', label: 'Clients', emoji: '👥' },
  { key: 'reports', label: 'Reports', emoji: '📊' },
  { key: 'notifications', label: 'Notifications', emoji: '🔔' },
  { key: 'settings', label: 'Settings', emoji: '⚙️' }
]

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState('dashboard')

  const [data, setData] = useState<DashboardData | null>(null)
  const [inventory, setInventory] = useState<InventoryItemObj[]>([])
  const [reportsData, setReportsData] = useState<{ reports: any[]; activities: any[] }>({ reports: [], activities: [] })
  
  // Bookings filter state
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>('ALL')
  const [bookingSearch, setBookingSearch] = useState<string>('')

  // Modals state
  const [assignModalBooking, setAssignModalBooking] = useState<BookingObj | null>(null)
  const [selectedTechId, setSelectedTechId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  // Create Tech Modal
  const [createTechModalOpen, setCreateTechModalOpen] = useState(false)
  const [techName, setTechName] = useState('')
  const [techEmail, setTechEmail] = useState('')
  const [techPassword, setTechPassword] = useState('')

  // Create Report Modal
  const [createReportModalOpen, setCreateReportModalOpen] = useState(false)
  const [reportBookingId, setReportBookingId] = useState('')
  const [reportContent, setReportContent] = useState('')

  // Inventory Form & Camera
  const [inventoryForm, setInventoryForm] = useState<InventoryForm>(emptyForm)
  const [inventorySubTab, setInventorySubTab] = useState<'stock' | 'requests'>('stock')
  const [savingItem, setSavingItem] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const router = useRouter()

  async function loadDashboard() {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/admin/login')
        return
      }

      const dashboardRes = await fetch('/api/dashboard')
      if (dashboardRes.ok) {
        const payload = await dashboardRes.json()
        setData(payload)
        setInventory(payload.inventory || [])
      }

      const reportsRes = await fetch('/api/reports')
      if (reportsRes.ok) {
        const rep = await reportsRes.json()
        setReportsData(rep)
      }
    } catch (e) {
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    const refreshTimer = window.setInterval(loadDashboard, 20000)
    return () => window.clearInterval(refreshTimer)
  }, [router])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      router.push('/')
    } finally {
      setLoggingOut(false)
    }
  }

  // Booking Actions
  async function handleApproveBooking(bookingId: string) {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', bookingId })
      })
      if (res.ok) await loadDashboard()
    } catch (e) {
      alert('Failed to approve booking request')
    }
  }

  async function handleUpdateBookingStatus(bookingId: string, status: string) {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', bookingId, status })
      })
      if (res.ok) await loadDashboard()
    } catch (e) {
      alert('Failed to update status')
    }
  }

  async function handleDeleteBooking(bookingId: string) {
    if (!window.confirm('Are you sure you want to delete this booking inquiry?')) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_booking', bookingId })
      })
      if (res.ok) await loadDashboard()
    } catch (e) {
      alert('Failed to delete booking')
    }
  }

  async function handleAssignTechnicianSubmit() {
    if (!assignModalBooking) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          bookingId: assignModalBooking.id,
          assignToId: selectedTechId || null,
          startDate,
          endDate
        })
      })
      if (res.ok) {
        setAssignModalBooking(null)
        setSelectedTechId('')
        setStartDate('')
        setEndDate('')
        await loadDashboard()
      }
    } catch (e) {
      alert('Failed to assign technician')
    }
  }

  // Create User Action
  async function handleCreateTechnicianSubmit() {
    if (!techName.trim() || !techEmail.trim()) {
      alert('Please provide name and email for the technician')
      return
    }
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user',
          name: techName,
          email: techEmail,
          password: techPassword || 'tech123',
          role: 'TECH'
        })
      })
      if (res.ok) {
        setCreateTechModalOpen(false)
        setTechName('')
        setTechEmail('')
        setTechPassword('')
        await loadDashboard()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to create technician')
      }
    } catch (e) {
      alert('Failed to create technician')
    }
  }

  // Registration Approval / Rejection
  async function handleApproveUser(userId: string) {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_user', userId })
      })
      if (res.ok) await loadDashboard()
    } catch (e) {
      alert('Failed to approve registration')
    }
  }

  async function handleRejectUser(userId: string) {
    if (!window.confirm('Are you sure you want to reject this technician registration?')) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_user', userId })
      })
      if (res.ok) await loadDashboard()
    } catch (e) {
      alert('Failed to reject registration')
    }
  }

  // Create Report Action
  async function handleCreateReportSubmit() {
    if (!reportBookingId || !reportContent.trim()) {
      alert('Please select a project and enter report findings')
      return
    }
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: data?.admins?.[0]?.id || data?.technicians?.[0]?.id || '',
          bookingId: reportBookingId,
          content: reportContent
        })
      })
      if (res.ok) {
        setCreateReportModalOpen(false)
        setReportBookingId('')
        setReportContent('')
        await loadDashboard()
      }
    } catch (e) {
      alert('Failed to submit report')
    }
  }

  // Inventory Handlers
  function updateField(field: keyof InventoryForm, value: string | number) {
    setInventoryForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSaveItem() {
    if (!inventoryForm.name.trim()) {
      alert('Please enter item name')
      return
    }
    setSavingItem(true)
    try {
      const payload = { ...inventoryForm, imageUrl: inventoryForm.imageUrl || inventoryForm.imageData }
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        setInventoryForm(emptyForm)
        await loadDashboard()
      } else {
        let reason = 'Unable to save inventory item.'
        try {
          const err = await response.json()
          if (err?.error) reason = err.error
        } catch {}
        alert(reason)
      }
    } catch (error) {
      alert('Unable to save inventory item.')
    } finally {
      setSavingItem(false)
    }
  }

  async function handleDeleteItem(id: string) {
    if (!window.confirm('Delete this inventory item?')) return
    try {
      await fetch('/api/inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      await loadDashboard()
    } catch (error) {
      alert('Unable to delete inventory item.')
    }
  }

  // Camera Functions
  async function startCamera() {
    setCameraError('')
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API not supported in this browser')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch (e) {
      setCameraError('Unable to access camera. Check permissions.')
    }
  }

  function stopCamera() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        try { videoRef.current.pause() } catch {}
        try { videoRef.current.srcObject = null } catch {}
      }
    } finally {
      setCameraActive(false)
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setInventoryForm((prev) => ({ ...prev, imageData: dataUrl, imageUrl: dataUrl }))
    stopCamera()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      setInventoryForm((prev) => ({ ...prev, imageData: dataUrl, imageUrl: dataUrl }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Filtered Bookings Memo
  const filteredBookings = useMemo(() => {
    if (!data?.bookings) return []
    return data.bookings.filter((b) => {
      const matchStatus = bookingFilterStatus === 'ALL' || b.status === bookingFilterStatus
      const matchSearch =
        !bookingSearch.trim() ||
        b.title.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        (b.client?.name || '').toLowerCase().includes(bookingSearch.toLowerCase()) ||
        (b.assignedTo?.name || '').toLowerCase().includes(bookingSearch.toLowerCase())
      return matchStatus && matchSearch
    })
  }, [data, bookingFilterStatus, bookingSearch])

  // Filtered Projects Memo (ASSIGNED, IN_PROGRESS, COMPLETED)
  const projectBookings = useMemo(() => {
    if (!data?.bookings) return []
    return data.bookings.filter((b) => ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(b.status))
  }, [data])

  const chartSegments = useMemo(() => {
    if (!data) return []
    const colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#059669', '#ef4444']
    const total = data.statusBreakdown.reduce((sum, item) => sum + item.value, 0) || 1
    let running = 0

    return data.statusBreakdown.map((item, index) => {
      const start = running
      running += (item.value / total) * 100
      return {
        ...item,
        color: colors[index % colors.length],
        start,
        end: running
      }
    })
  }, [data])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f10] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <div className="text-lg font-semibold tracking-wide">Loading Elettro Admin Center...</div>
        </div>
      </div>
    )
  }

  const stats = data?.stats

  return (
    <div className="min-h-screen bg-[#f4f7f8] flex text-slate-800">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-[#0b0f10] text-white h-screen sticky top-0 flex flex-col transition-all duration-200 overflow-hidden shrink-0 border-r border-white/10 z-20`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-yellow-400 text-black rounded-xl w-10 h-10 flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-yellow-400/20">⚡</div>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="font-black text-lg leading-tight tracking-wide text-white">ELETTRO</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Engineering Admin</div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="ml-2 bg-white/10 hover:bg-white/20 rounded-lg w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0 transition"
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        <nav className="mt-4 px-3 space-y-1 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-medium ${
                  isActive ? 'bg-yellow-400 text-black font-bold shadow-md shadow-yellow-400/10' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-black/10' : 'bg-white/10'}`}>
                  {item.emoji}
                </div>
                {sidebarOpen && <div className="text-sm text-left truncate">{item.label}</div>}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto p-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className={`w-full flex items-center justify-center gap-2 rounded-xl bg-red-950/40 text-red-300 border border-red-800/40 py-2.5 font-semibold hover:bg-red-900/50 transition ${
              !sidebarOpen ? 'px-2' : ''
            }`}
          >
            <span>{sidebarOpen ? (loggingOut ? 'Logging out...' : 'Sign Out') : '⎋'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-8 overflow-y-auto">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Elettro Engineering Dashboard</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {navItems.find((n) => n.key === activeSection)?.label || 'Overview'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSection('notifications')}
              className="relative p-3 bg-white rounded-full shadow-sm hover:bg-slate-50 border border-slate-200 transition"
              title="Notifications"
            >
              <span>🔔</span>
              {((stats?.pending || 0) + (stats?.lowStock || 0) + (stats?.pendingRegistrations || 0)) > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                  {(stats?.pending || 0) + (stats?.lowStock || 0) + (stats?.pendingRegistrations || 0)}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-full bg-white px-3 py-1.5 shadow-sm border border-slate-200 hover:bg-slate-50 transition"
              >
                <div className="w-9 h-9 rounded-full bg-black text-yellow-400 flex items-center justify-center font-black text-sm">
                  ⚡
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-sm leading-tight text-slate-900">Admin User</div>
                  <div className="text-[11px] text-slate-500 font-medium">Operations Manager</div>
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-xl py-1 z-30">
                  <button
                    type="button"
                    onClick={() => setActiveSection('settings')}
                    className="w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ⚙️ Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 border-t border-slate-100"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* SECTION 1: DASHBOARD */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { label: 'Total Bookings', value: stats?.totalBookings ?? 0, color: 'border-yellow-400', icon: '🧾' },
                { label: 'Pending Inquiry', value: stats?.pending ?? 0, color: 'border-amber-400', icon: '⏳' },
                { label: 'Approved', value: stats?.approved ?? 0, color: 'border-blue-400', icon: '✅' },
                { label: 'Assigned / Active', value: (stats?.assigned ?? 0) + (stats?.inProgress ?? 0), color: 'border-purple-400', icon: '🛠️' },
                { label: 'Low Stock Alert', value: stats?.lowStock ?? 0, color: 'border-red-400', icon: '⚠️' },
                { label: 'Pending Regs', value: stats?.pendingRegistrations ?? 0, color: 'border-purple-400', icon: '📋' },
                { label: 'Technicians', value: stats?.technicians ?? 0, color: 'border-emerald-400', icon: '👷' }
              ].map((card) => (
                <div key={card.label} className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${card.color} border-slate-200`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{card.label}</span>
                    <span className="text-lg">{card.icon}</span>
                  </div>
                  <div className="text-2xl font-black mt-2 text-slate-900">{card.value}</div>
                </div>
              ))}
            </section>

            {/* Overview Graphs & Quick Actions */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Bookings Lifecycle Status</h3>
                    <p className="text-xs text-slate-500">Real-time breakdown of all electrical requests</p>
                  </div>
                  <button onClick={() => setActiveSection('bookings')} className="text-xs font-bold text-yellow-600 hover:underline">
                    View All Bookings →
                  </button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative w-48 h-48 shrink-0">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="16" />
                      {chartSegments.map((segment) => (
                        <circle
                          key={segment.status}
                          cx="60"
                          cy="60"
                          r="42"
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="16"
                          strokeDasharray={`${(segment.end - segment.start) * 2.64} ${100 - (segment.end - segment.start) * 2.64}`}
                          strokeLinecap="round"
                          strokeDashoffset={-segment.start * 2.64}
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-3xl font-black text-slate-900">{stats?.totalBookings ?? 0}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inquiries</div>
                    </div>
                  </div>

                  <div className="w-full space-y-2.5">
                    {chartSegments.map((segment) => (
                      <div key={segment.status} className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-slate-50 transition">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: segment.color }} />
                          <span className="text-xs font-bold text-slate-700 uppercase">{segment.status}</span>
                        </div>
                        <div className="font-black text-slate-900 text-sm">{segment.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Quick Actions</h3>
                  <p className="text-xs text-slate-500 mb-4">Common administrative tasks</p>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveSection('bookings')}
                      className="w-full text-left p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-900 hover:bg-yellow-100 transition font-semibold text-sm flex items-center gap-3"
                    >
                      <span>📋</span>
                      <div>
                        <div>Verify Pending Requests</div>
                        <div className="text-[11px] font-normal text-yellow-700">{stats?.pending || 0} pending verification</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveSection('projects')}
                      className="w-full text-left p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100 transition font-semibold text-sm flex items-center gap-3"
                    >
                      <span>👷</span>
                      <div>
                        <div>Assign Technicians</div>
                        <div className="text-[11px] font-normal text-blue-700">Schedule technician start & end dates</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveSection('inventory')}
                      className="w-full text-left p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 transition font-semibold text-sm flex items-center gap-3"
                    >
                      <span>📦</span>
                      <div>
                        <div>Manage Inventory Stock</div>
                        <div className="text-[11px] font-normal text-emerald-700">Add material / camera photo scan</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveSection('registrations')}
                      className="w-full text-left p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 hover:bg-purple-100 transition font-semibold text-sm flex items-center gap-3"
                    >
                      <span>📋</span>
                      <div>
                        <div>Review Registrations</div>
                        <div className="text-[11px] font-normal text-purple-700">{(data?.pendingUsers || []).length} technician signups pending</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setCreateTechModalOpen(true)}
                      className="w-full text-left p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 hover:bg-purple-100 transition font-semibold text-sm flex items-center gap-3"
                    >
                      <span>➕</span>
                      <div>
                        <div>Add New Technician</div>
                        <div className="text-[11px] font-normal text-purple-700">Register field personnel account</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* SECTION 2: BOOKINGS (ONLINE INQUIRIES & APPROVALS) */}
        {activeSection === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'PENDING', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setBookingFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition shrink-0 ${
                      bookingFilterStatus === st ? 'bg-black text-yellow-400 shadow' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search booking title, client, or tech..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 w-full sm:w-72"
              />
            </div>

            {/* Bookings Table / List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Inquiry & Service Requests ({filteredBookings.length})</h3>
                <span className="text-xs text-slate-500 font-medium">Objective 1: Verify & Approve Client Requests</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Service Inquiry Title</th>
                      <th className="p-4">Client Information</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Assigned Tech</th>
                      <th className="p-4">Date Submitted</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No service bookings found matching your search filter.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{b.title}</div>
                            {b.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{b.description}</div>}
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-slate-800">{b.client?.name || 'Client User'}</div>
                            <div className="text-xs text-slate-500">{b.client?.email || 'N/A'}</div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                b.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : b.status === 'APPROVED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : b.status === 'ASSIGNED' || b.status === 'IN_PROGRESS'
                                  ? 'bg-purple-100 text-purple-800'
                                  : b.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="p-4">
                            {b.assignedTo ? (
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                                  👷
                                </span>
                                <div>
                                  <div className="font-medium text-slate-800 text-xs">{b.assignedTo.name}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="p-4 text-xs text-slate-500">
                            {new Date(b.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {b.status === 'PENDING' && (
                                <button
                                  onClick={() => handleApproveBooking(b.id)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setAssignModalBooking(b)
                                  setSelectedTechId(b.assignedToId || '')
                                  setStartDate(b.startDate ? b.startDate.substring(0, 10) : '')
                                  setEndDate(b.endDate ? b.endDate.substring(0, 10) : '')
                                }}
                                className="px-3 py-1.5 rounded-lg bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-500 shadow-sm"
                              >
                                {b.assignedToId ? 'Re-Assign' : 'Assign Tech'}
                              </button>
                              <button
                                onClick={() => handleDeleteBooking(b.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Delete Booking"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: PROJECTS (VERIFICATION & ASSIGNMENT MANAGEMENT) */}
        {activeSection === 'projects' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900">Active Installation & Maintenance Projects</h3>
                <p className="text-xs text-slate-500">Objective 2: Manage active assignments and track schedule timelines</p>
              </div>
              <button
                onClick={() => setCreateReportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-black text-yellow-400 text-xs font-bold hover:bg-slate-900"
              >
                + Create Site Report
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projectBookings.length === 0 ? (
                <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
                  No active projects assigned yet. Go to Bookings to assign a technician!
                </div>
              ) : (
                projectBookings.map((proj) => (
                  <div key={proj.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            proj.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {proj.status}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          ID: #{proj.id.substring(0, 8)}
                        </span>
                      </div>

                      <h4 className="font-black text-slate-900 text-base mb-1">{proj.title}</h4>
                      <p className="text-xs text-slate-600 mb-4 line-clamp-3">{proj.description || 'No extra notes specified'}</p>

                      <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Client:</span>
                          <span className="font-bold text-slate-800">{proj.client?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Lead Tech:</span>
                          <span className="font-bold text-purple-700">{proj.assignedTo?.name || 'Not assigned'}</span>
                        </div>
                        {proj.startDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Schedule:</span>
                            <span className="font-medium text-slate-700">
                              {new Date(proj.startDate).toLocaleDateString()} - {proj.endDate ? new Date(proj.endDate).toLocaleDateString() : 'TBD'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <select
                        value={proj.status}
                        onChange={(e) => handleUpdateBookingStatus(proj.id, e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 text-xs font-bold p-2 bg-slate-50 focus:outline-none"
                      >
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>

                      <button
                        onClick={() => {
                          setAssignModalBooking(proj)
                          setSelectedTechId(proj.assignedToId || '')
                        }}
                        className="px-3 py-2 rounded-xl bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-500 shrink-0"
                      >
                        Re-Assign
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SECTION 4: REGISTRATIONS */}
        {activeSection === 'registrations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900">Pending Technician Registrations</h3>
                <p className="text-xs text-slate-500">Review and approve technician account registration requests</p>
              </div>
              <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                {(data?.pendingUsers || []).length} pending
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="p-4">Applicant Name</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Phone Number</th>
                      <th className="p-4">Applied On</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.pendingUsers || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No pending registrations at the moment. New technician signups will appear here.
                        </td>
                      </tr>
                    ) : (
                      (data?.pendingUsers || []).map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                          </td>
                          <td className="p-4 text-slate-600">{u.email}</td>
                          <td className="p-4 text-slate-600">{u.phone || 'N/A'}</td>
                          <td className="p-4 text-xs text-slate-500">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveUser(u.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
                              >
                                ✅ Approve
                              </button>
                              <button
                                onClick={() => handleRejectUser(u.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: INVENTORY MANAGEMENT */}
        {activeSection === 'inventory' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900">Inventory & Equipment Management</h3>
                <p className="text-xs text-slate-500">Objective 4: Monitor stock levels, material requests, and equipment</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInventorySubTab('stock')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    inventorySubTab === 'stock' ? 'bg-black text-yellow-400' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Stock Catalog
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
              {/* Form Component */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-black text-slate-900 mb-4">Add / Register Inventory Item</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Item Name *</label>
                    <input
                      value={inventoryForm.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium focus:ring-2 focus:ring-yellow-400 outline-none"
                      placeholder="e.g. 20A Circuit Breaker, 12W LED Lamp"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category</label>
                    <input
                      value={inventoryForm.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                      placeholder="Breakers / Wiring / Lighting"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Brand</label>
                    <input
                      value={inventoryForm.brand}
                      onChange={(e) => updateField('brand', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                      placeholder="Schneider, Philips, Panasonic"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={inventoryForm.quantity}
                      onChange={(e) => updateField('quantity', Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit</label>
                    <input
                      value={inventoryForm.unit}
                      onChange={(e) => updateField('unit', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                      placeholder="pcs, meters, rolls"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">SKU / Code</label>
                    <input
                      value={inventoryForm.sku}
                      onChange={(e) => updateField('sku', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                      placeholder="SKU-99231"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setInventoryForm(emptyForm)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs"
                  >
                    Clear Form
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveItem}
                    disabled={savingItem}
                    className="px-5 py-2.5 rounded-xl bg-black text-yellow-400 font-bold text-xs shadow-md disabled:opacity-60"
                  >
                    {savingItem ? 'Saving...' : 'Save Stock Item'}
                  </button>
                </div>
              </div>

              {/* Camera Photo Component */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">Item Photo & Camera Scanner</h3>
                  <p className="text-xs text-slate-500 mb-4">Upload or capture product images directly using your webcam or mobile camera.</p>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold"
                      >
                        📷 Use Camera
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                      >
                        🖼️ Upload Photo
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelected}
                      />
                    </div>

                    {cameraError && <div className="text-xs text-red-600">{cameraError}</div>}

                    {inventoryForm.imageUrl ? (
                      <div className="mt-2 p-2 border border-slate-200 rounded-xl bg-slate-50 text-center">
                        <img src={inventoryForm.imageUrl} alt="preview" className="w-full h-44 object-contain rounded-lg" />
                      </div>
                    ) : (
                      <div className="h-44 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                        No image captured yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 mb-4">Stock Catalog ({inventory.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Brand</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.map((item) => {
                      const isLow = Number(item.quantity || 0) <= 10
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {item.imageUrl || item.imageData ? (
                                <img
                                  src={item.imageUrl || item.imageData}
                                  alt={item.name}
                                  className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">📦</div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900">{item.name}</div>
                                <div className="text-xs text-slate-400">SKU: {item.sku || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 text-xs font-medium">{item.category || 'General'}</td>
                          <td className="p-3 text-slate-600 text-xs">{item.brand || 'N/A'}</td>
                          <td className="p-3 font-bold text-slate-900">{item.quantity} {item.unit || 'pcs'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {isLow ? 'Low Stock' : 'Healthy'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: TECHNICIANS DIRECTORY */}
        {activeSection === 'technicians' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900">Technician Directory</h3>
                <p className="text-xs text-slate-500">Objective 3: Manage field personnel accounts and assignments</p>
              </div>
              <button
                onClick={() => setCreateTechModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-500 shadow-sm"
              >
                + Add New Technician
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {(data?.technicians || []).length === 0 ? (
                <div className="col-span-full p-8 text-center bg-white rounded-2xl border text-slate-500">
                  No technician profiles registered. Click "+ Add New Technician" above to add one.
                </div>
              ) : (
                (data?.technicians || []).map((tech) => {
                  const activeAssignments = (data?.bookings || []).filter(
                    (b) => b.assignedToId === tech.id && ['ASSIGNED', 'IN_PROGRESS'].includes(b.status)
                  ).length

                  return (
                    <div key={tech.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xl shrink-0">
                        👷
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-base truncate">{tech.name}</div>
                        <div className="text-xs text-slate-500 truncate">{tech.email}</div>
                        <div className="mt-2 text-xs font-semibold text-purple-700">
                          {activeAssignments} active project assignments
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* SECTION 6: CLIENTS DIRECTORY */}
        {activeSection === 'clients' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900">Client Accounts Directory</h3>
              <p className="text-xs text-slate-500">Objective 1: Client users submitting installation & maintenance inquiries</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="p-4">Client Name</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Total Bookings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.clients || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-500">No client accounts created yet.</td>
                      </tr>
                    ) : (
                      (data?.clients || []).map((client) => {
                        const totalB = (data?.bookings || []).filter((b) => b.clientId === client.id).length
                        return (
                          <tr key={client.id} className="hover:bg-slate-50">
                            <td className="p-4 font-bold text-slate-900">{client.name}</td>
                            <td className="p-4 text-slate-600">{client.email}</td>
                            <td className="p-4 font-bold text-yellow-600">{totalB} inquiries</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 7: REPORTS */}
        {activeSection === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900">Field Diagnostics & Completion Reports</h3>
                <p className="text-xs text-slate-500">Objective 3: Technician progress reports and admin inspection logs</p>
              </div>
              <button
                onClick={() => setCreateReportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-black text-yellow-400 text-xs font-bold hover:bg-slate-900"
              >
                + New Diagnostic Report
              </button>
            </div>

            <div className="space-y-4">
              {reportsData.reports.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-2xl border text-slate-500">
                  No completion reports submitted yet. Click "+ New Diagnostic Report" above to add one.
                </div>
              ) : (
                reportsData.reports.map((rep: any) => (
                  <div key={rep.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📝</span>
                        <span className="font-bold text-slate-900">{rep.booking?.title || 'Electrical Service'}</span>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(rep.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{rep.content}</p>
                    <div className="mt-3 text-xs text-slate-500 font-medium">
                      Author: <span className="font-bold text-slate-800">{rep.author?.name || 'Staff User'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SECTION 8: NOTIFICATIONS */}
        {activeSection === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900">System Notifications & Alerts Center</h3>
              <p className="text-xs text-slate-500">Real-time triggers for pending inquiries, inventory alerts, and technician activities</p>
            </div>

            <div className="space-y-3">
              {(data?.bookings || []).filter((b) => b.status === 'PENDING').map((b) => (
                <div key={b.id} className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-amber-900 text-sm">📋 Pending Client Inquiry Verification</div>
                    <div className="text-xs text-amber-700 mt-1">{b.title} requested by {b.client?.name || 'Client'}</div>
                  </div>
                  <button
                    onClick={() => setActiveSection('bookings')}
                    className="px-3 py-1.5 bg-amber-400 text-black text-xs font-bold rounded-xl shadow-sm"
                  >
                    Verify Inquiry
                  </button>
                </div>
              ))}

              {(data?.pendingUsers || []).map((u) => (
                <div key={u.id} className="bg-purple-50 border border-purple-200 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-purple-900 text-sm">📋 New Technician Registration Pending</div>
                    <div className="text-xs text-purple-700 mt-1">{u.name} ({u.email}) is requesting a technician account</div>
                  </div>
                  <button
                    onClick={() => setActiveSection('registrations')}
                    className="px-3 py-1.5 bg-purple-500 text-white text-xs font-bold rounded-xl shadow-sm shrink-0"
                  >
                    Review
                  </button>
                </div>
              ))}

              {(data?.inventoryAlerts || []).map((inv) => (
                <div key={inv.id} className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-red-900 text-sm">⚠️ Low Inventory Stock Warning</div>
                    <div className="text-xs text-red-700 mt-1">{inv.name} (SKU: {inv.sku || 'N/A'}) has only {inv.quantity} units remaining</div>
                  </div>
                  <button
                    onClick={() => setActiveSection('inventory')}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl shadow-sm"
                  >
                    Restock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 9: SETTINGS */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-2xl">
              <h3 className="font-black text-slate-900 text-lg">System Preferences & Organization Config</h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  defaultValue="Elettro Engineering Enterprises"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operational Support Email</label>
                <input
                  type="text"
                  defaultValue="operations@elettro.com"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Low Stock Alert Threshold (Units)</label>
                <input
                  type="number"
                  defaultValue={10}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => alert('Settings saved successfully')}
                  className="px-5 py-2.5 bg-black text-yellow-400 font-bold text-xs rounded-xl shadow"
                >
                  Save System Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ASSIGN TECHNICIAN */}
      {assignModalBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-lg">Assign Lead Technician</h3>
              <button onClick={() => setAssignModalBooking(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <div>
              <p className="text-xs text-slate-500 font-medium">Booking Request:</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{assignModalBooking.title}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Field Technician *</label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold bg-slate-50"
              >
                <option value="">-- Choose Technician --</option>
                {(data?.technicians || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setAssignModalBooking(null)}
                className="px-4 py-2 rounded-xl border text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTechnicianSubmit}
                className="px-5 py-2.5 bg-yellow-400 text-black text-xs font-bold rounded-xl shadow hover:bg-yellow-500"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TECHNICIAN */}
      {createTechModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-lg">Add New Field Technician</h3>
              <button onClick={() => setCreateTechModalOpen(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Technician Full Name *</label>
              <input
                type="text"
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                value={techEmail}
                onChange={(e) => setTechEmail(e.target.value)}
                placeholder="alex.tech@elettro.com"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default Password</label>
              <input
                type="text"
                value={techPassword}
                onChange={(e) => setTechPassword(e.target.value)}
                placeholder="tech123"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setCreateTechModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTechnicianSubmit}
                className="px-5 py-2.5 bg-black text-yellow-400 text-xs font-bold rounded-xl shadow"
              >
                Create Technician Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE REPORT */}
      {createReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-lg">Add Diagnostic / Site Report</h3>
              <button onClick={() => setCreateReportModalOpen(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Project / Service *</label>
              <select
                value={reportBookingId}
                onChange={(e) => setReportBookingId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium"
              >
                <option value="">-- Select Project --</option>
                {(data?.bookings || []).map((b) => (
                  <option key={b.id} value={b.id}>{b.title} (#{b.id.substring(0, 6)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Report Content & Findings *</label>
              <textarea
                rows={4}
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                placeholder="Enter field inspection results, electrical safety findings, or job completion status..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setCreateReportModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReportSubmit}
                className="px-5 py-2.5 bg-black text-yellow-400 text-xs font-bold rounded-xl shadow"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA OVERLAY MODAL */}
      {cameraActive && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 max-w-md w-full shadow-2xl">
            <video ref={videoRef} className="w-full h-64 bg-black rounded-xl object-cover" autoPlay playsInline />
            <div className="mt-4 flex items-center justify-between">
              <button onClick={capturePhoto} className="px-5 py-2.5 rounded-xl bg-yellow-400 text-black font-bold text-xs">
                📸 Capture Photo
              </button>
              <button onClick={stopCamera} className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold">
                Close Camera
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  )
}
