import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser, getTokenFromRequest } from '../../../../lib/auth'

// Image understanding for inventory: calls OpenRouter with the uploaded product
// photo. Uses ONLY the free model (openrouter/free) — never switches to a paid
// model automatically. The API key lives only server-side via process.env.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = 'openrouter/free'
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 45000

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const CONFIDENCE_LEVELS = ['confirmed', 'likely', 'unknown'] as const

const FRIENDLY_UNAVAILABLE = 'AI identification is temporarily unavailable. Please try again later or enter the product details manually.'

function cleanString(value: unknown, max = 500): string {
  if (value === null || value === undefined) return ''
  const s = String(value).replace(/\s+/g, ' ').trim().slice(0, max)
  return s
}

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => cleanString(entry, 200))
    .filter(Boolean)
    .slice(0, 10)
}

function parseConfidence(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function normalizeLevel(value: unknown, confidence: number): (typeof CONFIDENCE_LEVELS)[number] {
  const raw = cleanString(value, 20).toLowerCase()
  if ((CONFIDENCE_LEVELS as readonly string[]).includes(raw)) return raw as (typeof CONFIDENCE_LEVELS)[number]
  if (confidence >= 0.85) return 'confirmed'
  if (confidence >= 0.6) return 'likely'
  return 'unknown'
}

// Pulls a JSON object out of the model output, tolerating markdown fences and prose.
function extractJson(text: string): any | null {
  const trimmed = text.trim()
  try {
    const direct = JSON.parse(trimmed)
    if (direct && typeof direct === 'object') return direct
  } catch {
    // ignore, try to locate a JSON block below
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) {
    try {
      const parsed = JSON.parse(fenced[1].trim())
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // ignore
    }
  }
  const objectMatch = trimmed.match(/\{\s*"[\s\S]*\}\s*}/)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0])
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // ignore
    }
  }
  return null
}

function validateSuggestion(raw: any) {
  const confidence = parseConfidence(raw?.confidence)
  const level = normalizeLevel(raw?.confidenceLevel, confidence)
  return {
    productType: cleanString(raw?.productType, 120),
    productName: cleanString(raw?.productName, 200),
    manufacturer: cleanString(raw?.manufacturer, 150) || null,
    brand: cleanString(raw?.brand ?? raw?.manufacturer, 150),
    model: cleanString(raw?.model, 150) || null,
    // modelNumber / productNumber may duplicate model — keep both for the form
    modelNumber: cleanString(raw?.modelNumber, 150) || cleanString(raw?.model, 150),
    productNumber: cleanString(raw?.productNumber, 150),
    possibleBrand: cleanString(raw?.possibleBrand, 150),
    possibleModel: cleanString(raw?.possibleModel, 150),
    category: cleanString(raw?.category, 80),
    unit: cleanString(raw?.unit, 40),
    specifications: cleanString(raw?.specifications, 1500),
    voltage: cleanString(raw?.voltage, 60),
    current: cleanString(raw?.current, 60),
    wattage: cleanString(raw?.wattage, 60),
    dimensions: cleanString(raw?.dimensions, 120),
    color: cleanString(raw?.color, 60),
    material: cleanString(raw?.material, 80),
    confidence,
    confidenceLevel: level,
    evidence: cleanArray(raw?.confidenceLevel === 'UNKNOWN' || level === 'unknown' ? [] : raw?.evidence),
    notes: cleanString(raw?.notes, 800),
  }
}

// Derives the base64 payload + mime type from a data URL (or plain base64 string).
function parseImagePayload(value: string): { mime: string; base64: string } | null {
  if (!value || typeof value !== 'string') return null
  const match = value.match(/^data:([a-zA-Z0-9.+\-/]+);base64,([A-Za-z0-9+/=]+)$/)
  if (match) return { mime: match[1].toLowerCase(), base64: match[2] }
  // tolerate a raw base64 string (no mime prefix)
  if (/^[A-Za-z0-9+/=]+$/.test(value) && value.length > 100) return { mime: 'image/png', base64: value }
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Only authenticated, active admins may use this endpoint.
    const user = await getSessionUser(getTokenFromRequest(req))
    if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // 2. Read + validate the image payload.
    const body = req.body || {}
    const rawImage = body.image || body.imageData || body.imageUrl || ''
    const productName = cleanString(body.productName, 200)

    if (!rawImage) {
      return res.status(400).json({ error: 'A product image is required for identification' })
    }

    const parsedImage = parseImagePayload(rawImage)
    if (!parsedImage) {
      return res.status(400).json({ error: 'Invalid image data. Please upload a valid product photo.' })
    }
    if (!ALLOWED_MIME_TYPES.includes(parsedImage.mime)) {
      return res.status(400).json({ error: 'Unsupported image type. Use PNG, JPG, JPEG, or WEBP.' })
    }

    const imageBytes = Math.floor((parsedImage.base64.length * 3) / 4)
    if (imageBytes > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Image is too large. Please upload an image under 8 MB.' })
    }

    // 3. Ensure the key exists (server-side only).
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error('Identify-product: process.env.OPENROUTER_API_KEY is missing (server-side only)')
      return res.status(503).json({ error: FRIENDLY_UNAVAILABLE })
    }

    // 4. Build the identification prompt + image content block.
    const prompt = [
      'You are a professional electrical engineering supply identification assistant.',
      'Inspect the uploaded product image carefully and return information about the electrical product shown.',
      '',
      'Identify ONLY what is visible in the image. Do not guess. For each detail, prefer text visible on the product, its packaging, or its label.',
      '',
      productName ? `The admin has entered this name hint (confirm it only if the image supports it): "${productName}"` : '',
      '',
      'Return a single JSON object (no markdown, no extra prose) with exactly these keys:',
      '{',
      '  "productType": "",',
      '  "productName": "",',
      '  "manufacturer": "",',
      '  "brand": "",',
      '  "model": "",',
      '  "modelNumber": "",',
      '  "productNumber": "",',
      '  "category": "",',
      '  "unit": "",',
      '  "specifications": "",',
      '  "voltage": "",',
      '  "current": "",',
      '  "wattage": "",',
      '  "dimensions": "",',
      '  "color": "",',
      '  "material": "",',
      '  "confidence": 0.0,',
      '  "confidenceLevel": "confirmed",',
      '  "possibleBrand": "",',
      '  "possibleModel": "",',
      '  "evidence": [],',
      '  "notes": ""',
      '}',
      '',
      'Rules:',
      '- confidence: a number 0.0 to 1.0 describing how sure you are about the identification.',
      '- confidenceLevel: must be exactly "confirmed" (>=0.9), "likely" (0.6-0.9), or "unknown" (<0.6).',
      '- If the exact manufacturer and/or model cannot be confirmed from the image, set manufacturer: null and/or model: null, and put your best guess in possibleBrand and possibleModel instead. NEVER present a guess as a confirmed manufacturer/model.',
      '- category: use one of: Lighting, Circuit Breakers, Wires & Cables, Panels & Boards, Switches & Outlets, Conduits & Fittings, Tools & Accessories, Other.',
      '- unit: use pcs, meters, rolls, reels, sets, or another simple unit visible on the label.',
      '- specifications: a compact summary of visible specs separated by bullets (e.g. "9W • E27 • 6500K").',
      '- voltage/current/wattage/dimensions/color/material: only include if visible on the product or its label, otherwise empty string.',
      '- evidence: list the specific things you saw (e.g. "Brand text visible on packaging", "Rated 230V / 10A printed on side").',
      '- notes: any uncertainty or additional observations.',
      '',
      'Categories for "category" above: use "Other" only when none of the listed categories clearly fit.',
    ]
      .filter((line) => line !== '')
      .join('\n')

    const payload = {
      model: OPENROUTER_MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${parsedImage.mime};base64,${parsedImage.base64}` },
            },
          ],
        },
      ],
    }

    // 5. Call OpenRouter with a timeout. No automatic paid-model fallback.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    let resp: Response
    try {
      resp = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    if (!resp.ok) {
      const status = resp.status
      let detail = ''
      try {
        detail = ((await resp.json()) as any)?.error?.message || ''
      } catch {
        // ignore
      }
      console.error(`Identify-product: OpenRouter returned ${status}${detail ? ` — ${detail}` : ''}`)
      if (status === 401) {
        return res.status(503).json({ error: FRIENDLY_UNAVAILABLE })
      }
      if (status === 402) {
        console.error('Identify-product: OpenRouter reported insufficient credits (402). Free model blocked; not switching to a paid model.')
        return res.status(503).json({ error: FRIENDLY_UNAVAILABLE })
      }
      if (status === 429) {
        return res.status(503).json({ error: FRIENDLY_UNAVAILABLE })
      }
      return res.status(503).json({ error: FRIENDLY_UNAVAILABLE })
    }

    // 6. Parse the assistant message.
    let content = ''
    try {
      const json = await resp.json()
      content = json?.choices?.[0]?.message?.content || ''
    } catch (e) {
      console.error('Identify-product: failed to parse OpenRouter response', e)
      return res.status(502).json({ error: FRIENDLY_UNAVAILABLE })
    }

    const rawSuggestion = extractJson(cleanString(content, 20000).replace(/\\n/g, '\n'))
    if (!rawSuggestion) {
      console.error('Identify-product: could not extract a JSON object from the model output')
      return res.status(502).json({ error: FRIENDLY_UNAVAILABLE })
    }

    // 7. Sanitize + validate before returning to the browser.
    const suggestion = validateSuggestion(rawSuggestion)
    return res.status(200).json({ ok: true, suggestion })
  } catch (e: any) {
    if (e?.name === 'AbortError' || e?.message === 'The user aborted a request.') {
      console.error('Identify-product: request timed out')
      return res.status(504).json({ error: FRIENDLY_UNAVAILABLE })
    }
    console.error('Identify-product: unexpected error', e)
    return res.status(500).json({ error: FRIENDLY_UNAVAILABLE })
  }
}