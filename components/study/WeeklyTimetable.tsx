"use client"

import { Clock, Trash2, Edit2, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

type ScheduleItem = {
  id: string
  title: string
  startTime: string
  endTime: string
  dayOfWeek?: number | null
  date?: string | null
  color: string
  type: "STUDY" | "EXAM" | "REVIEW" | "BREAK"
  isRecurring: boolean
}

const dayNames = [
  "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"
]

const typeLabels = {
  STUDY: "อ่านหนังสือ",
  EXAM: "วันสอบ",
  REVIEW: "ทบทวน",
  BREAK: "พักผ่อน"
}

export function WeeklyTimetable({
  schedules,
  onEdit,
  onDelete
}: {
  schedules: ScheduleItem[]
  onEdit: (item: ScheduleItem) => void
  onDelete: (id: string) => void
}) {
  // Group schedules by day of week (0 to 6)
  // For non-recurring ones, we can also map their date to day of week for this week view
  const getDaySchedule = (dayIndex: number) => {
    return schedules.filter(s => {
      if (s.isRecurring) {
        return s.dayOfWeek === dayIndex
      } else if (s.date) {
        const dateObj = new Date(s.date)
        return dateObj.getDay() === dayIndex
      }
      return false
    }).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  return (
    <div className="grid gap-6 md:grid-cols-7">
      {dayNames.map((dayName, index) => {
        const dayItems = getDaySchedule(index)
        const isToday = new Date().getDay() === index

        return (
          <div 
            key={index} 
            className={`rounded-2xl border transition-all ${
              isToday 
                ? "bg-sky-500/5 border-sky-500/30 shadow-sky-500/5 ring-1 ring-sky-500/20" 
                : "bg-black/10 dark:bg-white/5 border-white/10 dark:border-white/5"
            } p-4 flex flex-col h-[380px] overflow-hidden`}
          >
            {/* Day Title */}
            <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3 shrink-0">
              <span className={`text-sm font-extrabold ${isToday ? "text-sky-400" : "text-foreground"}`}>
                {dayName.replace("วัน", "")}
              </span>
              {isToday && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-sky-500 text-white px-1.5 py-0.5 rounded-md">
                  Today
                </span>
              )}
            </div>

            {/* Timetable Items */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {dayItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground/40 text-[10px] italic">
                  ไม่มีตารางเวลา
                </div>
              ) : (
                dayItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-white/5 transition-all hover:bg-white/5 relative group flex flex-col justify-between"
                    style={{ borderLeft: `4px solid ${item.color}` }}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-xs text-foreground/90 leading-tight line-clamp-2 pr-4">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground font-semibold">
                      <Clock className="h-3 w-3 text-sky-500" />
                      <span>{item.startTime} - {item.endTime}</span>
                    </div>

                    {/* Quick controls on hover */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity bg-black/60 backdrop-blur-sm rounded-lg p-0.5">
                      <button 
                        onClick={() => onEdit(item)}
                        className="p-1 text-muted-foreground hover:text-sky-500 hover:bg-white/10 rounded"
                      >
                        <Edit2 className="h-2.5 w-2.5" />
                      </button>
                      <button 
                        onClick={() => onDelete(item.id)}
                        className="p-1 text-muted-foreground hover:text-red-500 hover:bg-white/10 rounded"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
