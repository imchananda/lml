"use client"

import { cn } from "@/lib/utils"

type CalorieBarProps = {
  consumed: number
  target: number
  burned: number
}

export function CalorieBar({ consumed, target, burned }: CalorieBarProps) {
  const net = consumed - burned
  const progressPct = target > 0 ? Math.min(100, (net / target) * 100) : 0
  const isOver = net > target

  let progressColor = "bg-amber-500"
  if (isOver) progressColor = "bg-rose-500"
  else if (progressPct > 85) progressColor = "bg-yellow-500"

  const remaining = Math.max(0, target - net)

  return (
    <div className="space-y-3">
      {/* Header Info */}
      <div className="flex justify-between items-end">
        <div>
          <span className="text-xs text-muted-foreground font-medium block">แคลอรีสุทธิ (Net Calories)</span>
          <span className={cn(
            "text-2xl font-black",
            isOver ? "text-rose-500" : "text-amber-500"
          )}>
            {net.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground font-semibold"> / {target.toLocaleString()} kcal</span>
        </div>
        
        <div className="text-right">
          <span className="text-xs text-muted-foreground font-medium block">เหลือทานได้อีก (Remaining)</span>
          <span className={cn(
            "text-lg font-bold",
            isOver ? "text-rose-500" : "text-emerald-500"
          )}>
            {isOver ? `เกินเป้า +${Math.abs(target - net).toLocaleString()}` : `${remaining.toLocaleString()} kcal`}
          </span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative">
        <div className="h-3.5 w-full bg-secondary/50 rounded-full overflow-hidden shadow-inner">
          <div 
            className={cn("h-full rounded-full transition-all duration-1000 relative overflow-hidden", progressColor)}
            style={{ width: `${progressPct}%` }}
          >
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mini Details Row */}
      <div className="grid grid-cols-3 text-center text-xs pt-1 divide-x divide-border/30">
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">กินเข้าไป (Food)</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">+{consumed} kcal</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">ออกกำลังกาย (Active)</span>
          <span className="font-bold text-emerald-500">-{burned} kcal</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">เป้าหมาย (Target)</span>
          <span className="font-bold text-foreground/90">{target} kcal</span>
        </div>
      </div>
    </div>
  )
}
