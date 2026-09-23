const TEXTBEE_API_BASE = 'https://api.textbee.dev/api/v1'

// Normalize Philippine mobile numbers to E.164 format.
// Accepts "09XXXXXXXXX" (11 digits) and "+639XXXXXXXXX" (13 digits).
// Returns "+639XXXXXXXXX" or null if the number is not a valid PH mobile number.
export function normalizePhMobileNumber(input: string | null | undefined): string | null {
  if (!input) return null
  const digits = String(input).replace(/[\s\-()]/g, '')

  if (/^(\+63|63)9\d{9}$/.test(digits)) {
    const national = digits.replace(/^(\+63|63)/, '')
    return `+63${national}`
  }

  if (/^09\d{9}$/.test(digits)) {
    return `+63${digits.slice(1)}`
  }

  return null
}

export type SendTextbeeSmsResult = {
  ok: boolean
  phone: string | null
  error?: string
  details?: unknown
}

// Send an SMS through the TextBee Android gateway.
// Server-side only — the API key lives in process.env.TEXTBEE_API_KEY.
// Never throws: failures are logged and surfaced on the result.
export async function sendTextbeeSms(
  phone: string | null | undefined,
  message: string
): Promise<SendTextbeeSmsResult> {
  const apiKey = process.env.TEXTBEE_API_KEY
  const deviceId = process.env.TEXTBEE_DEVICE_ID

  const normalized = normalizePhMobileNumber(phone)
  if (!normalized) {
    console.warn(`TextBee SMS skipped: no valid PH mobile number for "${phone}"`)
    return { ok: false, phone: null, error: 'No valid Philippine mobile number' }
  }

  if (!apiKey || !deviceId) {
    console.warn('TextBee SMS skipped: TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID missing')
    return { ok: false, phone: normalized, error: 'TextBee credentials missing' }
  }

  try {
    const res = await fetch(`${TEXTBEE_API_BASE}/gateway/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        recipients: [normalized],
        message,
        deviceId,
      }),
    })

    const text = await res.text().catch(() => '')
    let json: unknown = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = text
    }

    if (!res.ok) {
      console.error('TextBee SMS failed status', res.status, text)
      return { ok: false, phone: normalized, error: `TextBee returned HTTP ${res.status}`, details: json }
    }

    console.log('TextBee SMS sent to', normalized, JSON.stringify(json))
    return { ok: true, phone: normalized, details: json }
  } catch (err) {
    console.error('TextBee SMS request failed', err)
    return { ok: false, phone: normalized, error: err instanceof Error ? err.message : 'TextBee request failed' }
  }
}

export const BOOKING_SUBMITTED_SMS_MESSAGE =
  'Elettro Engineering: Your booking request has been received and is currently under review. We will contact you once it has been reviewed.'