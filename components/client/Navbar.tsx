"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { NAV_LINKS } from "./siteData"
import { MobileMenu } from "./MobileMenu"

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname != null && (pathname === href || pathname.startsWith(href + "/"))
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-[#0b0f10] text-white transition-shadow ${
          scrolled ? "shadow-lg shadow-black/30 border-b border-yellow-400/20" : "border-b border-white/10"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Elettro Home">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-400 text-black font-black text-xl shadow-lg shadow-yellow-400/20">
                ⚡
              </span>
              <span className="leading-tight">
                <span className="block font-black text-lg tracking-wide">ELETTRO</span>
                <span className="hidden xs:block text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-gray-400 font-semibold">
                  Engineering Enterprises
                </span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive(link.href)
                      ? "text-black bg-yellow-400 shadow-md shadow-yellow-400/20"
                      : "text-gray-300 hover:text-yellow-400"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Search */}
              <Link
                href="/products"
                aria-label="Search products"
                className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg text-gray-300 hover:text-yellow-400 hover:bg-white/5 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </Link>

              {/* Admin Sign In */}
              <Link
                href="/admin/login"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-300 hover:text-yellow-400 transition-colors whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                Admin Sign In
              </Link>

              {/* Book a Service */}
              <Link
                href="/book-service"
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shadow-md shadow-yellow-400/20 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Book a Service
              </Link>

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-200 hover:bg-white/5 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}