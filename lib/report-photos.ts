export const MAX_REPORT_PHOTOS = 3
export const MAX_REPORT_PHOTO_LENGTH = 450_000

export function readReportPhotos(value: string | null | undefined): string[] {
  try {
    const photos: unknown = JSON.parse(value || '[]')
    return Array.isArray(photos)
      ? photos.filter((photo): photo is string => typeof photo === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(photo))
      : []
  } catch {
    return []
  }
}
