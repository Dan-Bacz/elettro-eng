import type { NextApiRequest, NextApiResponse } from 'next'
import { calculateShipping } from '../../../lib/shipping'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { address, barangay, city, province, postalCode } = req.body || {}
  if (!String(address || '').trim() || !String(city || '').trim() || !String(province || '').trim()) {
    return res.status(400).json({ error: 'Complete the delivery address to calculate shipping.' })
  }

  try {
    const estimate = await calculateShipping({ address, barangay, city, province, postalCode })
    return res.status(200).json({ ok: true, ...estimate })
  } catch (error: any) {
    return res.status(422).json({ error: error?.message || 'Could not calculate shipping for this address.' })
  }
}
