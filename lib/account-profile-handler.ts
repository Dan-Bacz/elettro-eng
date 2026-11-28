import type { NextApiRequest, NextApiResponse } from 'next'
import { Prisma } from '@prisma/client'
import { uploadToCloudinary } from './cloudinary'
import { requireVerifiedClient } from './client-auth'
import { requireActiveRole } from './department-auth'
import { prisma } from './prisma'
import { isProfilePhotoDataUrl } from './profile-photo-data'

export function accountProfileHandler(role: 'SALES' | 'WAREHOUSE' | 'CLIENT') {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'PATCH')
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const user = role === 'CLIENT' ? await requireVerifiedClient(req, res) : await requireActiveRole(req, res, [role])
    if (!user) return
    res.setHeader('Cache-Control', 'private, no-store')

    const { name, phone, address, photo } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      return res.status(400).json({ error: 'Enter a name between 1 and 100 characters.' })
    }
    if (typeof phone !== 'string' || phone.trim().length > 40) {
      return res.status(400).json({ error: 'Enter a phone number of up to 40 characters.' })
    }
    if (role === 'CLIENT' && !/^\d{8,15}$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ error: 'Enter a valid contact number.' })
    }
    if (typeof address !== 'string' || address.trim().length > 300) {
      return res.status(400).json({ error: 'Enter an address of up to 300 characters.' })
    }

    let profileImageUrl: string | null | undefined
    try {
      if (photo === null) {
        profileImageUrl = null
      } else if (photo !== undefined) {
        if (!isProfilePhotoDataUrl(photo)) return res.status(400).json({ error: 'Choose a JPG, PNG, or WebP photo up to 2 MB.' })
        const uploaded = await uploadToCloudinary(photo, `elettro-${role.toLowerCase()}-profiles`)
        if (!uploaded) return res.status(502).json({ error: 'Could not upload your photo. Please try again.' })
        profileImageUrl = uploaded.secure_url
      }

      const profile = await prisma.user.update({
        where: {
          id: user.id,
          role,
          status: 'ACTIVE',
          ...(role === 'CLIENT' ? { emailVerifiedAt: { not: null } } : {}),
        },
        data: {
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
        },
        select: { name: true, email: true, phone: true, address: true, profileImageUrl: true },
      })
      return res.status(200).json({ profile })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(403).json({ error: 'Your account is no longer active.' })
      }
      console.error('Account profile update failed:', error)
      return res.status(500).json({ error: 'Could not save your account settings.' })
    }
  }
}
