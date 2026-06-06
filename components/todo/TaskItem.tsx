"use client"

import { CheckCircle2, Circle, Clock, Edit2, Trash2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

type TaskProps = {
  task: {
    id: string
    title: string
    description?: string | null
    dueTime?: string | null
    priority: "LOW" | "MEDIUM" | "HIGH"
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
    category?: { name: string; color: string } | null
  }
  onToggleStatus: () => void
  onEdit: () => void
  onDelete: () => void
}

const priorityConfig = {
  LOW: { label: "ต่ำ", text: "text-muted-foreground", bg: "bg-muted" },
  MEDIUM: { label: "ปานกลาง", text: "text-violet-500", bg: "bg-violet-500/10" },
  HIGH: { label: "สูง", text: "text-rose-500", bg: "bg-rose-500/10" }
}

export function TaskItem({ task, onToggleStatus, onEdit, onDelete }: TaskProps) {
  const isCompleted = task.status === "COMPLETED"
  const pConfig = priorityConfig[task.priority]

  return (
    <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
      isCompleted 
        ? "bg-black/5 dark:bg-white/5 border-white/5 opacity-60" 
        : "glass-card border-white/10 hover:border-violet-500/20"
    }`}>
      {/* Left section: Checkbox & Text */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <button 
          onClick={onToggleStatus}
          className="shrink-0 transition-transform duration-300 active:scale-90 text-violet-500 dark:text-violet-400 hover:opacity-80"
        >
          {isCompleted ? (
            <CheckCircle2 className="h-6 w-6 fill-violet-500 text-white dark:fill-violet-400 dark:text-black" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground/60" />
          )}
        </button>

        <div className="min-w-0">
          <span className={`font-semibold text-sm block leading-snug ${
            isCompleted ? "line-through text-muted-foreground" : "text-foreground"
          }`}>
            {task.title}
          </span>
          
          {task.description && !isCompleted && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {task.description}
            </p>
          )}

          {/* Meta section */}
          <div className="flex flex-wrap gap-2 mt-1.5 items-center">
            {task.dueTime && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                <Clock className="h-3 w-3 text-violet-500" />
                {task.dueTime} น.
              </span>
            )}
            
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pConfig.bg} ${pConfig.text}`}>
              {pConfig.label}
            </span>

            {task.category && (
              <span 
                className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white/90"
                style={{ backgroundColor: task.category.color + "bf" }}
              >
                {task.category.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-violet-500" onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
