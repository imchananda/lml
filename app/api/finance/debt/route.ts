import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { DebtType } from '@prisma/client'

const debtSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(DebtType),
  totalAmount: z.number().positive(),
  currentBalance: z.number().min(0),
  interestRate: z.number().min(0),
  minimumPayment: z.number().min(0),
  dueDate: z.number().min(1).max(31).optional().nullable(),
  notes: z.string().optional(),
  asOfDate: z.string().optional().transform(s => s ? new Date(s) : new Date()),
})

const paymentSchema = z.object({
  debtId: z.string(),
  amount: z.number().positive(),
  note: z.string().optional(),
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const debts = await prisma.debt.findMany({
      where: { userId, isActive: true },
      include: { payments: { orderBy: { date: 'desc' }, take: 5 } },
      orderBy: { interestRate: 'desc' },
    })
    return NextResponse.json(debts)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch debts' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()

    // Check if it's a payment or a new debt
    if (body.debtId) {
      const data = paymentSchema.parse(body)
      const payment = await prisma.debtPayment.create({ data })
      // Update debt balance
      await prisma.debt.update({
        where: { id: data.debtId },
        data: { currentBalance: { decrement: data.amount } },
      })
      return NextResponse.json(payment, { status: 201 })
    }

    const data = debtSchema.parse(body)
    const debt = await (prisma.debt as any).create({ data: { ...data, userId } })
    return NextResponse.json(debt, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create debt' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const data = debtSchema.parse(updateData)
    
    // cast to any to bypass local TS errors if prisma generate is not up to date
    const debt = await (prisma.debt as any).update({
      where: { id, userId },
      data
    })
    return NextResponse.json(debt)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update debt' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.debtPayment.deleteMany({ where: { debtId: id } })
    await prisma.debt.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete debt' }, { status: 500 })
  }
}
