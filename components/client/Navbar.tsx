"use client"
import Link from "next/link"
import Image from "next/image"
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
        className={`sticky top-0 z-50 bg-[#080c10]/95 text-white backdrop-blur-xl transition-shadow ${
          scrolled ? "shadow-lg shadow-black/30 border-b border-yellow-400/20" : "border-b border-white/10"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between lg:h-[76px]">
            {/* Logo */}
            <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="Elettro Home">
              <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={40} height={40} className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-yellow-400/20 ring-1 ring-white/15 transition group-hover:scale-105 group-hover:ring-yellow-300/60" />
              <span className="leading-tight">
                <span className="block font-black text-lg tracking-wide">ELETTRO</span>
                <span className="hidden xs:block text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-gray-400 font-semibold">
                  Engineering Enterprises
                </span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1.5 lg:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    isActive(link.href)
                      ? "border-yellow-300/70 bg-yellow-400 text-black shadow-md shadow-yellow-400/20"
                      : "border-transparent text-gray-300 hover:-translate-y-0.5 hover:border-yellow-300/20 hover:bg-white/[0.07] hover:text-yellow-300"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              <Link
                href="/client"
                className="hidden items-center rounded-xl border border-white/15 bg-white/[0.03] px-3.5 py-2.5 text-sm font-semibold text-gray-200 transition-all hover:-translate-y-0.5 hover:border-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-300 sm:inline-flex"
              >
                Client Portal
              </Link>
              {/* Search */}
              <Link
                href="/products"
                aria-label="Search products"
                className="hidden h-10 w-10 items-center justify-center rounded-xl text-gray-300 transition-all hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-yellow-300 sm:flex"
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

              {/* Book a Service */}
              <Link
                href="/book-service"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-black shadow-md shadow-yellow-400/20 transition-all hover:-translate-y-0.5 hover:bg-yellow-300 sm:px-5"
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
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-200 transition-colors hover:bg-white/[0.08] hover:text-yellow-300 lg:hidden"
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
