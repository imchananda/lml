import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AssetType } from '@prisma/client'

const investmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  ticker: z.string().optional().nullable(),
  assetType: z.nativeEnum(AssetType),
  quantity: z.number().min(0),
  costBasis: z.number().min(0),
  currentPrice: z.number().min(0).optional().nullable(),
  currency: z.string().optional(),
  notes: z.string().optional().nullable(),
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const investments = await prisma.investment.findMany({
      where: { userId },
      include: { 
        transactions: { 
          orderBy: { date: 'desc' }, 
          take: 10 
        } 
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(investments)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = investmentSchema.parse(body)

    const investment = await prisma.investment.create({ 
      data: { 
        ...data, 
        userId,
        currency: data.currency || 'THB'
      } 
    })
    return NextResponse.json(investment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = investmentSchema.parse(body)

    if (!data.id) return NextResponse.json({ error: 'Missing investment ID' }, { status: 400 })

    const investment = await prisma.investment.update({
      where: { id: data.id, userId },
      data: {
        name: data.name,
        ticker: data.ticker,
        assetType: data.assetType,
        quantity: data.quantity, // Allow manual override if needed
        costBasis: data.costBasis, // Allow manual override if needed
        currentPrice: data.currentPrice,
        currency: data.currency || 'THB',
        notes: data.notes
      }
    })

    return NextResponse.json(investment)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update investment' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing investment ID' }, { status: 400 })

  try {
    await prisma.investment.delete({
      where: { id, userId }
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete investment' }, { status: 500 })
  }
}
