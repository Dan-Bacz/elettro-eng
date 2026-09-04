const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main(){
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'eldred@elettro.com'
  const adminName = process.env.DEFAULT_ADMIN_NAME || 'Eldred'
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'

  console.log('Checking for existing admin user with email', adminEmail)
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existing) {
    console.log('Admin already exists:', existing.email)
    return
  }

  const hashed = await bcrypt.hash(adminPassword, 10)

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
