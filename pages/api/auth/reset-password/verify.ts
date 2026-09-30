import { checkResetCode, isValidEmail } from '../../../../lib/password-reset'

/**
 * Optional pre-check used by the app between "enter code" and "choose password"
 * so the user finds out about a bad code before typing a new password.
 * Does not consume the code; the final reset re-checks it.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const email = String(req.body?.email ?? '').trim().toLowerCase()
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Enter a valid email address' })
  }

  try {
    const result = await checkResetCode(email, req.body?.code)
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, error: result.error })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('reset-password/verify: unexpected error', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '16kb' } },
}
