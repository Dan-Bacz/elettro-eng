"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useState, type ChangeEvent, type FormEvent } from "react"

type Portal = "client" | "sales" | "warehouse"

export default function PortalRegistrationForm({ portal }: { portal: Portal }) {
  const isClient = portal === "client"
  const label = portal === "client" ? "Client portal" : portal === "sales" ? "Sales team" : "Warehouse team"
  const loginPath = `/${portal}/login`
  const [form, setForm] = useState({ firstName: "", middleName: "", lastName: "", email: "", phone: "", address: "", password: "", confirmPassword: "" })
  const [profileImage, setProfileImage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputClass = "mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-yellow-400 focus:bg-white/10 focus:ring-2 focus:ring-yellow-400/20"

  function update(field: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [field]: value }))
    setError("")
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProfileImage(String(reader.result || ""))
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.")
    if (form.password.length < (isClient ? 12 : 6)) return setError(`Password must be at least ${isClient ? 12 : 6} characters.`)
    setLoading(true)
    const name = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ")
    try {
      const response = await fetch(isClient ? "/api/auth/client-register" : "/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name,
          role: isClient ? undefined : portal.toUpperCase(),
          profileImage: isClient ? undefined : profileImage || undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not submit registration.")
      setSuccess(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit registration.")
    } finally { setLoading(false) }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0f10] px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,196,0,0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.08),transparent_50%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Image src="/logo-elettro.jpg" alt="Elettro Engineering Enterprises" width={64} height={64} className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-xl shadow-yellow-400/20" />
          <h1 className="mt-4 text-2xl font-black tracking-wide text-white">ELETTRO</h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-400">Engineering Enterprises</p>
        </div>
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          {success ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-3xl text-emerald-300">✓</div>
              <h2 className="mt-5 text-2xl font-black text-white">Registration submitted</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400">
                {isClient ? <>Check <strong className="text-gray-200">{form.email}</strong> for your verification link, then sign in to your client account.</> : `Your ${portal} account is pending admin approval. You can sign in after an administrator approves it.`}
              </p>
              <Link href={loginPath} className="mt-7 inline-flex rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300">Go to sign in</Link>
            </div>
          ) : (
            <>
              <Link href={loginPath} className="text-sm font-semibold text-gray-400 transition hover:text-yellow-400">← Back to sign in</Link>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">{label}</p>
              <h2 className="mt-2 text-2xl font-black text-white">Create your account</h2>
              <p className="mt-2 text-sm leading-5 text-gray-400">Complete your details to register for the {portal} portal.</p>
              <form onSubmit={submit} className="mt-6 space-y-5">
                {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-300">{error}</p>}
                {!isClient && <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-2xl text-gray-500">{profileImage ? <img src={profileImage} alt="Profile preview" className="h-full w-full object-cover" /> : "👤"}</div>
                  <div><button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-gray-300 transition hover:border-yellow-400 hover:text-yellow-300">Upload photo</button><p className="mt-1 text-[11px] text-gray-500">Optional profile photo</p></div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </div>}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block text-sm font-semibold text-gray-300">First name<input className={inputClass} value={form.firstName} onChange={e => update("firstName", e.target.value)} autoComplete="given-name" required maxLength={60} /></label>
                  <label className="block text-sm font-semibold text-gray-300">Middle name <span className="font-normal text-gray-500">(optional)</span><input className={inputClass} value={form.middleName} onChange={e => update("middleName", e.target.value)} autoComplete="additional-name" maxLength={60} /></label>
                  <label className="block text-sm font-semibold text-gray-300">Last name<input className={inputClass} value={form.lastName} onChange={e => update("lastName", e.target.value)} autoComplete="family-name" required maxLength={60} /></label>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-300">Email address<input className={inputClass} type="email" value={form.email} onChange={e => update("email", e.target.value)} autoComplete="email" required maxLength={254} /></label>
                  <label className="block text-sm font-semibold text-gray-300">Contact number<input className={inputClass} type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} autoComplete="tel" required={isClient} /></label>
                </div>
                {!isClient && <label className="block text-sm font-semibold text-gray-300">Address<input className={inputClass} value={form.address} onChange={e => update("address", e.target.value)} autoComplete="street-address" /></label>}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-300">Password<input className={inputClass} type={showPassword ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword(v => !v)} className="mt-1 text-xs font-bold text-gray-500 hover:text-yellow-300">{showPassword ? "Hide password" : "Show password"}</button></label>
                  <label className="block text-sm font-semibold text-gray-300">Confirm password<input className={inputClass} type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)} autoComplete="new-password" required /><button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="mt-1 text-xs font-bold text-gray-500 hover:text-yellow-300">{showConfirmPassword ? "Hide password" : "Show password"}</button></label>
                </div>
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Submitting..." : "Create account"}</button>
              </form>
              <p className="mt-6 text-center text-sm text-gray-400">Already registered? <Link href={loginPath} className="font-bold text-yellow-400 transition hover:text-yellow-300">Sign in</Link></p>
            </>
          )}
        </section>
        <Link href="/" className="mt-5 block text-center text-sm text-gray-400 transition hover:text-yellow-400">Back to ELETTRO website</Link>
      </div>
    </main>
  )
}
