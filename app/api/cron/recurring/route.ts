import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// This endpoint should be protected, e.g., using a secret token from Vercel Cron.
// For now, we will use a simple query parameter check for security if needed.
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const now = new Date()

    // Find all active recurring items that are due
    const dueItems = await prisma.recurringItem.findMany({
      where: {
        isActive: true,
        nextDate: { lte: now }
      }
    })

    let processedCount = 0

    for (const item of dueItems) {
      // Create the transaction
      await prisma.transaction.create({
        data: {
          amount: item.amount,
          type: item.type,
          description: item.name,
          note: `Auto-generated from recurring item`,
          date: now,
          userId: item.userId,
          categoryId: item.categoryId,
          recurringId: item.id
        }
      })

      // Calculate next date based on frequency
      let nextDate = new Date(item.nextDate)
      switch (item.frequency) {
        case 'DAILY':
          nextDate.setDate(nextDate.getDate() + 1)
          break
        case 'WEEKLY':
          nextDate.setDate(nextDate.getDate() + 7)
          break
        case 'BIWEEKLY':
          nextDate.setDate(nextDate.getDate() + 14)
          break
        case 'MONTHLY':
          nextDate.setMonth(nextDate.getMonth() + 1)
          break
        case 'QUARTERLY':
          nextDate.setMonth(nextDate.getMonth() + 3)
          break
        case 'YEARLY':
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          break
      }

      // Update the recurring item
      await prisma.recurringItem.update({
        where: { id: item.id },
        data: { nextDate }
      })

      processedCount++
    }

    return NextResponse.json({ success: true, processedCount })
  } catch (error: any) {
    console.error('Recurring cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
