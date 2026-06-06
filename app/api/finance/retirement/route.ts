import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user: any = await (prisma.user.findUnique as any)({
      where: { id: userId },
      select: { birthDate: true, monthlyIncome: true }
    })

    const totalSavingsObj = await prisma.savingPot.aggregate({
      _sum: { savedAmount: true },
      where: { userId, isActive: true }
    })

    const investments = await prisma.investment.findMany({ where: { userId } })
    const totalInvestments = investments.reduce((sum, inv) => sum + (inv.currentPrice ?? inv.costBasis) * inv.quantity, 0)

    let age = 30 // Default age if not set
    if (user?.birthDate) {
      age = Math.floor((new Date().getTime() - new Date(user.birthDate).getTime()) / 31557600000)
    }

    return NextResponse.json({
      currentAge: age,
      totalSavings: totalSavingsObj._sum.savedAmount || 0,
      totalInvestments
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch retirement data" }, { status: 500 })
  }
}
