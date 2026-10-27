"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"

type ClientShellProps = {
  user: { name: string; email: string }
  children: ReactNode
}

const navItems = [
  { label: "Dashboard", href: "/client/dashboard", icon: "▦" },
  { label: "My Bookings", href: "/client/dashboard#bookings", icon: "▤" },
  { label: "My Orders", href: "/client/dashboard#orders", icon: "▣" },
  { label: "View Services", href: "/services", icon: "⌁" },
  { label: "View Products", href: "/products", icon: "▧" },
  { label: "Submit Feedback", href: "/client/feedback", icon: "✉" },
]

export default function ClientShell({ user, children }: ClientShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState("")
  const [hash, setHash] = useState("")

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash)
    updateHash()
    window.addEventListener("hashchange", updateHash)
    return () => window.removeEventListener("hashchange", updateHash)
  }, [])

  useEffect(() => setMobileOpen(false), [pathname])

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError("")
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (!response.ok) throw new Error("Could not securely sign out. Please try again.")
      router.replace("/client/login")
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Could not securely sign out.")
      setLoggingOut(false)
    }
  }

  const sidebarWidth = collapsed ? "md:w-[68px]" : "md:w-[260px]"
  const currentPath = pathname ?? ""
  const activeItem = (href: string) => {
    if (href.includes("#")) return currentPath === "/client/dashboard" && hash === href.slice(href.indexOf("#"))
    if (href === "/client/dashboard") return currentPath === href && !hash
    return currentPath === href || currentPath.startsWith(`${href}/`)
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {mobileOpen && <button aria-label="Close navigation menu" className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#2a3138] bg-[#0b0f10] text-gray-300 transition-all duration-200 ${sidebarWidth} ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          {collapsed ? (
            <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={36} height={36} className="mx-auto h-9 w-9 rounded-lg object-cover" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
                <div>
                  <div className="text-sm font-black leading-tight tracking-wide text-white">ELETTRO</div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-500">Client Portal</div>
                </div>
              </div>
              <button type="button" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" className="hidden h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/10 hover:text-white md:flex">‹</button>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white md:hidden">×</button>
            </>
          )}
        </div>
        {collapsed && <button type="button" onClick={() => setCollapsed(false)} aria-label="Expand sidebar" className="hidden h-10 items-center justify-center border-b border-white/10 text-gray-400 hover:bg-white/10 hover:text-white md:flex">›</button>}
        <nav aria-label="Client navigation" className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} title={collapsed ? item.label : undefined} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${activeItem(item.href) ? "bg-yellow-400 text-black shadow-md shadow-yellow-400/20" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
              <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-base">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="mb-3 flex min-w-0 items-center gap-3 px-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">{user.name.trim().charAt(0).toUpperCase()}</span>
            {!collapsed && <div className="min-w-0"><p className="truncate text-xs font-bold text-white">{user.name}</p><p className="truncate text-[11px] text-gray-500">{user.email}</p></div>}
          </div>
          {logoutError && <p role="alert" className="mb-2 px-2 text-xs text-red-300">{logoutError}</p>}
          <button type="button" onClick={handleLogout} disabled={loggingOut} title={collapsed ? "Log out" : undefined} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-60">
            <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center">↪</span>
            {!collapsed && <span className="truncate">{loggingOut ? "Signing out…" : "Log out"}</span>}
          </button>
        </div>
      </aside>
      <div className={`flex min-h-screen flex-col transition-all duration-200 ${collapsed ? "md:ml-[68px]" : "md:ml-[260px]"}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-[#0b0f10] px-4 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-200 hover:bg-white/10 md:hidden">☰</button>
            <div>
              <p className="text-sm font-bold">Client Dashboard</p>
              <p className="hidden text-[11px] text-gray-400 sm:block">ELETTRO Engineering Enterprises</p>
            </div>
          </div>
          <Link href="/" className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white">Visit website</Link>
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</main>
        <footer className="border-t border-slate-200 py-4 text-center text-[11px] font-medium text-slate-400">© {new Date().getFullYear()} ELETTRO Engineering Enterprises — Client Portal</footer>
      </div>
    </div>
  )
}
