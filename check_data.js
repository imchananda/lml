const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Debts:', await prisma.debt.findMany());
  console.log('Transactions:', await prisma.transaction.findMany());
}
main().then(()=>prisma.$disconnect());
