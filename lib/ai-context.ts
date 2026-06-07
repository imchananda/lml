import { prisma } from '@/lib/prisma'
import { calculateTax } from '@/lib/calculators/tax'
import { calculateAge, calculateBMI, calculateBMR, calculateTDEE } from '@/lib/calculators/health'
import { calculateDaysUntil, calculateReadingProgress, calculateAverageScore, calculateStudyStreak } from '@/lib/calculators/study'

// ──────────────────────────────────────────────────────────────
// getUserFinancialContext
// ดึงข้อมูลสรุปแบบ Privacy-safe เพื่อส่งไปให้ AI
// ห้ามส่ง: ชื่อบัญชี, รายการธุรกรรมย่อย, ข้อมูลส่วนตัว
// ──────────────────────────────────────────────────────────────
export async function getUserFinancialContext(userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  const startDate = new Date(year, month - 1, 1)
  const endDate   = new Date(year, month, 1)

  // ─── Cashflow this month ─────────────────────────────────────
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: 'INCOME', date: { gte: startDate, lt: endDate } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: 'EXPENSE', date: { gte: startDate, lt: endDate } },
    }),
  ])

  const monthlyIncome  = incomeAgg._sum.amount  || 0
  const monthlyExpense = expenseAgg._sum.amount  || 0
  const savingsRate    = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome * 100) : 0

  // Top 3 expense categories (ชื่อหมวดและ % เท่านั้น)
  const byCategoryRaw = await prisma.transaction.groupBy({
    by: ['categoryId'],
    _sum: { amount: true },
    where: { userId, type: 'EXPENSE', date: { gte: startDate, lt: endDate }, categoryId: { not: null } },
    orderBy: { _sum: { amount: 'desc' } },
    take: 3,
  })
  const categoryIds = byCategoryRaw.map(c => c.categoryId).filter(Boolean) as string[]
  const categories  = await prisma.category.findMany({ where: { id: { in: categoryIds } } })
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  const topExpenseCategories = byCategoryRaw.map(c => ({
    name: catMap[c.categoryId!] ?? 'อื่นๆ',
    pct: monthlyExpense > 0 ? Math.round((c._sum.amount! / monthlyExpense) * 100) : 0,
  }))

  // ─── Last month cashflow (for comparison) ───────────────────
  const prevStart = new Date(year, month - 2, 1)
  const prevEnd   = new Date(year, month - 1, 1)
  const prevExpAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { userId, type: 'EXPENSE', date: { gte: prevStart, lt: prevEnd } },
  })
  const prevMonthExpense  = prevExpAgg._sum.amount || 0
  const expenseChangesPct = prevMonthExpense > 0
    ? Math.round(((monthlyExpense - prevMonthExpense) / prevMonthExpense) * 100)
    : 0

  // ─── Portfolio / Investments ─────────────────────────────────
  const investments = await prisma.investment.findMany({ where: { userId } })
  const totalInvestmentValue = investments.reduce((s, i) => s + ((i.currentPrice ?? (i.quantity > 0 ? i.costBasis / i.quantity : 0)) * i.quantity), 0)
  const totalCostBasis       = investments.reduce((s, i) => s + i.costBasis, 0)
  const portfolioPL          = totalInvestmentValue - totalCostBasis
  const portfolioPLPct       = totalCostBasis > 0 ? Math.round((portfolioPL / totalCostBasis) * 100) : 0

  // Asset Allocation สัดส่วน % ตาม AssetType
  const allocationByType: Record<string, number> = {}
  investments.forEach(i => {
    const val = (i.currentPrice ?? 0) * i.quantity
    allocationByType[i.assetType] = (allocationByType[i.assetType] || 0) + val
  })
  const allocByTypePct: Record<string, number> = {}
  if (totalInvestmentValue > 0) {
    Object.entries(allocationByType).forEach(([t, v]) => {
      allocByTypePct[t] = Math.round((v / totalInvestmentValue) * 100)
    })
  }

  // ─── Debt & DSR ─────────────────────────────────────────────
  const debts = await prisma.debt.findMany({ where: { userId, isActive: true } })
  
  // Calculate total debt using only the latest month that has records
  let latestDebtsList: typeof debts = []
  if (debts.length > 0) {
    let latestTime = 0
    debts.forEach(d => {
      if (!d.asOfDate) return
      const time = new Date(d.asOfDate).getTime()
      if (time > latestTime) latestTime = time
    })
    if (latestTime > 0) {
      const latestDate = new Date(latestTime)
      const latestMonth = latestDate.getMonth()
      const latestYear = latestDate.getFullYear()
      latestDebtsList = debts.filter(d => {
        if (!d.asOfDate) return false
        const dDate = new Date(d.asOfDate)
        return dDate.getMonth() === latestMonth && dDate.getFullYear() === latestYear
      })
    }
  }
  
  const totalDebt    = latestDebtsList.reduce((s, d) => s + d.currentBalance, 0)
  const totalMinPmt  = latestDebtsList.reduce((s, d) => s + d.minimumPayment, 0)
  const dsr          = monthlyIncome > 0 ? Math.round((totalMinPmt / monthlyIncome) * 100) : 0
  const highestApr   = latestDebtsList.length > 0 ? Math.max(...latestDebtsList.map(d => d.interestRate)) : 0

  // ─── Savings ─────────────────────────────────────────────────
  const savingsAgg = await prisma.savingPot.aggregate({
    _sum: { savedAmount: true },
    where: { userId, isActive: true },
  })
  const totalSavings = savingsAgg._sum.savedAmount || 0

  // ─── Net Worth ───────────────────────────────────────────────
  const netWorth = totalSavings + totalInvestmentValue - totalDebt

  // ─── Tax (current year) ──────────────────────────────────────
  let taxSummary = null
  const taxProfile = await prisma.taxProfile.findUnique({
    where: { userId_year: { userId, year } },
  })
  if (taxProfile) {
    const taxResult = calculateTax(taxProfile as any)
    // คำนวณว่ายังซื้อกองทุนลดหย่อนได้อีกเท่าไร (SSF cap 200k, RMF cap 500k)
    const totalRetirementUsed = taxProfile.ssf + taxProfile.rmf + taxProfile.providentFund + taxProfile.pensionInsurance
    const retirementBudgetLeft = Math.max(0, 500000 - totalRetirementUsed)
    taxSummary = {
      estimatedIncome: Math.round(taxResult.totalIncome),
      estimatedTax:    Math.round(taxResult.taxAmount),
      marginalRate:    taxResult.marginalTaxRate,
      unusedRetirementBudget: Math.round(retirementBudgetLeft),
      monthsLeft: 12 - month, // เดือนที่เหลือในปีนี้
    }
  }

  // ─── Goals ───────────────────────────────────────────────────
  const goals = await prisma.goal.findMany({ where: { userId, status: 'IN_PROGRESS' } })
  const onTrackCount  = goals.filter(g => g.targetAmount > 0 && (g.savedAmount / g.targetAmount) >= 0.5).length
  const criticalGoals = goals
    .filter(g => g.targetAmount > 0 && (g.savedAmount / g.targetAmount) < 0.3)
    .slice(0, 2)
    .map(g => ({ name: g.name, pct: Math.round((g.savedAmount / g.targetAmount) * 100) }))

  return {
    period: { month, year },
    cashflow: {
      monthlyIncome:  Math.round(monthlyIncome),
      monthlyExpense: Math.round(monthlyExpense),
      savingsRate:    Math.round(savingsRate),
      topExpenseCategories,
      expenseChangeVsLastMonthPct: expenseChangesPct,
    },
    netWorth: Math.round(netWorth),
    portfolio: {
      totalValue:       Math.round(totalInvestmentValue),
      totalCost:        Math.round(totalCostBasis),
      plPercent:        portfolioPLPct,
      allocationByType: allocByTypePct,
    },
    savings: { total: Math.round(totalSavings) },
    debt: {
      total:      Math.round(totalDebt),
      dsr,
      highestApr,
      debtCount:  latestDebtsList.length,
    },
    tax: taxSummary,
    goals: {
      total:       goals.length,
      onTrackCount,
      criticalGoals,
    },
  }
}

