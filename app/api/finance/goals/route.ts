import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Priority, GoalStatus } from '@prisma/client'

const goalSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  targetAmount: z.number().positive(),
  deadline: z.string().optional().transform((s) => s ? new Date(s) : undefined),
  priority: z.nativeEnum(Priority).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: { milestones: { orderBy: { targetAmount: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(goals)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = goalSchema.parse(body)

    const goal = await prisma.goal.create({ data: { ...data, userId } })
    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, savedAmount, status } = body

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...(savedAmount !== undefined && { savedAmount }),
        ...(status !== undefined && { status: status as GoalStatus }),
      },
    })
    return NextResponse.json(goal)
  } catch {
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}
