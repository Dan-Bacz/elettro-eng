import Link from 'next/link'

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-brand-700">Elettro Booking</h1>
      <p className="mt-4">Book electrical installation and maintenance services.</p>

      <div className="mt-6 space-x-4">
        <Link href="/client"><a className="btn">Client Area</a></Link>
        <Link href="/admin"><a className="btn">Admin</a></Link>
        <Link href="/tech"><a className="btn">Technician</a></Link>
        <Link href="/inventory"><a className="btn">Inventory</a></Link>
      </div>
    </main>
  )
}
