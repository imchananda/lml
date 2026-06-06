import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { targetAllocation: true }
  })

  // Default allocation if none exists
  const defaultAlloc = {
    STOCK: 60,
    BOND: 20,
    CASH: 10,
    REAL_ESTATE: 5,
    GOLD: 5,
    CRYPTO: 0
  }

  return NextResponse.json(user?.targetAllocation || defaultAlloc)
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    // Validate that total equals 100
    const total = Object.values(body).reduce((a: any, b: any) => a + Number(b), 0)
    if (total !== 100) {
      return NextResponse.json({ error: 'Total allocation must be 100%' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { targetAllocation: body }
    })

    return NextResponse.json({ success: true, targetAllocation: body })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
