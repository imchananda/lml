"use client"

import { useState } from "react"
import { BookOpen, Edit2, Trash2, CheckCircle2, Bookmark, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type BookProps = {
  book: {
    id: string
    title: string
    author?: string | null
    totalPages: number
    currentPage: number
    priority: "LOW" | "MEDIUM" | "HIGH"
    status: "NOT_STARTED" | "READING" | "COMPLETED" | "ON_HOLD"
    coverColor: string
    notes?: string | null
    subject?: { name: string; color: string } | null
  }
  onEdit: () => void
  onDelete: () => void
  onProgressUpdated: () => void
}

export function BookCard({ book, onEdit, onDelete, onProgressUpdated }: BookProps) {
  const [openProgress, setOpenProgress] = useState(false)
  const [pagesRead, setPagesRead] = useState("")
  const [updating, setUpdating] = useState(false)

  const progressPct = Math.round((book.currentPage / book.totalPages) * 100)
  
  const handleQuickProgressUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pagesRead || isNaN(Number(pagesRead))) {
      toast.error("กรุณาระบุจำนวนหน้าที่อ่านเพิ่ม")
      return
    }

    setUpdating(true)
    try {
      const addedPages = Number(pagesRead)
      const res = await fetch("/api/study/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(),
          durationMinutes: 30, // default placeholder
          pagesRead: addedPages,
          bookId: book.id,
          note: `อัปเดตผ่านคลังหนังสือ`,
          subjectId: book.subject?.name ? undefined : undefined // optional subject linking can be checked or not
        })
      })

      if (!res.ok) throw new Error()
      toast.success(`อัปเดตความก้าวหน้าสำเร็จ! (+${addedPages} หน้า)`)
      setOpenProgress(false)
      setPagesRead("")
      onProgressUpdated()
    } catch {
      toast.error("อัปเดตล้มเหลว")
    } finally {
      setUpdating(false)
    }
  }

  const priorityLabels = {
    LOW: { label: "ต่ำ", style: "bg-muted text-muted-foreground" },
    MEDIUM: { label: "ปานกลาง", style: "bg-sky-500/10 text-sky-500" },
    HIGH: { label: "สูง", style: "bg-red-500/10 text-red-500" }
  }

  const statusLabels = {
    NOT_STARTED: "ยังไม่ได้เริ่ม",
    READING: "กำลังอ่าน",
    COMPLETED: "อ่านจบแล้ว",
    ON_HOLD: "ดองไว้ก่อน"
  }

  return (
    <div className="glass-card shadow-lg border-white/10 relative overflow-hidden flex flex-col justify-between h-56 transition-all duration-300 hover:shadow-xl hover:border-sky-500/20 group">
      {/* Top Color Line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2" style={{ backgroundColor: book.coverColor }} />
      
      {/* Card Body */}
      <div className="p-5 pt-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-extrabold text-sm text-foreground/95 line-clamp-2 leading-tight pr-1">
              {book.title}
            </h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityLabels[book.priority].style} shrink-0`}>
              {priorityLabels[book.priority].label}
            </span>
          </div>

          <p className="text-xs text-muted-foreground/80 mt-1 truncate">
            {book.author || "ไม่ระบุผู้แต่ง"}
          </p>

          {book.subject && (
            <span 
              className="inline-block text-[10px] font-bold mt-2 px-2 py-0.5 rounded-md text-white/90"
              style={{ backgroundColor: book.subject.color + "c0" }}
            >
              {book.subject.name}
            </span>
          )}
        </div>

        {/* Progress Bar & Details */}
        <div className="space-y-1.5 mt-4">
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-muted-foreground font-medium text-[10px]">
              {book.currentPage} / {book.totalPages} หน้า ({progressPct}%)
            </span>
            <span className="text-[10px] font-semibold text-sky-400">
              {statusLabels[book.status]}
            </span>
          </div>
          <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{ width: `${progressPct}%`, backgroundColor: book.coverColor }}
            />
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="bg-black/10 dark:bg-white/5 border-t border-white/5 px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-sky-500" onClick={onEdit}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {book.status !== "COMPLETED" ? (
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-xs text-sky-500 hover:text-sky-600 hover:bg-sky-500/10 font-bold h-7 gap-1"
            onClick={() => setOpenProgress(true)}
          >
            <Plus className="h-3 w-3" /> อัปเดตหน้า
          </Button>
        ) : (
          <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> อ่านจบแล้ว
          </span>
        )}
      </div>

      {/* Quick Update Dialog */}
      <Dialog open={openProgress} onOpenChange={setOpenProgress}>
        <DialogContent className="sm:max-w-[350px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>อัปเดตหน้าเว็บที่อ่านแล้ว</DialogTitle>
            <DialogDescription>ป้อนจำนวนหน้าที่อ่านเพิ่มเติมได้จากการอ่านรอบนี้</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickProgressUpdate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">อ่านเพิ่มกี่หน้า?</label>
              <Input
                type="number"
                min="1"
                max={book.totalPages - book.currentPage}
                required
                value={pagesRead}
                onChange={e => setPagesRead(e.target.value)}
                placeholder={`เหลือที่ยังไม่อ่าน ${book.totalPages - book.currentPage} หน้า`}
              />
            </div>
            <Button type="submit" disabled={updating} className="w-full bg-sky-500 hover:bg-sky-600 text-white h-10 rounded-xl">
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ยืนยันการบันทึก
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
