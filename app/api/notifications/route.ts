import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth-helper"
import { prisma } from "@/lib/prisma"
import { getEffectiveThreshold, getEffectiveDayInterval } from "@/lib/notification-defaults"
import { calculateBMI } from "@/lib/calculators/health"

type Notification = {
  id: string
  title: string
  desc: string
  type: string
  severity: "info" | "warning" | "error"
}

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const monthStart = new Date(currentYear, currentMonth - 1, 1)
    const monthEnd = new Date(currentYear, currentMonth, 1)

    // ═══════════════════════════════════════════════════════════
    // SINGLE BATCH: All queries in parallel (~8 queries total)
    // ═══════════════════════════════════════════════════════════
    const [
      // User notification settings
      userSettings,
      // Finance: DSR + Savings
      incomeAgg,
      debtMinPayments,
      expenseAgg,
      // Health: BMI + Calories
      latestMetric,
      healthProfile,
      todayCaloriesAgg,
      todayBurnedAgg,
      // Study: Exam + Reading
      activeExam,
      bookStats,
      // Todo: candidate tasks + overdue
      todoCandidates,
      overdueCount,
      // Reminders: existence checks
      recentTxCheck,
      budgetCount,
      foodTodayCheck,
      recentWeightCheck,
      recentWorkoutCheck,
      recentStudyCheck,
    ] = await Promise.all([
      // Settings
      (prisma as any).notificationSetting.findMany({ where: { userId }, select: { key: true, enabled: true, threshold: true, dayInterval: true } }),
      // Finance
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: "INCOME", date: { gte: monthStart, lt: monthEnd } } }),
      prisma.debt.findMany({ where: { userId, isActive: true } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: "EXPENSE", date: { gte: monthStart, lt: monthEnd } } }),
      // Health
      prisma.bodyMetric.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { weightKg: true, date: true } }),
      prisma.healthProfile.findUnique({ where: { userId }, select: { heightCm: true, gender: true, activityLevel: true } }),
      prisma.calorieLog.aggregate({ _sum: { calories: true }, where: { userId, date: { gte: today, lt: tomorrow } } }),
      prisma.workoutLog.aggregate({ _sum: { caloriesBurned: true }, where: { userId, date: { gte: today, lt: tomorrow } } }),
      // Study
      prisma.studyExam.findFirst({ where: { userId, isActive: true }, select: { name: true, examDate: true } }),
      prisma.studyBook.aggregate({ _count: { _all: true }, _sum: { totalPages: true, currentPage: true }, where: { userId } }),
      // Todo: candidate tasks for today (including recurring)
      prisma.todoTask.findMany({
        where: {
          userId,
          OR: [
            { date: { gte: today, lt: tomorrow } },
            { isRecurring: true, date: { lt: tomorrow } },
          ],
        },
        select: { id: true, status: true, priority: true, isRecurring: true, recurFrequency: true, date: true, completedAt: true },
      }),
      // Todo: overdue (exclude recurring)
      prisma.todoTask.count({ where: { userId, date: { lt: today }, status: { not: "COMPLETED" }, isRecurring: false } }),
      // Reminder checks (lightweight findFirst with select id only)
      prisma.transaction.findFirst({ where: { userId, createdAt: { gte: new Date(today.getTime() - 3 * 86400000) } }, select: { id: true } }),
      prisma.budget.count({ where: { userId, month: currentMonth, year: currentYear } }),
      prisma.calorieLog.findFirst({ where: { userId, date: { gte: today, lt: tomorrow } }, select: { id: true } }),
      prisma.bodyMetric.findFirst({ where: { userId, date: { gte: new Date(today.getTime() - 7 * 86400000) } }, select: { id: true } }),
      prisma.workoutLog.findFirst({ where: { userId, date: { gte: new Date(today.getTime() - 3 * 86400000) } }, select: { id: true } }),
      prisma.studySession.findFirst({ where: { userId, date: { gte: new Date(today.getTime() - 2 * 86400000) } }, select: { id: true } }),
    ])

    // ═══════════════════════════════════════════════════════════
    // Build settings lookup
    // ═══════════════════════════════════════════════════════════
    const settingsMap = new Map<string, { enabled: boolean; threshold: number | null; dayInterval: number | null }>()
    userSettings.forEach((s: any) => {
      settingsMap.set(s.key, { enabled: s.enabled, threshold: s.threshold, dayInterval: s.dayInterval })
    })

    const isEnabled = (key: string): boolean => settingsMap.get(key)?.enabled ?? true
    const threshold = (key: string): number | undefined => {
      const s = settingsMap.get(key)
      return getEffectiveThreshold(key, s?.threshold)
    }
    const interval = (key: string): number | undefined => {
      const s = settingsMap.get(key)
      return getEffectiveDayInterval(key, s?.dayInterval)
    }

    // ═══════════════════════════════════════════════════════════
    // Compute derived values
    // ═══════════════════════════════════════════════════════════

    // Filter recurring todo candidates in memory
    const todayTodos = (todoCandidates as any[]).filter((task: any) => {
      if (!task.isRecurring) return true
      const taskDate = new Date(task.date)
      const taskMidnight = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate())
      if (taskMidnight > today) return false
      if (task.recurFrequency === 'DAILY') return true
      if (task.recurFrequency === 'WEEKLY') return today.getDay() === taskMidnight.getDay()
      if (task.recurFrequency === 'MONTHLY') return today.getDate() === taskMidnight.getDate()
      return false
    }).map((task: any) => {
      if (task.isRecurring && task.status === 'COMPLETED') {
        const cd = task.completedAt ? new Date(task.completedAt) : null
        const isSameDay = cd &&
          cd.getFullYear() === today.getFullYear() &&
          cd.getMonth() === today.getMonth() &&
          cd.getDate() === today.getDate()
        if (!isSameDay) {
          return { ...task, status: 'PENDING', completedAt: null }
        }
      }
      return task
    })

    const highPriorityCount = todayTodos.filter((t: any) => t.status !== 'COMPLETED' && t.priority === 'HIGH').length
    const todayPendingCount = todayTodos.filter((t: any) => t.status !== 'COMPLETED').length

    const monthlyIncome = incomeAgg._sum.amount || 0
    const monthlyExpense = expenseAgg._sum.amount || 0
    // Group active debts by name (case-insensitive) and select the latest record for each
    const latestDebtsByName: Record<string, typeof debtMinPayments[0]> = {}
    debtMinPayments.forEach(d => {
      const nameKey = d.name.trim().toLowerCase()
      const existing = latestDebtsByName[nameKey]
      if (!existing || new Date(d.asOfDate) > new Date(existing.asOfDate)) {
        latestDebtsByName[nameKey] = d
      }
    })
    const totalMinPayment = Object.values(latestDebtsByName).reduce((s, d) => s + d.minimumPayment, 0)
    const dsr = monthlyIncome > 0 ? Math.round((totalMinPayment / monthlyIncome) * 100) : 0
    const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100) : 0

    const currentWeight = latestMetric?.weightKg || null
    const heightCm = healthProfile?.heightCm || null
    let bmiScore: number | null = null
    let bmiCategory = ""
    if (currentWeight && heightCm) {
      const bmiResult = calculateBMI(currentWeight, heightCm)
      bmiScore = Math.round(bmiResult.score * 10) / 10
      bmiCategory = bmiResult.category
    }

    const caloriesConsumed = todayCaloriesAgg._sum.calories || 0
    const caloriesBurned = todayBurnedAgg._sum.caloriesBurned || 0
    const netCalories = caloriesConsumed - caloriesBurned

    let daysToExam: number | null = null
    if (activeExam) {
      const diff = new Date(activeExam.examDate).getTime() - now.getTime()
      daysToExam = Math.max(0, Math.ceil(diff / 86400000))
    }

    const totalPages = (bookStats as any)?._sum?.totalPages || 0
    const currentPages = (bookStats as any)?._sum?.currentPage || 0
    const totalBooks = (bookStats as any)?._count?._all || 0
    const readingProgressPct = totalPages > 0 ? Math.round((currentPages / totalPages) * 100) : 0

    // ═══════════════════════════════════════════════════════════
    // Build notifications
    // ═══════════════════════════════════════════════════════════
    const notifications: Notification[] = []

    // 💰 Finance: DSR
    if (isEnabled("fin_dsr")) {
      const t = threshold("fin_dsr") ?? 35
      if (dsr > t) {
        notifications.push({
          id: "fin_dsr",
          title: "หนี้สินสูงเกินเกณฑ์ (DSR Alert)",
          desc: `สัดส่วนการชำระหนี้ต่อรายรับของคุณสูงถึง ${dsr}% (เกินเกณฑ์ที่ตั้งไว้ ${t}%)`,
          type: "finance", severity: "error",
        })
      }
    }

    // 💰 Finance: Savings Rate
    if (isEnabled("fin_savings")) {
      const t = threshold("fin_savings") ?? 10
      if (monthlyIncome > 0 && savingsRate < t) {
        notifications.push({
          id: "fin_savings",
          title: "อัตราการออมต่ำกว่าเป้าหมาย",
          desc: `อัตราออมในเดือนนี้เหลือ ${savingsRate}% (ต่ำกว่าเกณฑ์ ${t}%)`,
          type: "finance", severity: "warning",
        })
      }
    }

    // 💪 Health: BMI
    if (isEnabled("health_bmi")) {
      const t = threshold("health_bmi") ?? 25
      if (bmiScore && bmiScore > t) {
        notifications.push({
          id: "health_bmi",
          title: "ค่า BMI เกินเกณฑ์",
          desc: `BMI ปัจจุบันคือ ${bmiScore} (${bmiCategory}) เกินเกณฑ์ที่ตั้งไว้ ${t}`,
          type: "health", severity: "warning",
        })
      }
    }

    // 💪 Health: Calories > TDEE (simplified — just check against consumed)
    if (isEnabled("health_calories")) {
      if (currentWeight && heightCm && caloriesConsumed > 0) {
        // Simple TDEE estimate using BMR * 1.55 (moderate activity)
        const heightM = heightCm / 100
        const bmr = 10 * currentWeight + 6.25 * heightCm - 5 * 30 + 5 // Mifflin-St Jeor (male default)
        const tdee = Math.round(bmr * 1.55)
        if (netCalories > tdee) {
          notifications.push({
            id: "health_calories",
            title: "วันนี้รับแคลอรีเกินค่าเผาผลาญ (TDEE)",
            desc: `กินไปแล้ว ${caloriesConsumed} kcal เกินเป้าหมาย TDEE ${tdee} kcal`,
            type: "health", severity: "warning",
          })
        }
      }
    }

    // 📚 Study: Exam Countdown
    if (isEnabled("study_exam") && activeExam && daysToExam !== null) {
      const t = threshold("study_exam") ?? 30
      if (daysToExam <= t) {
        notifications.push({
          id: "study_exam",
          title: `เหลือเวลาเตรียมสอบ ป.โท ${daysToExam} วัน`,
          desc: `ใกล้สอบ ${activeExam.name} จุฬาฯ รีบเข้าทบทวนบทเรียนตามแผน!`,
          type: "study", severity: daysToExam <= 7 ? "error" : "warning",
        })
      }
    }

    // 📚 Study: Reading Progress
    if (isEnabled("study_progress")) {
      const t = threshold("study_progress") ?? 20
      if (totalBooks > 0 && readingProgressPct < t) {
        notifications.push({
          id: "study_progress",
          title: "ความก้าวหน้าการอ่านต่ำกว่าแผน",
          desc: `คุณอ่านหนังสือจบไปเพียง ${readingProgressPct}% ของเป้าหมาย (ต่ำกว่าเกณฑ์ ${t}%)`,
          type: "study", severity: "info",
        })
      }
    }

    // ✅ Todo: Overdue
    if (isEnabled("todo_overdue") && overdueCount > 0) {
      notifications.push({
        id: "todo_overdue",
        title: "มีงานค้างเกินกำหนดชำระ/ส่ง",
        desc: `คุณมีภารกิจค้างเกินกำหนด ${overdueCount} งาน โปรดเคลียร์โดยด่วน`,
        type: "todo", severity: "error",
      })
    }

    // ✅ Todo: High Priority
    if (isEnabled("todo_high") && highPriorityCount > 0) {
      notifications.push({
        id: "todo_high",
        title: "งานด่วนสำคัญวันนี้ยังไม่เสร็จ",
        desc: `มีภารกิจระดับด่วนที่สุด ⚡ ที่รอดำเนินการ ${highPriorityCount} งาน`,
        type: "todo", severity: "warning",
      })
    }

    // ═══════════════════════════════════════════════════════════
    // REMINDERS (use pre-fetched checks — no additional queries!)
    // ═══════════════════════════════════════════════════════════

    if (isEnabled("remind_finance") && !recentTxCheck) {
      const d = interval("remind_finance") ?? 3
      notifications.push({
        id: "remind_finance",
        title: "📝 อย่าลืมบันทึกรายรับรายจ่าย",
        desc: `ไม่มีการบันทึกธุรกรรมมาเกิน ${d} วันแล้ว อัปเดตข้อมูลเพื่อติดตามการเงินให้แม่นยำ`,
        type: "finance", severity: "info",
      })
    }

    if (isEnabled("remind_budget") && budgetCount === 0) {
      notifications.push({
        id: "remind_budget",
        title: "📊 ยังไม่ได้ตั้งงบเดือนนี้",
        desc: `เดือน ${currentMonth}/${currentYear} ยังไม่มี Budget ลองตั้งเป้าหมายใช้จ่ายเลย!`,
        type: "finance", severity: "info",
      })
    }

    if (isEnabled("remind_food") && !foodTodayCheck) {
      notifications.push({
        id: "remind_food",
        title: "🍽️ อย่าลืมบันทึกอาหารวันนี้",
        desc: "วันนี้ยังไม่ได้บันทึกอาหารที่กินเลย บันทึกเพื่อติดตามแคลอรีให้ตรงเป้า!",
        type: "health", severity: "info",
      })
    }

    if (isEnabled("remind_weight") && !recentWeightCheck) {
      const d = interval("remind_weight") ?? 7
      notifications.push({
        id: "remind_weight",
        title: "⚖️ ถึงเวลาชั่งน้ำหนักแล้ว",
        desc: `ไม่ได้ชั่งน้ำหนักมาเกิน ${d} วันแล้ว อัปเดตข้อมูลเพื่อติดตามความก้าวหน้า!`,
        type: "health", severity: "info",
      })
    }

    if (isEnabled("remind_workout") && !recentWorkoutCheck) {
      const d = interval("remind_workout") ?? 3
      notifications.push({
        id: "remind_workout",
        title: "🏋️ ถึงเวลาออกกำลังกาย!",
        desc: `ไม่ได้ออกกำลังกายมาเกิน ${d} วันแล้ว ลุกขึ้นมาขยับร่างกายกันเถอะ!`,
        type: "health", severity: "info",
      })
    }

    if (isEnabled("remind_study") && !recentStudyCheck) {
      const d = interval("remind_study") ?? 2
      notifications.push({
        id: "remind_study",
        title: "📖 อย่าลืมอ่านหนังสือ",
        desc: `ไม่ได้อ่านหนังสือมาเกิน ${d} วันแล้ว อ่านสม่ำเสมอจะช่วยให้สอบผ่านง่ายขึ้น!`,
        type: "study", severity: "info",
      })
    }

    if (isEnabled("remind_todo") && todayPendingCount > 0) {
      notifications.push({
        id: "remind_todo",
        title: "📋 ยังมี Todo วันนี้ที่รอทำ",
        desc: `มีภารกิจวันนี้ที่ยังไม่เสร็จ ${todayPendingCount} งาน จัดการให้เรียบร้อยกันเถอะ!`,
        type: "todo", severity: "info",
      })
    }

    // Default
    if (notifications.length === 0) {
      notifications.push({
        id: "life-welcome",
        title: "ระบบ LiveMyLife ทำงานปกติ",
        desc: "สถานะโดยรวมของคุณสมดุลและอยู่ในเกณฑ์ดีเยี่ยม! รักษาวินัยต่อไปครับ 🌟",
        type: "hub", severity: "info",
      })
    }

    return NextResponse.json(notifications)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
