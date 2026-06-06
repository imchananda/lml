const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 'cmonv31nw000010e7xcywz8rr'; // From previous check_data.js

  const year = 2026;
  const month = 5;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  console.log("Checking income...");
  const incomeAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { userId, type: 'INCOME', date: { gte: startDate, lt: endDate } },
  });

  console.log("Checking expected recurring...");
  const activeIncomes = await prisma.recurringItem.findMany({
    where: { userId, isActive: true, type: 'INCOME' }
  });

  console.log("Checking byCategory...");
  const byCategoryRaw = await prisma.transaction.groupBy({
    by: ['categoryId'],
    _sum: { amount: true },
    where: { userId, type: 'EXPENSE', date: { gte: startDate, lt: endDate }, categoryId: { not: null } },
    orderBy: { _sum: { amount: 'desc' } },
    take: 6,
  });

  console.log("Checking totalDebt...");
  const totalDebt = await prisma.debt.aggregate({ _sum: { currentBalance: true }, where: { userId, isActive: true } });

  console.log("Checking totalSavings...");
  const totalSavings = await prisma.savingPot.aggregate({ _sum: { savedAmount: true }, where: { userId, isActive: true } });
  
  console.log("Checking investments...");
  const investments = await prisma.investment.findMany({ where: { userId } });

  console.log("Success!");
}
main().then(()=>prisma.$disconnect()).catch(console.error);
