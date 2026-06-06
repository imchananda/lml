"use client"

import { Clock, Calendar, AlertCircle } from "lucide-react"

type ExamCountdownProps = {
  examName?: string
  examDate?: string | Date
  daysRemaining: number | null
}

export function ExamCountdown({ examName, examDate, daysRemaining }: ExamCountdownProps) {
  if (daysRemaining === null || !examDate) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground border border-dashed border-white/20 rounded-2xl h-full bg-black/10 dark:bg-white/5">
        <AlertCircle className="h-8 w-8 mb-2 opacity-40 text-sky-500 animate-bounce" />
        <p className="text-sm font-semibold">ไม่มีการตั้งวันสอบที่กำลังใช้งาน</p>
        <p className="text-xs mt-1 text-muted-foreground/80">
          กรุณาเพิ่มแผนวันสอบเพื่อเปิดใช้งานการนับถอยหลังช่วยจำ
        </p>
      </div>
    )
  }

  const dateStr = new Date(examDate).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })

  // Determine urgency colors
  let colorClass = "from-sky-500 to-blue-600 shadow-sky-500/20"
  let bgGlow = "bg-sky-500/10"
  
  if (daysRemaining <= 7) {
    colorClass = "from-red-500 to-rose-600 shadow-red-500/20"
    bgGlow = "bg-red-500/10"
  } else if (daysRemaining <= 30) {
    colorClass = "from-amber-500 to-yellow-600 shadow-amber-500/20"
    bgGlow = "bg-amber-500/10"
  }

  return (
    <div className={`p-6 rounded-2xl border border-white/10 dark:border-white/5 ${bgGlow} flex flex-col justify-between h-full relative overflow-hidden transition-all duration-300 hover:shadow-lg`}>
      <div className="flex justify-between items-start z-10">
        <div>
          <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-bold">เดดไลน์วันสอบ</span>
          <h4 className="font-extrabold text-base text-foreground mt-0.5 truncate max-w-[200px]">
            {examName || "สอบเข้า ป.โท"}
          </h4>
        </div>
        <Clock className="h-5 w-5 text-sky-500" />
      </div>

      <div className="my-6 z-10 flex items-baseline gap-2">
        <span className="text-5xl font-black tracking-tight text-gradient-study">
          {daysRemaining}
        </span>
        <span className="text-sm font-bold text-muted-foreground">วันสุดท้าย</span>
      </div>

      <div className="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-muted-foreground z-10">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-sky-500" />
          {dateStr}
        </span>
        <span className="font-bold text-sky-400">
          {daysRemaining <= 7 ? "⚠️ ด่วนมาก!" : daysRemaining <= 30 ? "⚡️ เริ่มกระชั้นชิด" : "💪 มีเวลาเตรียมตัว"}
        </span>
      </div>

      {/* Background soft lighting */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  )
}
