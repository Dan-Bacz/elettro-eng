import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { uploadToCloudinary } from '../../../lib/cloudinary'
import { sendAdminRegistrationNotification } from '../../../lib/email'

const prisma = new PrismaClient()

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
}

async function resolveProfileImage(profileImage: string | undefined | null) {
  if (!profileImage) return null
  const raw = String(profileImage).trim()
  if (!raw) return null
  // A locally selected/captured image must be uploaded to Cloudinary
  if (raw.startsWith('data:')) {
    const uploaded = await uploadToCloudinary(raw, 'elettro-technicians')
    return uploaded ? uploaded.secure_url : null
  }
  // A remote URL can be stored directly
  return raw
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  try {
    const { name, email, password, phone, address, specialization, yearsOfExperience, skills, profileImage } = req.body || {}

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
    const profileImageUrl = await resolveProfileImage(profileImage)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        status: 'PENDING',
        approved: false,
        role: 'TECH',
        address: address || null,
        specialization: specialization || null,
        yearsOfExperience: yearsOfExperience ? Math.max(0, Math.round(Number(yearsOfExperience))) : null,
        skills: skills || null,
        profileImageUrl
      }
    })

    // Notify admins in-app so the notifications center shows the pending registration
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'REGISTRATION',
          title: 'New Technician Registration',
          message: `${user.name} (${user.email}) registered for a technician account and is awaiting approval.`,
          link: '/admin/registrations'
        }))
      })
    }

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