// ──────────────────────────────────────────────────────────────
// getUserHealthContext
// ──────────────────────────────────────────────────────────────
export async function getUserHealthContext(userId: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  // 1. Health profile & User birthDate
  const [profile, user] = await Promise.all([
    prisma.healthProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { birthDate: true } }),
  ])

  // 2. Latest weight and metrics
  const latestMetrics = await prisma.bodyMetric.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 3,
  })

  // 3. Latest measurement
  const latestMeasurement = await prisma.bodyMeasurement.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
  })

  // 4. Today's calories consumed and burned
  const [calAgg, burnAgg] = await Promise.all([
    prisma.calorieLog.aggregate({
      _sum: { calories: true },
      where: { userId, date: { gte: today, lt: tomorrow } },
    }),
    prisma.workoutLog.aggregate({
      _sum: { caloriesBurned: true },
      where: { userId, date: { gte: today, lt: tomorrow } },
    }),
  ])

  // 5. Active health goal
  const activeGoal = await prisma.healthGoal.findFirst({
    where: { userId, status: 'IN_PROGRESS' },
    orderBy: { createdAt: 'desc' },
  })

  // 6. Recent workouts
  const recentWorkouts = await prisma.workoutLog.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 3,
  })

  const currentWeight = latestMetrics[0]?.weightKg || null
  const heightCm = profile?.heightCm || null
  const gender = profile?.gender || 'MALE'
  const activityLevel = profile?.activityLevel || 'MODERATE'

  let age = 30
  if (user?.birthDate) {
    age = calculateAge(user.birthDate)
  }

  let bmi = null
  let bmr = null
  let tdee = null
  if (currentWeight && heightCm) {
    const bmiResult = calculateBMI(currentWeight, heightCm)
    bmi = {
      score: Math.round(bmiResult.score * 10) / 10,
      category: bmiResult.category,
    }
    bmr = Math.round(calculateBMR(currentWeight, heightCm, age, gender))
    tdee = Math.round(calculateTDEE(bmr, activityLevel))
  }

  const caloriesConsumedToday = calAgg._sum.calories || 0
  const caloriesBurnedToday = burnAgg._sum.caloriesBurned || 0

  return {
    weight: {
      current: currentWeight,
      history: latestMetrics.map(m => ({ date: m.date, weight: m.weightKg })),
    },
    bmi,
    tdee,
    calories: {
      consumedToday: caloriesConsumedToday,
      burnedToday: caloriesBurnedToday,
      netToday: caloriesConsumedToday - caloriesBurnedToday,
    },
    measurements: latestMeasurement ? {
      waist: latestMeasurement.waistCm,
      hip: latestMeasurement.hipCm,
      chest: latestMeasurement.chestCm,
      date: latestMeasurement.date,
    } : null,
    goal: activeGoal ? {
      type: activeGoal.type,
      target: activeGoal.targetValue,
      start: activeGoal.startValue,
      current: activeGoal.currentValue,
    } : null,
    recentWorkouts: recentWorkouts.map(w => ({
      name: w.name,
      type: w.workoutType,
      duration: w.durationMinutes,
      burned: w.caloriesBurned,
    })),
  }
}

