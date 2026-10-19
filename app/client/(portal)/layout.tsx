import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import ClientShell from "../../../components/client/ClientShell"
import { getSessionUser } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"

export const metadata = { title: "Client Portal | Elettro Engineering" }

export default async function ClientPortalLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const session = await getSessionUser(cookieStore.get("token")?.value)
  if (!session || session.role !== "CLIENT") redirect("/client/login")

  const client = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true, email: true, role: true, status: true, emailVerifiedAt: true },
  })
  if (!client || client.role !== "CLIENT" || client.status !== "ACTIVE" || !client.emailVerifiedAt) {
    redirect("/client/login")
  }

  return <ClientShell user={{ name: client.name, email: client.email }}>{children}</ClientShell>
}
