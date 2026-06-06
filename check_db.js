const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.count();
  const bureau = await prisma.creditBureau.count();
  const allUsers = await prisma.user.findMany({
    include: {
      creditBureauItems: true
    }
  });
  console.log("Total Users:", users);
  console.log("Total Credit Bureau Items:", bureau);
  console.log("Users Data:", JSON.stringify(allUsers, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
