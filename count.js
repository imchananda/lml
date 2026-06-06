const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Users:', await prisma.user.count());
  console.log('Categories:', await prisma.category.count());
  console.log('Transactions:', await prisma.transaction.count());
  console.log('Debts:', await prisma.debt.count());
}
main().then(()=>prisma.$disconnect());
