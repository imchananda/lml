"use client"

import { Target, Calendar, ArrowRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type HealthGoal = {
  id: string
  type: "WEIGHT_LOSS" | "WEIGHT_GAIN" | "MAINTAIN" | "BODY_FAT_REDUCTION" | "MUSCLE_GAIN"
  start: number
  target: number
  current: number
  progressPct: number
  deadline?: string | Date | null
  status?: string | null
}

const goalLabels: Record<HealthGoal["type"], string> = {
  WEIGHT_LOSS: "ลดน้ำหนัก (Weight Loss)",
  WEIGHT_GAIN: "เพิ่มน้ำหนัก (Weight Gain)",
  MAINTAIN: "รักษาน้ำหนัก (Maintain Weight)",
  BODY_FAT_REDUCTION: "ลดไขมัน (Reduce Body Fat)",
  MUSCLE_GAIN: "เพิ่มมวลกล้ามเนื้อ (Gain Muscle)"
}

export function HealthGoalCard({ goal }: { goal: HealthGoal | null }) {
  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground border border-dashed border-white/20 rounded-2xl h-full">
        <Target className="h-8 w-8 mb-2 opacity-40 text-amber-500" />
        <p className="text-sm font-semibold">คุณยังไม่ได้ตั้งเป้าหมายสุขภาพ</p>
        <p className="text-xs mt-1 text-muted-foreground/80">ตั้งเป้าหมายเพื่อเป็นแนวทางในการออกกำลังกายและคุมแคลอรี</p>
      </div>
    )
  }

  const isComplete = goal.status === "COMPLETED" || goal.progressPct >= 100
  const isLoss = goal.type === "WEIGHT_LOSS"
  const unit = goal.type === "BODY_FAT_REDUCTION" ? "%" : "kg"
  const diffLeft = Math.abs(goal.current - goal.target)

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-500" />
          <h4 className="font-bold text-sm text-foreground/95">
            {goalLabels[goal.type] || "เป้าหมายสุขภาพ"}
          </h4>
        </div>
        
        {isComplete && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> สำเร็จแล้ว
          </span>
        )}
      </div>

      {/* Progress detail */}
      <div className="flex justify-between items-baseline bg-black/10 dark:bg-white/5 p-4 rounded-xl border border-white/10 dark:border-white/5">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">เริ่มต้น</span>
          <span className="text-base font-bold block">{goal.start} {unit}</span>
        </div>
        
        <ArrowRight className="h-4 w-4 text-muted-foreground/50 self-center" />
        
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">ปัจจุบัน</span>
          <span className="text-base font-bold block text-amber-500">{goal.current} {unit}</span>
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground/50 self-center" />

        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">เป้าหมาย</span>
          <span className="text-base font-bold block text-emerald-500">{goal.target} {unit}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>ความสำเร็จ</span>
          <span>{goal.progressPct}%</span>
        </div>
        <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 rounded-full transition-all duration-1000"
            style={{ width: `${goal.progressPct}%` }}
          />
        </div>
      </div>

      {/* Extra info/deadline */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>
          {!isComplete && (
            <>เหลืออีก <span className="font-bold text-amber-500">{diffLeft.toFixed(1)} {unit}</span> จะถึงเป้าหมาย</>
          )}
        </span>
        {goal.deadline && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            เป้าเดดไลน์: {new Date(goal.deadline).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  )
}
