const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main(){
  const email = 'lanzaderasjezamae959@gmail.com'
  const password = 'admin123'
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { console.log('No user found'); return }
  console.log('Found user:', user.email)
  const ok = await bcrypt.compare(password, user.password)
  console.log('Password match?', ok)
}

main()
  .catch(e=>{console.error(e);process.exit(1)})
  .finally(async ()=>{await prisma.$disconnect()})
