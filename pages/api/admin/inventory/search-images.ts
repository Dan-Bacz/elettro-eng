import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser, getTokenFromRequest } from '../../../../lib/auth'

// Product image search for the inventory Add/Edit modal. The admin types a
// product name and gets real photographs back, which they then pick from.
//
// Source: Wikimedia Commons — free, no API key, no cost. Only files that are
// actually images are returned, together with the attribution data that
// Commons licensing requires us to display.

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const MAX_RESULTS = 12
const REQUEST_TIMEOUT_MS = 12000
// Wikimedia asks API clients to identify themselves.
const USER_AGENT = 'ElettroInventory/1.0 (product image search)'

export type ImageResult = {
  id: string
  title: string
  thumb: string
  url: string
  pageUrl: string
  artist: string
  license: string
}

function clean(value: unknown, max = 300): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max)
}

// Commons returns artist/licence as HTML fragments; strip tags for plain text.
function stripHtml(value: unknown, max = 200): string {
  return clean(String(value ?? '').replace(/<[^>]*>/g, ' '), max)
}

// Commons serves thumbnails from thumb.wikimedia.org and originals from
// upload.wikimedia.org. Only accept Wikimedia hosts over HTTPS, and drop the
// utm_* tracking parameters that the API appends.
function wikimediaUrl(value: unknown): string {
  const raw = clean(value, 600)
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') return ''
    const host = parsed.hostname.toLowerCase()
    if (host !== 'wikimedia.org' && !host.endsWith('.wikimedia.org')) return ''
    parsed.search = ''
    return parsed.toString()
  } catch {
    return ''
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getSessionUser(getTokenFromRequest(req))
    if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const raw = (req.method === 'GET' ? req.query.q : (req.body || {}).q) ?? ''
    const query = clean(raw, 120)
    if (query.length < 2) {
      return res.status(200).json({ results: [] })
    }

    const url =
      `${COMMONS_API}?action=query&format=json&formatversion=2` +
      `&generator=search&gsrnamespace=6&gsrlimit=${MAX_RESULTS * 2}` +
      `&gsrsearch=${encodeURIComponent(query)}` +
      `&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=400`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    let upstream: Response
    try {
      upstream = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      })
    } catch (e: any) {
      console.error('search-images: Commons request failed', e?.message || e)
      return res.status(502).json({ error: 'Image search is temporarily unavailable.' })
    } finally {
      clearTimeout(timer)
    }

    if (!upstream.ok) {
      console.error(`search-images: Commons returned HTTP ${upstream.status}`)
      return res.status(502).json({ error: `Image search failed (HTTP ${upstream.status}).` })
    }

    const data: any = await upstream.json().catch(() => null)
    const pages: any[] = Array.isArray(data?.query?.pages) ? data.query.pages : []

    const results: ImageResult[] = []
    for (const page of pages) {
      if (results.length >= MAX_RESULTS) break
      const info = page?.imageinfo?.[0]
      // Only real raster images; skip SVG/PNG diagrams of schematics etc.
      const mime = String(info?.mime || '')
      if (!mime.startsWith('image/') || mime === 'image/svg+xml') continue

      const thumb = wikimediaUrl(info?.thumburl)
      const original = wikimediaUrl(info?.url)
      if (!thumb || !original) continue
      const pageUrl = wikimediaUrl(info?.descriptionurl)

      const meta = info?.extmetadata || {}
      results.push({
        id: String(page.pageid ?? results.length),
        title: clean(String(page.title ?? '').replace(/^File:/, ''), 200),
        thumb,
        url: original,
        pageUrl,
        artist: stripHtml(meta.Artist?.value) || 'Unknown author',
        license: stripHtml(meta.LicenseShortName?.value) || 'See file page',
      })
    }

    // Brief shared cache so repeat searches do not hammer Commons.
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
    return res.status(200).json({ results })
  } catch (e: any) {
    console.error('search-images: unexpected error', e)
    return res.status(500).json({ error: 'Image search failed unexpectedly.' })
  }
}
