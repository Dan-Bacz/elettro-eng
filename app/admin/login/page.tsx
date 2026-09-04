"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
      // on success navigate to admin dashboard
      router.push('/admin')
    }catch(err){
      setError('Network error')
      console.error(err)
    }finally{ setLoading(false) }
  }

  return (
    <main className="max-w-md mx-auto p-8">
      <h2 className="text-2xl font-semibold">Admin Sign In</h2>
      <p className="text-sm text-gray-600">Sign in with your admin account to access the dashboard.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded" required />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded" required />
        <div>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-black text-white rounded">{loading ? 'Signing in...' : 'Sign In'}</button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </main>
  )
}
