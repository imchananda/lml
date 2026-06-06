"use client"

import { Flame } from "lucide-react"

type StreakBadgeProps = {
  streak: number
}

export function StudyStreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 shadow-sm animate-pulse relative overflow-hidden group">
      <Flame className="h-4 w-4 fill-orange-500 text-orange-600 animate-bounce" style={{ animationDuration: "2s" }} />
      <span className="text-xs font-black">
        🔥 อ่านต่อเนื่อง {streak} วัน!
      </span>
      {/* Background reflection shine */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </div>
  )
}
