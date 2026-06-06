import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1),
  amount: z.number().min(0),
  type: z.enum(['INCOME', 'EXPENSE']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  dayOfMonth: z.number().min(1).max(31).optional().nullable(),
  categoryId: z.string().optional().nullable(),
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await prisma.recurringItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })

  const categoryIds = items.map(i => i.categoryId).filter(Boolean) as string[]
  if (categoryIds.length > 0) {
    const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } })
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
    const itemsWithCat = items.map(i => ({ ...i, category: i.categoryId ? catMap[i.categoryId] : null }))
    return NextResponse.json(itemsWithCat)
  }

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    
    // Simple logic for nextDate: assume next month on the same day if MONTHLY
    const nextDate = new Date()
    if (data.dayOfMonth) {
      nextDate.setDate(data.dayOfMonth)
      // If the day is in the future, it will trigger when that day arrives.
      // If the day is today or in the past, it will trigger IMMEDIATELY for this month!
    } else {
      // If no day specified, trigger IMMEDIATELY today.
      // We don't add a month, so it evaluates as lte: now
    }

    const item = await prisma.recurringItem.create({
      data: {
        ...data,
        userId,
        nextDate
      }
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: "Failed to create recurring item" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  try {
    await prisma.recurringItem.deleteMany({
      where: { id, userId }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const parsedData = createSchema.parse(updateData)

    const existing = await prisma.recurringItem.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const item = await prisma.recurringItem.update({
      where: { id },
      data: parsedData
    })

    // SYNC: Update the current month's generated transaction to match the new settings
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const existingTx = await prisma.transaction.findFirst({
      where: {
        recurringId: id,
        date: { gte: startOfMonth, lt: endOfMonth }
      }
    })

    if (existingTx) {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const txDay = item.dayOfMonth ? Math.min(item.dayOfMonth, lastDay) : existingTx.date.getDate()
      const txDate = new Date(now.getFullYear(), now.getMonth(), txDay, 12, 0, 0)

      await prisma.transaction.update({
        where: { id: existingTx.id },
        data: {
          amount: item.amount,
          type: item.type,
          description: item.name,
          categoryId: item.categoryId,
          date: txDate
        }
      })
    }

    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: "Failed to update recurring item" }, { status: 500 })
  }
}
