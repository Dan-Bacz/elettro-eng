import type { NextApiRequest, NextApiResponse } from 'next'

const LOCAL_CATALOG = [
  {
    id: 'bulb',
    title: 'LED Bulb 12W',
    category: 'Lighting',
    brand: 'Philips',
    model: 'LED-12W-220V',
    description: 'Energy-saving LED lamp with warm white light, suitable for home and commercial lighting.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
    quantity: 20,
    unit: 'pcs'
  },
  {
    id: 'wire',
    title: 'Electrical Wire',
    category: 'Cable',
    brand: 'SAB',
    model: 'THHN-2.5MM',
    description: 'Copper conductor electrical cable for power distribution and wiring installation.',
    image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80',
    quantity: 50,
    unit: 'meters'
  }
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { query, imageData } = req.body || {}

  // If no OPENAI_API_KEY is configured, return local catalog matches
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    const q = (query || '').toString().toLowerCase()
    const matched = LOCAL_CATALOG.filter((it) => {
      if (!q) return false
      return (
        it.title.toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q) ||
        (it.model || '').toLowerCase().includes(q)
      )
    })
    return res.json(matched.length ? matched : LOCAL_CATALOG.slice(0, 3))
  }

  try {
    // Build a prompt to request structured JSON suggestions
    let prompt = `You are an assistant that recommends inventory items based on a short query or an item photo. Return a JSON array of objects with keys: id,title,category,brand,model,description,image,quantity,unit. Use plausible realistic values.`
    if (query) prompt += `\n\nQuery: "${query}"`
    if (imageData) prompt += `\n\nImage provided as base64 data. Describe the image and recommend likely matching items.`

    const payload = {
      model: 'gpt-4o-mini',
      input: prompt,
      max_output_tokens: 800
    }

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    if (!resp.ok) {
      const txt = await resp.text()
      console.error('OpenAI error:', txt)
      return res.status(502).json({ error: 'AI service failed', detail: txt })
    }

    const j = await resp.json()
    // The responses API may include content in different places; try to extract the text
    const output = j.output || j.results || []
    let text = ''
    if (Array.isArray(output) && output.length) {
      // pick the first text-like content
      const first = output[0]
      if (first.content) {
        // content can be array of chunks
        if (Array.isArray(first.content)) {
          text = first.content.map((c: any) => (typeof c === 'string' ? c : c.text || '')).join(' ')
        } else if (typeof first.content === 'string') {
          text = first.content
        }
      } else if (first.text) {
        text = first.text
      } else if (first.message && first.message.content) {
        text = Array.isArray(first.message.content) ? first.message.content.map((c: any) => c.text || '').join(' ') : first.message.content
      }
    }

    // Try to parse JSON from the assistant output
    let parsed = null
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      // Try to extract a JSON substring
      const m = text.match(/\[\s*\{[\s\S]*\}\s*\]/m)
      if (m) {
        try { parsed = JSON.parse(m[0]) } catch (e2) { parsed = null }
      }
    }

    if (!parsed) {
      // fallback to local
      return res.json(LOCAL_CATALOG.slice(0, 3))
    }

    return res.json(parsed)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'AI recommendation failed' })
  }
}