// ──────────────────────────────────────────────────────────────
// getUserStudyContext
// ──────────────────────────────────────────────────────────────
export async function getUserStudyContext(userId: string) {
  // 1. Active exam details & countdown
  const activeExam = await prisma.studyExam.findFirst({
    where: { userId, isActive: true },
    include: { subjects: true },
  })

  const daysToExam = activeExam ? calculateDaysUntil(activeExam.examDate) : null

  // 2. Books reading progress
  const books = await prisma.studyBook.findMany({ where: { userId } })
  const totalBooks = books.length
  const completedBooks = books.filter(b => b.status === 'COMPLETED').length
  const readingProgress = calculateReadingProgress(books)

  // 3. Study sessions & streak
  const sessions = await prisma.studySession.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  })
  const streak = calculateStudyStreak(sessions)

  // Calculate total minutes studied this week
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const thisWeekSessions = sessions.filter(s => new Date(s.date) >= oneWeekAgo)
  const weeklyStudyMinutes = thisWeekSessions.reduce((sum, s) => sum + s.durationMinutes, 0)

  // 4. Scores & average vs target
  const scores = await prisma.studyScore.findMany({
    where: { userId },
    include: { subject: true },
  })
  const averageScorePct = calculateAverageScore(scores)

  // Recent scores
  const recentScores = await prisma.studyScore.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 3,
    include: { subject: true },
  })

  // 5. Schedules (upcoming study blocks)
  const now = new Date()
  const upcomingSchedules = await prisma.studySchedule.findMany({
    where: {
      userId,
      OR: [
        { date: { gte: now } },
        { isRecurring: true },
      ],
    },
    orderBy: { startTime: 'asc' },
    take: 5,
  })

  return {
    exam: activeExam ? {
      name: activeExam.name,
      date: activeExam.examDate,
      daysToExam,
      program: activeExam.program,
      university: activeExam.university,
    } : null,
    reading: {
      totalBooks,
      completedBooks,
      progressPct: readingProgress,
      currentlyReading: books.filter(b => b.status === 'READING').map(b => b.title),
    },
    streak,
    weeklyStudyHours: Math.round((weeklyStudyMinutes / 60) * 10) / 10,
    scores: {
      averagePct: averageScorePct,
      recent: recentScores.map(s => ({
        testName: s.testName,
        subject: s.subject.name,
        percentage: Math.round((s.score / s.maxScore) * 100),
      })),
    },
    upcomingSchedules: upcomingSchedules.map(s => ({
      title: s.title,
      type: s.type,
      time: `${s.startTime} - ${s.endTime}`,
    })),
  }
}

