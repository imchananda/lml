import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const potTransactionSchema = z.object({
  potId: z.string(),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(['DEPOSIT', 'WITHDRAW']),
  date: z.string(),
  note: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = potTransactionSchema.parse(body)

    // Verify ownership
    const pot = await prisma.savingPot.findUnique({ where: { id: data.potId, userId } })
    if (!pot) return NextResponse.json({ error: 'Pot not found or unauthorized' }, { status: 404 })

    // Use Prisma interactive transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the transaction
      const transaction = await tx.savingTransaction.create({
        data: {
          potId: data.potId,
          amount: data.amount,
          type: data.type,
          date: new Date(data.date),
          note: data.note,
        }
      })

      // 2. Update the pot balance
      const newBalance = data.type === 'DEPOSIT' 
        ? pot.savedAmount + data.amount 
        : Math.max(0, pot.savedAmount - data.amount) // Prevent negative balance

      const updatedPot = await tx.savingPot.update({
        where: { id: data.potId },
        data: { savedAmount: newBalance }
      })

      return { transaction, updatedPot }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    console.error(error)
    return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 })

  try {
    // We need to revert the balance before deleting
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.savingTransaction.findUnique({ 
        where: { id },
        include: { pot: true }
      })

      if (!transaction || transaction.pot.userId !== userId) {
        throw new Error('Transaction not found or unauthorized')
      }

      // Revert the balance
      const balanceChange = transaction.type === 'DEPOSIT' 
        ? -transaction.amount 
        : transaction.amount

      await tx.savingPot.update({
        where: { id: transaction.potId },
        data: { savedAmount: { increment: balanceChange } }
      })

      // Delete the transaction
      await tx.savingTransaction.delete({ where: { id } })
      return { success: true }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete transaction' }, { status: 500 })
  }
}
