import { randomUUID } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { getSessionUser, getTokenFromRequest } from '../../lib/auth'

const CATEGORIES = [
  'Assistance to Individuals in Crisis Situation (AICS)',
  'CICL/CAR',
  'Children in Need of Special Protection',
  'Disaster-Affected Families/Individuals',
  'Person with Disabilities (PWD)',
  'Senior Citizens',
  'VAWC Victims',
  'Women Especially in Difficult Circumstances',
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(getTokenFromRequest(req))
  if (!user) return res.status(401).json({ error: 'Authentication required' })
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' })

  if (req.method === 'GET') {
    const [beneficiaries, officers] = await Promise.all([
      prisma.beneficiary.findMany({ orderBy: { createdAt: 'desc' }, include: { assignedOfficer: { select: { id: true, name: true } } } }),
      prisma.user.findMany({ where: { role: 'TECH', status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    ])
    return res.status(200).json({ beneficiaries, officers, categories: CATEGORIES })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = req.body || {}
  const required = ['firstName', 'lastName', 'sex', 'category', 'address', 'barangay']
  for (const key of required) if (!String(body[key] || '').trim()) return res.status(400).json({ error: `${key} is required` })
  if (!CATEGORIES.includes(String(body.category))) return res.status(400).json({ error: 'Select a valid beneficiary category' })

  const created = await prisma.beneficiary.create({
    data: {
      beneficiaryId: `BEN-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${randomUUID().slice(0, 5).toUpperCase()}`,
      firstName: String(body.firstName).trim(), lastName: String(body.lastName).trim(), middleName: String(body.middleName || '').trim() || null,
      suffix: String(body.suffix || '').trim() || null, sex: String(body.sex).trim(),
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null, civilStatus: String(body.civilStatus || '').trim() || null,
      category: String(body.category), contactNumber: String(body.contactNumber || '').trim() || null, email: String(body.email || '').trim() || null,
      address: String(body.address).trim(), barangay: String(body.barangay).trim(), municipality: String(body.municipality || 'Mahayag').trim(), province: String(body.province || '').trim() || null,
      assignedOfficerId: String(body.assignedOfficerId || '').trim() || null,
    },
    include: { assignedOfficer: { select: { id: true, name: true } } },
  })
  return res.status(201).json({ beneficiary: created })
}