// ──────────────────────────────────────────────────────────────
// getUserTodoContext
// ──────────────────────────────────────────────────────────────
export async function getUserTodoContext(userId: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  // 1. Candidate tasks: today's tasks + recurring tasks that started on/before today
  const candidateTasks = await prisma.todoTask.findMany({
    where: {
      userId,
      OR: [
        { date: { gte: today, lt: tomorrow } },
        { isRecurring: true, date: { lt: tomorrow } },
      ],
    },
    include: { category: true },
    orderBy: { sortOrder: 'asc' },
  })

  // 2. Filter recurring tasks by pattern match & map dynamic completion status
  const todayTasks = candidateTasks.filter(task => {
    if (!task.isRecurring) return true
    const taskMidnight = new Date(task.date.getFullYear(), task.date.getMonth(), task.date.getDate())
    if (taskMidnight > today) return false
    if (task.recurFrequency === 'DAILY') return true
    if (task.recurFrequency === 'WEEKLY') return today.getDay() === taskMidnight.getDay()
    if (task.recurFrequency === 'MONTHLY') return today.getDate() === taskMidnight.getDate()
    return false
  }).map(task => {
    if (task.isRecurring && task.status === 'COMPLETED') {
      const cd = task.completedAt ? new Date(task.completedAt) : null
      const isSameDay = cd &&
        cd.getFullYear() === today.getFullYear() &&
        cd.getMonth() === today.getMonth() &&
        cd.getDate() === today.getDate()
      if (!isSameDay) {
        return { ...task, status: 'PENDING' as const, completedAt: null }
      }
    }
    return task
  })

  // 3. Pending high priority tasks
  const pendingHigh = todayTasks.filter(t => t.status !== 'COMPLETED' && t.priority === 'HIGH')
  const completedCount = todayTasks.filter(t => t.status === 'COMPLETED').length
  const totalCount = todayTasks.length

  // 4. Overdue pending tasks (exclude recurring — they show on every matching day)
  const overdueTasks = await prisma.todoTask.findMany({
    where: {
      userId,
      date: { lt: today },
      status: { not: 'COMPLETED' },
      isRecurring: false,
    },
    include: { category: true },
    orderBy: { date: 'asc' },
    take: 5,
  })

  return {
    today: {
      total: totalCount,
      completed: completedCount,
      pending: totalCount - completedCount,
      completionPct: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    },
    pendingHighPriority: pendingHigh.map(t => ({
      title: t.title,
      category: t.category?.name || 'ไม่มี',
      dueTime: t.dueTime,
    })),
    overdue: overdueTasks.map(t => ({
      title: t.title,
      date: t.date,
      category: t.category?.name || 'ไม่มี',
    })),
  }
}

// ──────────────────────────────────────────────────────────────
// getUserLifeContext
// ──────────────────────────────────────────────────────────────
export async function getUserLifeContext(userId: string) {
  const [financial, health, study, todo] = await Promise.all([
    getUserFinancialContext(userId),
    getUserHealthContext(userId),
    getUserStudyContext(userId),
    getUserTodoContext(userId),
  ])

  return {
    period: financial.period,
    financial,
    health,
    study,
    todo,
  }
}

export type FinancialContext = Awaited<ReturnType<typeof getUserFinancialContext>>
export type LifeContext = Awaited<ReturnType<typeof getUserLifeContext>>

