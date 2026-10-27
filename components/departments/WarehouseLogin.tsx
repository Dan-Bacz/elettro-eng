'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'

export default function WarehouseLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, expectedRole: 'WAREHOUSE' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'Sign in failed. Check your credentials and try again.')
        return
      }
      router.push('/warehouse/dashboard')
    } catch (loginError) {
      console.error('Warehouse sign-in failed:', loginError)
      setError('Could not connect to the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0f10] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,196,0,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(245,196,0,0.08),transparent_50%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo-elettro.jpg"
            alt="Elettro Engineering Enterprises"
            width={64}
            height={64}
            className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-xl shadow-yellow-400/20"
          />
          <h1 className="mt-4 text-2xl font-black tracking-wide text-white">ELETTRO</h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-400">Warehouse Portal</p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-white">Warehouse Sign In</h2>
          <p className="mt-1 text-sm text-gray-400">Sign in with your active Warehouse account.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="warehouse-email" className="mb-1.5 block text-sm font-semibold text-gray-300">Email</label>
              <input
                id="warehouse-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label htmlFor="warehouse-password" className="mb-1.5 block text-sm font-semibold text-gray-300">Password</label>
              <input
                id="warehouse-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            {error && <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-300">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-lg bg-yellow-400 px-6 py-3.5 text-sm font-bold text-black shadow-lg shadow-yellow-400/20 transition-colors hover:bg-yellow-300 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </section>

        <div className="mt-6 flex items-center justify-center gap-5 text-center">
          <Link href="/admin/login" className="text-sm text-gray-400 transition-colors hover:text-yellow-400">Admin sign in</Link>
          <Link href="/" className="text-sm text-gray-400 transition-colors hover:text-yellow-400">Back to Website</Link>
        </div>
      </div>
    </main>
  )
}
