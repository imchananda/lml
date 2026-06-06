import { prisma } from "./prisma"

export async function processRecurringTransactions(userId: string) {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Get all active recurring items
    const items = await prisma.recurringItem.findMany({
      where: { userId, isActive: true }
    })

    if (items.length === 0) return

    for (const item of items) {
      if (item.frequency === 'MONTHLY') {
        // Idempotent Check: Does a transaction already exist for THIS month?
        const existingTx = await prisma.transaction.findFirst({
          where: {
            recurringId: item.id,
            date: { gte: startOfMonth, lt: endOfMonth }
          }
        })

        if (!existingTx) {
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
          const txDay = item.dayOfMonth ? Math.min(item.dayOfMonth, lastDay) : now.getDate()
          // Ensure we don't create future dates if day hasn't arrived?
          // The user specifically requested it to sync immediately "because it's monthly data"
          // So we will create it with the specified day, even if it's in the future of this month
          // This ensures it shows up in the dashboard immediately.
          const txDate = new Date(now.getFullYear(), now.getMonth(), txDay, 12, 0, 0)
          
          await prisma.transaction.create({
            data: {
              userId,
              amount: item.amount,
              type: item.type,
              description: item.name,
              note: 'Sync อัตโนมัติ (รายการประจำเดือน)',
              date: txDate,
              categoryId: item.categoryId,
              recurringId: item.id
            }
          })
        }
      } else {
        // Fallback for WEEKLY, DAILY, YEARLY using nextDate loop
        let currentDate = new Date(item.nextDate)
        let safetyCounter = 0
        
        while (currentDate <= now && safetyCounter < 60) {
          await prisma.transaction.create({
            data: {
              userId,
              amount: item.amount,
              type: item.type,
              description: item.name,
              note: 'Sync อัตโนมัติ (รายการประจำ)',
              date: currentDate,
              categoryId: item.categoryId,
              recurringId: item.id
            }
          })

          currentDate = calculateNextDate(currentDate, item.frequency, item.dayOfMonth)
          safetyCounter++
        }

        await prisma.recurringItem.update({
          where: { id: item.id },
          data: { nextDate: currentDate }
        })
      }
    }
  } catch (error) {
    console.error("Failed to process recurring transactions:", error)
  }
}

function calculateNextDate(current: Date, freq: string, dayOfMonth: number | null): Date {
  const next = new Date(current)
  switch (freq) {
    case 'DAILY': 
      next.setDate(next.getDate() + 1)
      break
    case 'WEEKLY': 
      next.setDate(next.getDate() + 7)
      break
    case 'BIWEEKLY': 
      next.setDate(next.getDate() + 14)
      break
    case 'MONTHLY': 
      next.setMonth(next.getMonth() + 1)
      if (dayOfMonth) {
        // Handle edge cases like Feb 30 by setting to day 1 first if needed
        // but JS date handles overflow. However, it's safer to just set Date directly
        const lastDayOfNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(dayOfMonth, lastDayOfNextMonth))
      }
      break
    case 'QUARTERLY': 
      next.setMonth(next.getMonth() + 3)
      if (dayOfMonth) {
        const lastDayOfQuarter = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(dayOfMonth, lastDayOfQuarter))
      }
      break
    case 'YEARLY': 
      next.setFullYear(next.getFullYear() + 1)
      if (dayOfMonth) {
        const lastDayOfYear = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(dayOfMonth, lastDayOfYear))
      }
      break
  }
  return next
}
