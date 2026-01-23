const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'admin@society.com' },
    include: { society: true }
  });
  console.log('Admin User:', JSON.stringify(user, null, 2));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
