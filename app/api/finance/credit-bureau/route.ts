import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CreditBureauAccountType, CreditBureauStatus } from '@prisma/client'

const creditBureauSchema = z.object({
  accountName: z.string().min(1),
  accountType: z.nativeEnum(CreditBureauAccountType),
  lender: z.string().min(1),
  creditLimit: z.number().min(0).optional().nullable(),
  outstandingBalance: z.number().min(0),
  monthlyPayment: z.number().min(0).default(0),
  status: z.nativeEnum(CreditBureauStatus).default('NORMAL'),
  reportDate: z.string().transform(s => new Date(s)),
  inquiryDate: z.string().optional().nullable().transform(s => s ? new Date(s) : new Date()),
  accountOpenDate: z.string().optional().nullable().transform(s => s ? new Date(s) : null),
  notes: z.string().optional().nullable(),
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditScore: true, creditScoreDate: true }
    })
    
    const items = await (prisma.creditBureau as any).findMany({
      where: { userId, isActive: true },
      orderBy: { outstandingBalance: 'desc' },
    })

    const scoreHistory = await (prisma.creditScoreHistory as any).findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    })

    const balanceHistories = await (prisma.creditBureauHistory as any).findMany({
      where: {
        creditBureau: {
          userId,
          isActive: true,
        }
      },
      orderBy: { reportDate: 'asc' },
      select: {
        outstandingBalance: true,
        creditLimit: true,
        monthlyPayment: true,
        reportDate: true,
        inquiryDate: true,
        creditBureauId: true,
        status: true,
      }
    })

    // Group balance histories by month
    const monthlyData: Record<string, { date: string; outstandingBalance: number; creditLimit: number; monthlyPayment: number }> = {}
    for (const bh of balanceHistories) {
      const monthStr = bh.reportDate.toISOString().split('T')[0] // 'YYYY-MM-01'
      if (!monthlyData[monthStr]) {
        monthlyData[monthStr] = {
          date: monthStr,
          outstandingBalance: 0,
          creditLimit: 0,
          monthlyPayment: 0,
        }
      }
      monthlyData[monthStr].outstandingBalance += bh.outstandingBalance
      monthlyData[monthStr].creditLimit += bh.creditLimit || 0
      monthlyData[monthStr].monthlyPayment += bh.monthlyPayment || 0
    }
    const balanceHistory = Object.values(monthlyData).sort((a, b) => a.date.localeCompare(b.date))
    
    return NextResponse.json({
      items,
      creditScore: user?.creditScore ?? null,
      creditScoreDate: user?.creditScoreDate ?? null,
      scoreHistory,
      balanceHistory,
      balanceHistories,
    })
  } catch (error) {
    console.error('CreditBureau GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch credit bureau data' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = creditBureauSchema.parse(body)

    const reportDate = new Date(data.reportDate)
    const normalizedReportDate = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1)

    const item = await (prisma.creditBureau as any).create({
      data: {
        ...data,
        userId,
        history: {
          create: {
            outstandingBalance: data.outstandingBalance,
            creditLimit: data.creditLimit,
            monthlyPayment: data.monthlyPayment,
            status: data.status,
            reportDate: normalizedReportDate,
            inquiryDate: data.inquiryDate,
          }
        }
      }
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    console.error('CreditBureau POST error:', error)
    return NextResponse.json({ error: 'Failed to create credit bureau entry' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const data = creditBureauSchema.parse(updateData)

    const reportDate = new Date(data.reportDate)
    const normalizedReportDate = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1)

    const item = await (prisma.creditBureau as any).update({
      where: { id, userId },
      data,
    })

    await (prisma.creditBureauHistory as any).upsert({
      where: {
        creditBureauId_reportDate: {
          creditBureauId: id,
          reportDate: normalizedReportDate,
        }
      },
      create: {
        creditBureauId: id,
        outstandingBalance: data.outstandingBalance,
        creditLimit: data.creditLimit,
        monthlyPayment: data.monthlyPayment,
        status: data.status,
        reportDate: normalizedReportDate,
        inquiryDate: data.inquiryDate,
      },
      update: {
        outstandingBalance: data.outstandingBalance,
        creditLimit: data.creditLimit,
        monthlyPayment: data.monthlyPayment,
        status: data.status,
        inquiryDate: data.inquiryDate,
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    console.error('CreditBureau PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update credit bureau entry' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await (prisma.creditBureau as any).deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete credit bureau entry' }, { status: 500 })
  }
}
