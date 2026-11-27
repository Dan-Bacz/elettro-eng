export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024
export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type SalesProfile = {
  name: string
  email: string
  phone: string | null
  address: string | null
  profileImageUrl: string | null
}
