import { getCurrentUserId } from "@/lib/auth-helper"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import { 
  Wallet, Heart, GraduationCap, ListTodo, ChevronRight, 
  TrendingUp, Calendar, AlertCircle, ArrowUpRight, ArrowDownRight, CheckCircle2 
} from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function HomeHubPage() {
  const userId = await getCurrentUserId()
  if (!userId) {
    redirect("/login")
  }

  // Prepare date boundaries
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const todayStart = new Date()
  todayStart.setHours(0,0,0,0)
  const todayEnd = new Date()
  todayEnd.setHours(23,59,59,999)

  // Fetch all metrics in parallel (15 queries in a single Promise.all batch)
  const [
    totalSavings,
    totalDebt,
    investments,
    incomeAgg,
    expenseAgg,
    latestMetric,
    healthProfile,
    todayCalories,
    activeExam,
    totalBooks,
    completedBooks,
    todayStudySessions,
    todayTodosCandidate
  ] = await Promise.all([
    // 1. Finance Metrics
    prisma.savingPot.aggregate({ _sum: { savedAmount: true }, where: { userId, isActive: true } }),
    prisma.debt.aggregate({ _sum: { currentBalance: true }, where: { userId, isActive: true } }),
    prisma.investment.findMany({ where: { userId } }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "INCOME", date: { gte: monthStart } }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "EXPENSE", date: { gte: monthStart } }
    }),

    // 2. Health Metrics
    prisma.bodyMetric.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.healthProfile.findFirst({ where: { userId } }),
    prisma.calorieLog.aggregate({
      _sum: { calories: true },
      where: { userId, date: { gte: todayStart, lte: todayEnd } }
    }),

    // 3. Study Metrics
    prisma.studyExam.findFirst({ where: { userId, isActive: true } }),
    prisma.studyBook.count({ where: { userId } }),
    prisma.studyBook.count({ where: { userId, status: "COMPLETED" } }),
    prisma.studySession.findMany({
      where: { userId, date: { gte: todayStart, lte: todayEnd } },
      include: { subject: true }
    }),

    // 4. Todo Metrics candidate fetch
    prisma.todoTask.findMany({
      where: {
        userId,
        OR: [
          {
            date: { gte: todayStart, lte: todayEnd }
          },
          {
            isRecurring: true,
            date: { lte: todayEnd }
          }
        ]
      },
      include: { category: true }
    })
  ])

  // Filter candidates in memory to calculate today's tasks
  const todayTodos = todayTodosCandidate.filter(task => {
    if (!task.isRecurring) return true;

    const taskDate = new Date(task.date);
    const taskMidnight = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    const todayMidnight = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate());

    if (taskMidnight > todayMidnight) return false;

    if (task.recurFrequency === "DAILY") {
      return true;
    } else if (task.recurFrequency === "WEEKLY") {
      return todayMidnight.getDay() === taskMidnight.getDay();
    } else if (task.recurFrequency === "MONTHLY") {
      return todayMidnight.getDate() === taskMidnight.getDate();
    }
    return false;
  }).map(task => {
    if (task.isRecurring && task.status === "COMPLETED") {
      const completedDate = task.completedAt ? new Date(task.completedAt) : null;
      if (completedDate) {
        const isSameDay = 
          completedDate.getFullYear() === todayStart.getFullYear() &&
          completedDate.getMonth() === todayStart.getMonth() &&
          completedDate.getDate() === todayStart.getDate();
        
        if (!isSameDay) {
          return {
            ...task,
            status: "PENDING",
            completedAt: null
          };
        }
      } else {
        return {
          ...task,
          status: "PENDING"
        };
      }
    }
    return task;
  });

  const totalTodoToday = todayTodos.length;
  const completedTodoToday = todayTodos.filter(t => t.status === "COMPLETED").length;
  const pendingTodos = todayTodos
    .filter(t => t.status !== "COMPLETED")
    .sort((a, b) => {
      const priorityWeights: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aWeight = priorityWeights[a.priority] || 2;
      const bWeight = priorityWeights[b.priority] || 2;
      if (bWeight !== aWeight) return bWeight - aWeight;
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, 5);

  const totalSavingsVal = totalSavings._sum.savedAmount || 0
  const totalDebtVal = totalDebt._sum.currentBalance || 0
  const totalInvestmentValue = investments.reduce((sum, inv) => sum + (inv.currentPrice ?? 0) * inv.quantity, 0)
  const netWorth = totalSavingsVal + totalInvestmentValue - totalDebtVal

  const monthlyIncome = incomeAgg._sum.amount || 0
  const monthlyExpense = expenseAgg._sum.amount || 0
  const monthlyCashflow = monthlyIncome - monthlyExpense

  const currentWeight = latestMetric?.weightKg || null
  const height = healthProfile?.heightCm || null
  let bmi: number | null = null
  let bmiCategory = "—"
  
  if (currentWeight && height) {
    const heightM = height / 100
    bmi = currentWeight / (heightM * heightM)
    if (bmi < 18.5) bmiCategory = "ผอมเกินไป"
    else if (bmi < 23.0) bmiCategory = "น้ำหนักปกติ"
    else if (bmi < 25.0) bmiCategory = "น้ำหนักเกิน"
    else if (bmi < 30.0) bmiCategory = "อ้วนระดับ 1"
    else bmiCategory = "อ้วนระดับ 2"
  }

  const calorieIntake = todayCalories._sum.calories || 0

  let daysToExam: number | null = null
  if (activeExam) {
    const examDate = new Date(activeExam.examDate)
    const today = new Date()
    const diffTime = examDate.getTime() - today.getTime()
    daysToExam = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  // Get greeting message based on time of day
  const hours = new Date().getHours()
  let greeting = "สวัสดีตอนเช้า 🌅"
  if (hours >= 12 && hours < 17) greeting = "สวัสดีตอนบ่าย ☀️"
  else if (hours >= 17 && hours < 22) greeting = "สวัสดีตอนเย็น 🌇"
  else if (hours >= 22 || hours < 5) greeting = "สวัสดีตอนค่ำ 🌌"

  const thaiDateString = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  })

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground/90">
          {greeting}
        </h2>
        <p className="text-muted-foreground text-sm font-medium">
          {thaiDateString} · ยินดีต้อนรับสู่แดชบอร์ด LiveMyLife ของคุณ
        </p>
      </div>

      {/* Grid of 4 Module Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* 1. Finance Card */}
        <Link href="/finance" className="group block">
          <div className="glass-card hover-lift p-6 relative overflow-hidden h-full flex flex-col justify-between border-emerald-500/10 dark:border-emerald-500/5 group-hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
              <Wallet className="h-24 w-24 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground/95">💰 Finance</h3>
                  <p className="text-xs text-muted-foreground">จัดการความมั่งคั่งการเงิน</p>
                </div>
              </div>
              
              <div className="space-y-3 mt-6">
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold">ความมั่งคั่งสุทธิ (Net Worth)</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ฿{netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">กระแสเงินสดเดือนนี้</span>
                  <span className={cn(
                    "font-bold",
                    monthlyCashflow >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {monthlyCashflow >= 0 ? "+" : ""}฿{monthlyCashflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground group-hover:text-emerald-500 transition-colors">
              <span>เข้าสู่ระบบการเงิน</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        {/* 2. Health Card */}
        <Link href="/health" className="group block">
          <div className="glass-card hover-lift p-6 relative overflow-hidden h-full flex flex-col justify-between border-amber-500/10 dark:border-amber-500/5 group-hover:border-amber-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
              <Heart className="h-24 w-24 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground/95">💪 Health</h3>
                  <p className="text-xs text-muted-foreground">บันทึกสุขภาพฟิตเนส</p>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold">น้ำหนักตัวล่าสุด / BMI</p>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {currentWeight ? `${currentWeight} kg` : "—"} <span className="text-xs font-normal text-muted-foreground">{bmi ? `(BMI ${bmi.toFixed(1)})` : ""}</span>
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">แคลอรีที่กินวันนี้</span>
                  <span className="font-bold text-amber-500">
                    {calorieIntake.toLocaleString()} kcal
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground group-hover:text-amber-500 transition-colors">
              <span>เข้าสู่ระบบสุขภาพ</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        {/* 3. Study Card */}
        <Link href="/study" className="group block">
          <div className="glass-card hover-lift p-6 relative overflow-hidden h-full flex flex-col justify-between border-sky-500/10 dark:border-sky-500/5 group-hover:border-sky-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
              <GraduationCap className="h-24 w-24 text-sky-500" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground/95">📚 Study</h3>
                  <p className="text-xs text-muted-foreground">แผนสอบป.โท จุฬาฯ</p>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold">วันสอบเข้าที่เหลือ</p>
                  <p className="text-xl font-black text-sky-600 dark:text-sky-400">
                    {daysToExam !== null ? `${daysToExam} วัน` : "ยังไม่ตั้งเป้าหมาย"}
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">อ่านหนังสือสำเร็จ</span>
                  <span className="font-bold text-sky-500">
                    {completedBooks} / {totalBooks} เล่ม
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground group-hover:text-sky-500 transition-colors">
              <span>เข้าสู่ระบบการเรียน</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        {/* 4. Todo Card */}
        <Link href="/todo" className="group block">
          <div className="glass-card hover-lift p-6 relative overflow-hidden h-full flex flex-col justify-between border-violet-500/10 dark:border-violet-500/5 group-hover:border-violet-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
              <ListTodo className="h-24 w-24 text-violet-500" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-violet-500/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400">
                  <ListTodo className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground/95">✅ Todo</h3>
                  <p className="text-xs text-muted-foreground">รายการงานวันนี้</p>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold">ความก้าวหน้าวันนี้</p>
                  <p className="text-xl font-black text-violet-600 dark:text-violet-400">
                    {completedTodoToday} / {totalTodoToday} งานเสร็จ
                  </p>
                </div>
                <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-violet-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${totalTodoToday > 0 ? (completedTodoToday / totalTodoToday) * 100 : 0}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground group-hover:text-violet-500 transition-colors">
              <span>เข้าสู่รายการงาน</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      </div>

      {/* Daily Overview Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Tasks overview */}
        <div className="glass-card p-6 border-white/10 dark:border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-violet-500" />
              งานที่ต้องทำวันนี้ (Today's Pending Tasks)
            </h3>
            {pendingTodos.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                ไม่มีงานค้างสำหรับวันนี้! 🎉
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTodos.map(task => (
                  <div key={task.id} className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.priority === "HIGH" ? "bg-red-500" : task.priority === "MEDIUM" ? "bg-yellow-500" : "bg-green-500"
                      )} />
                      <span className="text-sm font-medium">{task.title}</span>
                    </div>
                    {task.category && (
                      <span 
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full" 
                        style={{ backgroundColor: task.category.color + "20", color: task.category.color }}
                      >
                        {task.category.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-white/5">
            <Link href="/todo" className="text-xs text-violet-500 font-semibold hover:underline flex items-center gap-1">
              จัดการงานทั้งหมด <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Study Timetable / Sessions overview */}
        <div className="glass-card p-6 border-white/10 dark:border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <GraduationCap className="h-5 w-5 text-sky-500" />
              การอ่านหนังสือวันนี้ (Today's Study Log)
            </h3>
            {todayStudySessions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                วันนี้ยังไม่มีการบันทึกการอ่านหนังสือ 📖
              </div>
            ) : (
              <div className="space-y-3">
                {todayStudySessions.map(session => (
                  <div key={session.id} className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
                    <div>
                      <p className="text-sm font-semibold">{session.subject?.name || "อ่านหนังสือทั่วไป"}</p>
                      <p className="text-xs text-muted-foreground">{session.note || "ไม่มีบันทึกช่วยจำ"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-sky-500">{session.durationMinutes} นาที</p>
                      {session.pagesRead && <p className="text-[10px] text-muted-foreground">อ่านได้ {session.pagesRead} หน้า</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-white/5">
            <Link href="/study" className="text-xs text-sky-500 font-semibold hover:underline flex items-center gap-1">
              จัดการการเรียนทั้งหมด <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
