import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import { NextResponse } from 'next/server'
import { processRecurringTransactions } from '@/lib/recurring-helper'

export async function GET(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1
  const year  = Number(searchParams.get('year'))  || new Date().getFullYear()

  try {
    // Run the lazy-load chron job to evaluate and execute any due recurring items
    // This ensures Dashboard data is always up to date
    await processRecurringTransactions(userId)

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    // Prepare dates for last 6 months cashflow
    const cashflowDates = Array.from({ length: 6 }, (_, index) => {
      const i = 5 - index
      const d = new Date(year, month - 1 - i, 1)
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      return { d, dEnd, monthName: d.toLocaleString('en', { month: 'short' }) }
    })

    // Execute all independent queries in parallel
    const [
      incomeAgg,
      expenseAgg,
      activeIncomes,
      byCategoryRaw,
      categories,
      recentTransactions,
      totalSavings,
      totalDebt,
      investments,
      creditBureauTotal,
      goals,
      ...cashflowResults
    ] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, type: 'INCOME', date: { gte: startDate, lt: endDate } },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, type: 'EXPENSE', date: { gte: startDate, lt: endDate } },
      }),
      prisma.recurringItem.findMany({
        where: { userId, isActive: true, type: 'INCOME' }
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        where: { userId, type: 'EXPENSE', date: { gte: startDate, lt: endDate }, categoryId: { not: null } },
        orderBy: { _sum: { amount: 'desc' } },
        take: 6,
      }),
      prisma.category.findMany(),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 5,
        include: { category: true },
      }),
      prisma.savingPot.aggregate({ _sum: { savedAmount: true }, where: { userId, isActive: true } }),
      prisma.debt.findMany({ where: { userId, isActive: true } }),
      prisma.investment.findMany({ where: { userId } }),
      (prisma.creditBureau as any).aggregate({
        _sum: { outstandingBalance: true },
        where: { userId, isActive: true }
      }),
      prisma.goal.findMany({ where: { userId, status: 'IN_PROGRESS' }, take: 3 }),

      // Last 6 months cashflow: income aggregates
      ...cashflowDates.map(fd =>
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { userId, type: 'INCOME', date: { gte: fd.d, lt: fd.dEnd } }
        })
      ),
      // Last 6 months cashflow: expense aggregates
      ...cashflowDates.map(fd =>
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { userId, type: 'EXPENSE', date: { gte: fd.d, lt: fd.dEnd } }
        })
      ),
    ])

    const totalIncome = incomeAgg._sum.amount || 0
    const totalExpense = expenseAgg._sum.amount || 0
    const netCashflow = totalIncome - totalExpense

    let expectedRecurringIncome = 0
    activeIncomes.forEach(item => {
      if (item.frequency === 'MONTHLY') expectedRecurringIncome += item.amount
      else if (item.frequency === 'YEARLY') expectedRecurringIncome += item.amount / 12
      else if (item.frequency === 'WEEKLY') expectedRecurringIncome += item.amount * 4.33
      else if (item.frequency === 'BIWEEKLY') expectedRecurringIncome += item.amount * 2.16
      else if (item.frequency === 'DAILY') expectedRecurringIncome += item.amount * 30
    })

    const projectedIncome = Math.max(totalIncome, expectedRecurringIncome)

    // Map categories lookup
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

    const byCategory = byCategoryRaw.map(c => ({
      name: catMap[c.categoryId!]?.name ?? 'Other',
      value: c._sum.amount || 0,
      color: catMap[c.categoryId!]?.color ?? '#6366f1',
    }))

    // Parse last 6 months cashflow results from parallel execution
    const cashflow = cashflowDates.map((fd, i) => {
      const inc = cashflowResults[i]
      const exp = cashflowResults[i + 6]
      return {
        month: fd.monthName,
        income: inc._sum.amount || 0,
        expense: exp._sum.amount || 0,
      }
    })

    const totalSavingsVal = totalSavings._sum.savedAmount || 0
    
    // Group active debts by name (case-insensitive) and select the latest record for each
    const latestDebtsByName: Record<string, typeof totalDebt[0]> = {}
    totalDebt.forEach(d => {
      const nameKey = d.name.trim().toLowerCase()
      const existing = latestDebtsByName[nameKey]
      if (!existing || new Date(d.asOfDate) > new Date(existing.asOfDate)) {
        latestDebtsByName[nameKey] = d
      }
    })
    const totalDebtVal = Object.values(latestDebtsByName).reduce((s, d) => s + d.currentBalance, 0)
    
    const totalInvestmentValue = investments.reduce((sum, inv) => sum + (inv.currentPrice ?? 0) * inv.quantity, 0)
    const netWorth = totalSavingsVal + totalInvestmentValue - totalDebtVal

    // Generate Net Worth History using Cashflow as proxy
    let currentNW = netWorth
    const netWorthHistory = []
    
    for (let i = cashflow.length - 1; i >= 0; i--) {
      const c = cashflow[i]
      const netChange = c.income - c.expense
      
      // Estimate historical split (assuming debt stays relatively stable for proxy)
      const estimatedDebt = totalDebtVal
      const estimatedAssets = currentNW + estimatedDebt

      netWorthHistory.unshift({
         month: c.month,
         netWorth: currentNW,
         assets: estimatedAssets,
         debt: estimatedDebt 
      })
      
      currentNW -= netChange // Step back in time for previous month
    }

    return NextResponse.json({
      totalIncome,
      projectedIncome,
      totalExpense,
      netCashflow,
      netWorth,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0,
      byCategory,
      recentTransactions,
      cashflow,
      netWorthHistory,
      goals: goals.map(g => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        savedAmount: g.savedAmount,
        color: g.color || '#6366f1',
      })),
      bureauStatus: {
        reportedDebt: creditBureauTotal._sum.outstandingBalance || 0,
        realDebt: totalDebtVal
      }
    })
  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 })
  }
}
