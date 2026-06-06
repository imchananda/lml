import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { month, year } = await req.json()
    if (!month || !year) return NextResponse.json({ error: 'Missing month/year' }, { status: 400 })

    // Determine previous month/year
    let prevMonth = month - 1
    let prevYear = year
    if (prevMonth < 1) {
      prevMonth = 12
      prevYear -= 1
    }

    // Fetch previous month's budgets
    const prevBudgets = await prisma.budget.findMany({
      where: { userId, month: prevMonth, year: prevYear }
    })

    if (prevBudgets.length === 0) {
      return NextResponse.json({ message: 'No budgets found in the previous month to copy.' }, { status: 404 })
    }

    // Upsert them into the current month
    let copiedCount = 0
    for (const b of prevBudgets) {
      await prisma.budget.upsert({
        where: { 
          userId_categoryId_month_year: { 
            userId, 
            categoryId: b.categoryId, 
            month, 
            year 
          } 
        },
        update: {}, // Don't override existing amounts if they already manually created it
        create: {
          userId,
          categoryId: b.categoryId,
          month,
          year,
          amount: b.amount
        }
      })
      copiedCount++
    }

    return NextResponse.json({ success: true, copiedCount }, { status: 201 })
  } catch (error) {
    console.error('Failed to copy budgets:', error)
    return NextResponse.json({ error: 'Failed to copy budgets' }, { status: 500 })
  }
}
