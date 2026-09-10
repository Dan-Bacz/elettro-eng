import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()

async function sendAdminNotification(user: { name: string; email: string; phone?: string | null }) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@elettro.com'

    await transporter.sendMail({
      from: process.env.GMAIL_USER || 'noreply@elettro.com',
      to: adminEmail,
      subject: 'New Technician Registration Pending Approval - Elettro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0B0F10; padding: 20px; text-align: center;">
            <h1 style="color: #F5C400; margin: 0; font-size: 24px;">ELETTRO</h1>
            <p style="color: #9EA8AC; margin: 4px 0 0; font-size: 11px; letter-spacing: 2px;">ENGINEERING ENTERPRISES</p>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
            <h2 style="color: #111; margin-top: 0;">New Technician Registration</h2>
            <p style="color: #555; font-size: 14px;">A new technician has registered and is awaiting your approval.</p>
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong style="color: #333;">Name:</strong> ${user.name}</p>
              <p style="margin: 8px 0;"><strong style="color: #333;">Email:</strong> ${user.email}</p>
              ${user.phone ? `<p style="margin: 8px 0;"><strong style="color: #333;">Phone:</strong> ${user.phone}</p>` : ''}
              <p style="margin: 8px 0;"><strong style="color: #333;">Role:</strong> Technician</p>
            </div>
            <p style="color: #555; font-size: 14px;">Log in to the admin dashboard to approve or reject this registration.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://elettro-eng-one.vercel.app'}/admin" style="background-color: #F5C400; color: #111; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Open Admin Dashboard</a>
            </div>
          </div>
          <div style="background-color: #0B0F10; padding: 15px; text-align: center;">
            <p style="color: #666; margin: 0; font-size: 11px;">Elettro Engineering Enterprises - Automated Notification</p>
          </div>
        </div>
      `
    })
  } catch (error) {
    console.error('Failed to send admin notification email:', error)
  }
}

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

    await sendAdminNotification({ name, email, phone })

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
