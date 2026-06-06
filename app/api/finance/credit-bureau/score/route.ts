import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const scoreSchema = z.object({
  creditScore: z.number().min(300).max(900),
  creditScoreDate: z.string().transform(s => new Date(s)),
})

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = scoreSchema.parse(body)
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        creditScore: data.creditScore,
        creditScoreDate: data.creditScoreDate,
      }
    })

    const scoreDate = new Date(data.creditScoreDate)
    const normalizedDate = new Date(scoreDate.getFullYear(), scoreDate.getMonth(), 1)

    await (prisma.creditScoreHistory as any).upsert({
      where: {
        userId_date: {
          userId,
          date: normalizedDate,
        }
      },
      create: {
        userId,
        score: data.creditScore,
        date: normalizedDate,
      },
      update: {
        score: data.creditScore,
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    console.error('CreditBureau Score POST error:', error)
    return NextResponse.json({ error: 'Failed to update credit score' }, { status: 500 })
  }
}
