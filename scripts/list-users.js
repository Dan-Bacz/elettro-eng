const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main(){
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, password: true, role: true, createdAt: true } })
  console.log('Users:', users)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
