import type { NextApiRequest, NextApiResponse } from 'next'
import { Prisma } from '@prisma/client'
import { uploadToCloudinary } from '../../../lib/cloudinary'
import { requireActiveRole } from '../../../lib/department-auth'
import { prisma } from '../../../lib/prisma'
import { MAX_PROFILE_PHOTO_BYTES } from '../../../lib/sales-profile'

export const config = { api: { bodyParser: { sizeLimit: '3mb' } } }

function validPhoto(photo: unknown): photo is string {
  if (typeof photo !== 'string' || photo.length > 4 * Math.ceil(MAX_PROFILE_PHOTO_BYTES / 3) + 32) return false
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo)
  if (!match || match[2].length % 4 !== 0) return false

  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length > MAX_PROFILE_PHOTO_BYTES) return false
  if (match[1] === 'jpeg') return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  if (match[1] === 'png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await requireActiveRole(req, res, ['SALES'])
  if (!user) return
  res.setHeader('Cache-Control', 'private, no-store')

  const { name, phone, address, photo } = req.body ?? {}
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ error: 'Enter a name between 1 and 100 characters.' })
  }
  if (typeof phone !== 'string' || phone.trim().length > 40) {
    return res.status(400).json({ error: 'Enter a phone number of up to 40 characters.' })
  }
  if (typeof address !== 'string' || address.trim().length > 300) {
    return res.status(400).json({ error: 'Enter an address of up to 300 characters.' })
  }

  let profileImageUrl: string | null | undefined
  try {
    if (photo === null) {
      profileImageUrl = null
    } else if (photo !== undefined) {
      if (!validPhoto(photo)) return res.status(400).json({ error: 'Choose a JPG, PNG, or WebP photo up to 2 MB.' })
      const uploaded = await uploadToCloudinary(photo, 'elettro-sales-profiles')
      if (!uploaded) return res.status(502).json({ error: 'Could not upload your photo. Please try again.' })
      profileImageUrl = uploaded.secure_url
    }

    const profile = await prisma.user.update({
      where: { id: user.id, role: 'SALES', status: 'ACTIVE' },
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
      return res.status(403).json({ error: 'Your Sales account is no longer active.' })
    }
    console.error('Sales profile update failed:', error)
    return res.status(500).json({ error: 'Could not save your account settings.' })
  }
}
