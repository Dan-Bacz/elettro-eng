import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { sendAdminRegistrationNotification } from '../../../lib/email'

const prisma = new PrismaClient()

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  try {
    const { name, email, password, phone } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'TECH',
        approved: false
      }
    })

    await sendAdminRegistrationNotification({ name, email, phone })

    return res.status(201).json({
      ok: true,
      pending: true,
      message: 'Registration submitted successfully. Your account is pending admin approval. You will be able to login once an administrator approves your account.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}