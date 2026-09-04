"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage(){
  const [loading, setLoading] = useState(true)
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

  if (loading) return <div className="p-8">Checking authentication...</div>

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
      <p className="mt-2">Verify client requests, approve bookings, and assign to technicians. API integration pending.</p>
    </main>
  )
}
