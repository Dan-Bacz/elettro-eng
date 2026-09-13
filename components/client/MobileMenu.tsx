"use client"
import Link from "next/link"
import { NAV_LINKS, COMPANY } from "./siteData"

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm z-[70] bg-[#0b0f10] text-white shadow-2xl transform transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-yellow-400 text-black font-black text-lg">
              ⚡
            </span>
            <span className="leading-tight">
              <span className="block font-black tracking-wide">ELETTRO</span>
              <span className="block text-[9px] uppercase tracking-[0.25em] text-gray-400 font-semibold">
                Engineering Enterprises
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-300 hover:bg-white/5 hover:text-yellow-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="px-4 py-6 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-gray-200 hover:bg-white/5 hover:text-yellow-400 font-semibold transition-colors"
            >
              {link.label}
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </nav>

        <div className="px-4 pb-6 space-y-3">
          <Link
            href="/book-service"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors"
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
          <Link
            href="/admin/login"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border border-white/15 text-gray-200 text-sm font-semibold hover:border-yellow-400 hover:text-yellow-400 transition-colors"
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
        </div>

        <div className="absolute bottom-0 inset-x-0 px-5 py-4 border-t border-white/10 bg-[#0b0f10]">
          <p className="text-xs text-gray-500">
            {COMPANY.phone} · {COMPANY.email}
          </p>
        </div>
      </div>
    </>
  )
}