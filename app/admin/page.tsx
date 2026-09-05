"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage(){
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()

  useEffect(()=>{
    async function check(){
      try{
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          router.push('/admin/login')
          return
        }
        // ok
      }catch(e){
        router.push('/admin/login')
      }finally{ setLoading(false) }
    }
    check()
  },[router])

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

  if (loading) return <div className="p-8">Checking authentication...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className={`${sidebarOpen ? 'w-72' : 'w-24'} bg-yellow-400 text-black h-screen sticky top-0 flex flex-col justify-between transition-all duration-200 overflow-hidden`}>
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-black text-yellow-400 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shrink-0">⚡</div>
                {sidebarOpen && (
                  <div className="min-w-0">
                    <div className="font-bold text-lg leading-tight">ELETTRO</div>
                    <div className="text-[10px] uppercase tracking-wide">Engineering Enterprises</div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="ml-2 bg-black/10 hover:bg-black/20 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shrink-0"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? '‹' : '›'}
              </button>
            </div>

            <nav className="mt-4 px-3 space-y-2 overflow-y-auto">
              {[
                'Dashboard','Inquiries','Bookings','Projects','Technicians','Inventory','Reports','Notifications','Settings'
              ].map((label, i)=> (
                <div key={label} className={`flex items-center gap-3 px-3 py-3 rounded-lg ${i===0? 'bg-black text-yellow-400':'hover:bg-yellow-300'}`}>
                  <div className="w-8 h-8 rounded bg-black/10 flex items-center justify-center shrink-0">{label[0]}</div>
                  {sidebarOpen && <div className="font-medium">{label}</div>}
                </div>
              ))}
            </nav>

            <div className="mt-auto p-3 border-t border-black/10">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className={`w-full flex items-center justify-center gap-2 rounded-lg bg-white text-black py-3 font-medium hover:bg-gray-100 disabled:opacity-60 ${!sidebarOpen ? 'px-2' : ''}`}
              >
                <span>{sidebarOpen ? (loggingOut ? 'Logging out...' : 'Logout') : '⎋'}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 overflow-auto">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, Admin!</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button className="p-2 bg-white rounded-full shadow">🔔</button>
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full text-xs w-5 h-5 flex items-center justify-center">4</span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm hover:bg-gray-100"
                >
                  <img src="/avatar.png" alt="admin" className="w-10 h-10 rounded-full" onError={(e)=>{(e.target as HTMLImageElement).src = 'https://via.placeholder.com/40'}}/>
                  <div className="text-right">
                    <div className="font-medium">Admin</div>
                    <div className="text-xs text-gray-500">Administrator</div>
                  </div>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      {loggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Top stats */}
          <section className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Inquiries</div>
              <div className="text-2xl font-bold">12</div>
              <div className="text-xs text-green-500">↗ 20% from last month</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Bookings</div>
              <div className="text-2xl font-bold">8</div>
              <div className="text-xs text-green-500">↗ 14% from last month</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Projects</div>
              <div className="text-2xl font-bold">15</div>
              <div className="text-xs text-green-500">↗ 25% from last month</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Technicians</div>
              <div className="text-2xl font-bold">6</div>
              <div className="text-xs text-gray-500">↗ 0% from last month</div>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Project Status Overview</h3>
              <div className="flex items-center gap-6">
                <svg width="180" height="180" viewBox="0 0 42 42" className="w-44 h-44">
                  <circle r="15.9155" cx="21" cy="21" fill="transparent" stroke="#fde68a" strokeWidth="10" strokeDasharray="37 63" strokeLinecap="round" transform="rotate(-90 21 21)" />
                  <circle r="15.9155" cx="21" cy="21" fill="transparent" stroke="#f59e0b" strokeWidth="10" strokeDasharray="25 75" strokeLinecap="round" transform="rotate(-90 21 21)" />
                  <circle r="15.9155" cx="21" cy="21" fill="transparent" stroke="#f97316" strokeWidth="10" strokeDasharray="15 85" strokeLinecap="round" transform="rotate(-90 21 21)" />
                </svg>
                <div>
                  <div className="flex items-center gap-4 mb-2"><span className="w-3 h-3 bg-yellow-400 rounded-full"/> <span>Completed <b>60% (9)</b></span></div>
                  <div className="flex items-center gap-4 mb-2"><span className="w-3 h-3 bg-amber-500 rounded-full"/> <span>Ongoing <b>25% (4)</b></span></div>
                  <div className="flex items-center gap-4"><span className="w-3 h-3 bg-orange-400 rounded-full"/> <span>Pending <b>15% (2)</b></span></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Recent Inquiries</h3>
                <a className="text-sm text-gray-500">View All</a>
              </div>
              <ul className="space-y-3">
                {[
                  ['Wiring Installation','Juan Dela Cruz','May 24, 2024'],
                  ['Electrical Repair','Maria Santos','May 24, 2024'],
                  ['Maintenance Service','ABC Company','May 23, 2024'],
                  ['Outlet Installation','Robert Garcia','May 22, 2024']
                ].map((r)=> (
                  <li key={r[0]} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r[0]}</div>
                      <div className="text-xs text-gray-500">{r[1]}</div>
                    </div>
                    <div className="text-xs text-yellow-400 bg-yellow-50 px-3 py-1 rounded-full">Pending</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-3 grid grid-cols-3 gap-4 mt-4">
              <div className="col-span-2 bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Ongoing Projects</h3>
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr><th>Project ID</th><th>Client</th><th>Technician</th><th>Progress</th><th>Status</th></tr>
                  </thead>
                  <tbody className="align-top">
                    {[
                      ['P-001','Juan Dela Cruz','John Smith','70%','Ongoing'],
                      ['P-002','ABC Company','Mark Santos','40%','Ongoing'],
                      ['P-003','Maria Santos','Pedro Cruz','20%','Ongoing'],
                      ['P-004','Robert Garcia','John Smith','80%','Ongoing']
                    ].map(r=> (
                      <tr key={r[0]} className="border-t">
                        <td className="py-3">{r[0]}</td>
                        <td>{r[1]}</td>
                        <td>{r[2]}</td>
                        <td>
                          <div className="w-48 bg-gray-100 rounded h-3 overflow-hidden">
                            <div style={{width: r[3]}} className="h-3 bg-yellow-400"></div>
                          </div>
                        </td>
                        <td><span className="text-xs bg-yellow-50 text-yellow-400 px-2 py-1 rounded-full">{r[4]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Calendar (Today)</h3>
                <ul className="space-y-4 text-sm">
                  <li><div className="text-xs text-gray-400">08:00 AM</div><div>Electrical Installation — Juan Dela Cruz</div></li>
                  <li><div className="text-xs text-gray-400">10:00 AM</div><div>Maintenance Service — ABC Company</div></li>
                  <li><div className="text-xs text-gray-400">01:00 PM</div><div>Wiring Repair — Maria Santos</div></li>
                  <li><div className="text-xs text-gray-400">03:00 PM</div><div>Outlet Installation — Robert Garcia</div></li>
                </ul>
              </div>

              <div className="col-span-1 bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Low Stock Alert</h3>
                <ul className="space-y-4 text-sm">
                  <li>
                    <div className="font-medium">THHN Wire 2.0mm</div>
                    <div className="text-xs text-gray-500">Stock: 15m • Min: 50m</div>
                    <div className="w-full bg-gray-100 h-2 rounded mt-2"><div className="h-2 bg-yellow-400" style={{width:'30%'}}/></div>
                  </li>
                  <li>
                    <div className="font-medium">Circuit Breaker 20A</div>
                    <div className="text-xs text-gray-500">Stock: 10 pcs • Min: 20 pcs</div>
                    <div className="w-full bg-gray-100 h-2 rounded mt-2"><div className="h-2 bg-yellow-400" style={{width:'50%'}}/></div>
                  </li>
                </ul>
                <div className="mt-4">
                  <button className="w-full py-2 rounded border border-yellow-400 text-yellow-400">View Inventory</button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
