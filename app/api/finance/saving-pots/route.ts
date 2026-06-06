import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const savingPotSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  targetAmount: z.number().positive("Target amount must be positive"),
  savedAmount: z.number().min(0).optional(),
  term: z.enum(['SHORT', 'MEDIUM', 'LONG']),
  targetDate: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional(),
  autoSaveAmount: z.number().optional().nullable(),
})

export async function GET(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const pots = await prisma.savingPot.findMany({
      where: { userId, isActive: true },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(pots)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch saving pots' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = savingPotSchema.parse(body)

    const pot = await prisma.savingPot.create({
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        savedAmount: data.savedAmount || 0,
        term: data.term,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        icon: data.icon,
        color: data.color || '#10b981',
        autoSaveAmount: data.autoSaveAmount,
        userId
      }
    })

    return NextResponse.json(pot, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create saving pot' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = savingPotSchema.parse(body)
    
    if (!data.id) return NextResponse.json({ error: 'Missing pot ID' }, { status: 400 })

    const pot = await prisma.savingPot.update({
      where: { id: data.id, userId },
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        term: data.term,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        icon: data.icon,
        color: data.color,
        autoSaveAmount: data.autoSaveAmount,
      }
    })

    return NextResponse.json(pot)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update saving pot' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing pot ID' }, { status: 400 })

  try {
    // We do a hard delete or soft delete depending on preference. 
    // Soft delete preserves transactions but hides the pot. Let's do soft delete.
    await prisma.savingPot.update({
      where: { id, userId },
      data: { isActive: false }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete saving pot' }, { status: 500 })
  }
}
