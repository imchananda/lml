import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const txSchema = z.object({
  investmentId: z.string(),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  price: z.number().min(0),
  fee: z.number().min(0).optional(),
  date: z.string(),
  note: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = txSchema.parse(body)

    const investment = await prisma.investment.findUnique({ where: { id: data.investmentId, userId } })
    if (!investment) return NextResponse.json({ error: 'Investment not found or unauthorized' }, { status: 404 })

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      const transaction = await tx.investmentTransaction.create({
        data: {
          investmentId: data.investmentId,
          type: data.type,
          quantity: data.quantity,
          price: data.price,
          fee: data.fee || 0,
          date: new Date(data.date),
          note: data.note,
        }
      })

      // 2. Update investment quantity and cost basis
      let newQuantity = investment.quantity
      let newCostBasis = investment.costBasis

      if (data.type === 'BUY') {
        newQuantity += data.quantity
        newCostBasis += (data.quantity * data.price) + (data.fee || 0)
      } else {
        // SELL
        // Decrease cost basis proportionally to the amount sold
        if (investment.quantity > 0) {
          const costPerUnit = investment.costBasis / investment.quantity
          const costReduction = costPerUnit * data.quantity
          newCostBasis = Math.max(0, investment.costBasis - costReduction)
        }
        newQuantity = Math.max(0, investment.quantity - data.quantity)
      }

      const updatedInvestment = await tx.investment.update({
        where: { id: data.investmentId },
        data: {
          quantity: newQuantity,
          costBasis: newCostBasis,
          currentPrice: data.price // Update current price to the latest transaction price
        }
      })

      return { transaction, updatedInvestment }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
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
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.investmentTransaction.findUnique({
        where: { id },
        include: { investment: true }
      })

      if (!transaction || transaction.investment.userId !== userId) {
        throw new Error('Transaction not found or unauthorized')
      }

      const inv = transaction.investment
      let newQuantity = inv.quantity
      let newCostBasis = inv.costBasis

      // Reverse the operation
      if (transaction.type === 'BUY') {
        newQuantity = Math.max(0, inv.quantity - transaction.quantity)
        newCostBasis = Math.max(0, inv.costBasis - (transaction.quantity * transaction.price) - transaction.fee)
      } else {
        // Reverse SELL (this is an approximation, we add back the sold value at the execution price as cost basis)
        newQuantity += transaction.quantity
        newCostBasis += (transaction.quantity * transaction.price) 
      }

      await tx.investment.update({
        where: { id: transaction.investmentId },
        data: { quantity: newQuantity, costBasis: newCostBasis }
      })

      await tx.investmentTransaction.delete({ where: { id } })
      return { success: true }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete transaction' }, { status: 500 })
  }
}
