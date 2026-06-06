import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const budgetSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number(),
})

export async function GET(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1
  const year = Number(searchParams.get('year')) || new Date().getFullYear()

  try {
    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate spent amount per category from transactions
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (b) => {
        const result = await prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { userId, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: startDate, lt: endDate } },
        })
        return { ...b, spent: result._sum.amount || 0 }
      })
    )

    return NextResponse.json(budgetsWithSpent)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = budgetSchema.parse(body)

    const budget = await prisma.budget.upsert({
      where: { userId_categoryId_month_year: { userId, categoryId: data.categoryId, month: data.month, year: data.year } },
      update: { amount: data.amount },
      create: { ...data, userId },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing budget ID' }, { status: 400 })

  try {
    await prisma.budget.deleteMany({
      where: { id, userId },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
  }
}
