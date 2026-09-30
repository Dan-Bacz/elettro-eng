const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')

async function main() {
  const prisma = new PrismaClient()
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (!admin) throw new Error('no admin found')
    const token = jwt.sign({ userId: admin.id, role: admin.role, status: admin.status }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1d' })
    const out = path.join(process.env.TEMP, 'opencode', 'admin_token.txt')
    fs.writeFileSync(out, token)
    console.log('admin=' + admin.email + ' status=' + admin.status + ' token_written')

    const regs = await prisma.user.findMany({ where: { role: 'TECH' }, select: { id: true, name: true, email: true, status: true, approved: true } })
    const payload = { registrations: regs }
    fs.writeFileSync(path.join(__dirname, '__tmp-payload.json'), JSON.stringify(payload, null, 2))
    console.log('technicians=' + regs.length)
    const byStatus = {}
    for (const r of regs) {
      const s = r.status || (r.approved ? 'ACTIVE' : 'PENDING')
      byStatus[s] = (byStatus[s] || 0) + 1
    }
    console.log('by_status=' + JSON.stringify(byStatus))
  } finally {
    await prisma.$disconnect()
  }
}
main()
