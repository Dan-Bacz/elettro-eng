import { MAX_PROFILE_PHOTO_BYTES } from './staff-profile'

export function isProfilePhotoDataUrl(photo: unknown): photo is string {
  if (typeof photo !== 'string' || photo.length > 4 * Math.ceil(MAX_PROFILE_PHOTO_BYTES / 3) + 32) return false
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo)
  if (!match || match[2].length % 4 !== 0) return false

  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length > MAX_PROFILE_PHOTO_BYTES) return false
  if (match[1] === 'jpeg') return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  if (match[1] === 'png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
}
