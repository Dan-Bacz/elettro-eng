const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main(){
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'lanzaderasjezamae959@gmail.com'
  const adminName = process.env.DEFAULT_ADMIN_NAME || 'Eldred'
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'

  const legacyEmails = ['eldred@elettro.com']

  for (const legacyEmail of legacyEmails) {
    const legacy = await prisma.user.findUnique({ where: { email: legacyEmail } })
    if (legacy) {
      console.log('Removing legacy admin user:', legacy.email)
      await prisma.user.delete({ where: { email: legacyEmail } })
    }
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  const hashed = await bcrypt.hash(adminPassword, 10)

  if (existing) {
    const updated = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        name: adminName,
        password: hashed,
        role: 'ADMIN'
      }
    })
    console.log('Updated admin user:', updated.email)
    return
  }

  const user = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      password: hashed,
      role: 'ADMIN'
    }
  })

  console.log('Created default admin user:', user.email)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
