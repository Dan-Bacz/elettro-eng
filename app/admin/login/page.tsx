"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e){
    e.preventDefault()
    setLoading(true); setError('')
    try{
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({error: 'Login failed'}))
        setError(j.error || 'Login failed')
        setLoading(false)
        return
      }
      router.push('/admin')
    }catch(err){
      setError('Network error')
      console.error(err)
    }finally{ setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0b0f10] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,196,0,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(245,196,0,0.08),transparent_50%)]" />
      <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400 text-black text-3xl font-black shadow-xl shadow-yellow-400/20">
            ⚡
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-wide text-white">ELETTRO</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-semibold mt-1">
            Engineering Enterprises
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
          <h2 className="text-lg font-bold text-white">Admin Sign In</h2>
          <p className="mt-1 text-sm text-gray-400">Sign in with your admin account to access the dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                placeholder="admin@elettro.com"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/15 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/15 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg p-3 text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-yellow-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Website
          </Link>
        </div>
      </div>
    </div>
  )
}