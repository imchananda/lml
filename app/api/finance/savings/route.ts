import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { SavingTerm } from '@prisma/client'

const potSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  term: z.nativeEnum(SavingTerm),
  targetDate: z.string().optional().transform((s) => s ? new Date(s) : undefined),
  color: z.string().optional(),
  autoSaveAmount: z.number().optional(),
})

const txSchema = z.object({
  potId: z.string(),
  amount: z.number().positive(),
  type: z.enum(['DEPOSIT', 'WITHDRAW']),
  note: z.string().optional(),
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const pots = await prisma.savingPot.findMany({
      where: { userId, isActive: true },
      include: { transactions: { orderBy: { date: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(pots)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch saving pots' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()

    // Check if it's a deposit/withdraw or new pot
    if (body.potId) {
      const data = txSchema.parse(body)
      const tx = await prisma.savingTransaction.create({ data })
      // Update pot balance
      const delta = data.type === 'DEPOSIT' ? data.amount : -data.amount
      await prisma.savingPot.update({
        where: { id: data.potId },
        data: { savedAmount: { increment: delta } },
      })
      return NextResponse.json(tx, { status: 201 })
    }

    const data = potSchema.parse(body)
    const pot = await prisma.savingPot.create({ data: { ...data, userId } })
    return NextResponse.json(pot, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create saving pot' }, { status: 500 })
  }
}
