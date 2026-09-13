import crypto from 'crypto'

const CLOUDINARY_FOLDER = 'elettro-inventory'

// Credentials come only from environment variables (Vercel project env or local .env).
// Do NOT hardcode them.
export function getCloudinaryCredentials() {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME
  let apiKey = process.env.CLOUDINARY_API_KEY
  let apiSecret = process.env.CLOUDINARY_API_SECRET

  // Fallback: allow the DSN form "cloudinary://key:secret@cloud_name"
  const dsn = process.env.CLOUDINARY_URL
  if (dsn) {
    const match = dsn.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/)
    if (match) {
      cloudName = cloudName || match[3]
      apiKey = apiKey || match[1]
      apiSecret = apiSecret || match[2]
    }
  }

  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

// Server-side signed upload to Cloudinary.
// Returns { secure_url, public_id } or null on failure.
export async function uploadToCloudinary(dataUrl: string, folder = CLOUDINARY_FOLDER) {
  const creds = getCloudinaryCredentials()
  if (!creds) {
    console.error('Cloudinary credentials missing (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)')
    return null
  }

  const { cloudName, apiKey, apiSecret } = creds
  const timestamp = Math.floor(Date.now() / 1000)

  try {
    // Signed upload: signature = SHA1 of sorted params + api_secret
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(toSign).digest('hex')

    const formData = new FormData()
    formData.append('folder', folder)
    formData.append('file', dataUrl)
    formData.append('api_key', apiKey)
    formData.append('timestamp', String(timestamp))
    formData.append('signature', signature)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData as any,
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error('Cloudinary upload failed status', res.status, txt)
      return null
    }

    const json = await res.json()
    if (!json.secure_url || !json.public_id) return null
    return { secure_url: json.secure_url, public_id: json.public_id }
  } catch (e) {
    console.error('Cloudinary upload failed', e)
    return null
  }
}