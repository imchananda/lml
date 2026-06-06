const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processRecurringTransactions(userId) {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const items = await prisma.recurringItem.findMany({
      where: { userId, isActive: true }
    })
    console.log("Items:", items.length);

    for (const item of items) {
      if (item.frequency === 'MONTHLY') {
        const existingTx = await prisma.transaction.findFirst({
          where: {
            recurringId: item.id,
            date: { gte: startOfMonth, lt: endOfMonth }
          }
        })
        console.log("Existing Tx for", item.id, ":", existingTx?.id);
      }
    }
  } catch (e) {
    console.error("Failed:", e);
    throw e;
  }
}

processRecurringTransactions('cmonv31nw000010e7xcywz8rr')
  .then(()=>prisma.$disconnect())
  .catch(console.error);
