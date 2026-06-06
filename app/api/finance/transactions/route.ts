import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TransactionType } from '@prisma/client'

const transactionSchema = z.object({
  amount: z.number().positive(),
  type: z.nativeEnum(TransactionType),
  description: z.string().optional(),
  note: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  categoryId: z.string().optional(),
})

export async function GET(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1
  const year  = Number(searchParams.get('year'))  || new Date().getFullYear()
  const categoryId = searchParams.get('categoryId')

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
        ...(categoryId ? { categoryId } : {})
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(transactions)
  } catch {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const parsedData = transactionSchema.parse(body)
    const transaction = await prisma.transaction.create({ data: { ...parsedData, userId } })
    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.transaction.delete({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const parsedData = transactionSchema.parse(updateData)
    
    // Verify ownership
    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: parsedData
    })
    return NextResponse.json(transaction)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
  }
}
