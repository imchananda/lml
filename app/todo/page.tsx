"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskItem } from "@/components/todo/TaskItem"
import { TaskForm } from "@/components/todo/TaskForm"
import { ListTodo, Plus, Calendar as CalendarIcon, Loader2, Folder, CheckCircle, Clock } from "lucide-react"
import { toast } from "sonner"

export default function TodoPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [tasks, setTasks] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  // Dialog Controls
  const [openAdd, setOpenAdd] = useState(false)
  const [editTask, setEditTask] = useState<any | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/todo/categories")
      if (res.ok) setCategories(await res.json())
    } catch (e) {
      console.error(e)
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/todo/tasks?date=${selectedDate}`)
      if (res.ok) setTasks(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchTasks()
    fetchCategories()
  }, [fetchTasks, fetchCategories])

  const handleToggleStatus = async (task: any) => {
    const nextStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED"
    try {
      const res = await fetch("/api/todo/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          status: nextStatus
        })
      })

      if (!res.ok) throw new Error()
      toast.success(nextStatus === "COMPLETED" ? "สำเร็จงานแล้ว! 🎉" : "เปลี่ยนสถานะงาน")
      fetchTasks()
    } catch {
      toast.error("อัปเดตสถานะงานไม่สำเร็จ")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบงานนี้ออกใช่หรือไม่?")) return
    try {
      const res = await fetch(`/api/todo/tasks?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("ลบงานเสร็จสิ้น!")
      fetchTasks()
    } catch {
      toast.error("ลบงานไม่สำเร็จ")
    }
  }

  // Filter tasks by Category
  const filteredTasks = tasks.filter(t => {
    if (selectedCategory === "all") return true
    return t.categoryId === selectedCategory
  })

  // Calculation stats for the day
  const totalCount = tasks.length
  const completedCount = tasks.filter(t => t.status === "COMPLETED").length
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Quick horizontal dates list around selectedDate (prev 3 days and next 3 days)
  const getHorizontalDates = () => {
    const dates = []
    for (let i = -3; i <= 3; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      dates.push(d)
    }
    return dates
  }

  const dateList = getHorizontalDates()

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient-todo inline-block w-fit">
            Daily Checklist & Tasks ✅
          </h2>
          <p className="text-muted-foreground">บันทึกเป้าหมายการดำเนินงานประจำวันและตรวจสอบสิ่งที่ต้องจัดการ</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Main date input picker */}
          <div className="flex items-center gap-2 bg-black/20 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 dark:border-white/5">
            <CalendarIcon className="h-4 w-4 text-violet-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm border-none focus:outline-none focus:ring-0 text-foreground font-semibold"
            />
          </div>

          <Button onClick={() => { setEditTask(null); setOpenAdd(true); }} className="bg-violet-500 hover:bg-violet-600 text-white shadow-md">
            <Plus className="mr-1 h-4 w-4" /> เพิ่มงานใหม่
          </Button>
        </div>
      </div>

      {/* Horizontal Calendar Bar */}
      <div className="flex justify-between items-center bg-black/10 dark:bg-white/5 p-2 rounded-2xl border border-white/10 dark:border-white/5 overflow-x-auto gap-2">
        {dateList.map((d) => {
          const dStr = d.toISOString().split('T')[0]
          const isSelected = dStr === selectedDate
          const isTodayDate = dStr === new Date().toISOString().split('T')[0]
          
          return (
            <button
              key={dStr}
              onClick={() => setSelectedDate(dStr)}
              className={`flex-1 min-w-[70px] py-2 px-1 rounded-xl transition-all flex flex-col items-center ${
                isSelected 
                  ? "bg-violet-500 text-white shadow-lg font-black scale-105" 
                  : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {d.toLocaleDateString("th-TH", { weekday: "short" })}
              </span>
              <span className="text-lg font-extrabold mt-0.5">
                {d.getDate()}
              </span>
              {isTodayDate && !isSelected && (
                <span className="h-1 w-1 bg-violet-500 rounded-full mt-1" />
              )}
            </button>
          )
        })}
      </div>

      {/* Stats and Categories filters */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Left Column: Progress stats & quick categorizations */}
        <div className="md:col-span-1 space-y-6">
          {/* Progress Card */}
          <Card className="glass-card shadow-lg border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ความสำเร็จของวัน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-3xl font-black text-violet-500">
                  {completionPct}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">ทำเสร็จแล้ว</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-violet-500 rounded-full transition-all duration-700"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                  <span>เสร็จ {completedCount} งาน</span>
                  <span>ทั้งหมด {totalCount} งาน</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories Filter Card */}
          <Card className="glass-card shadow-lg border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-1.5">
                <Folder className="h-4 w-4 text-violet-500" />
                หมวดหมู่งาน
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex justify-between items-center transition-colors ${
                  selectedCategory === "all" 
                    ? "bg-violet-500/10 text-violet-500 dark:text-violet-400 font-bold" 
                    : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>📦 ทั้งหมด</span>
                <span className="bg-secondary/80 px-1.5 py-0.5 rounded text-[10px]">{tasks.length}</span>
              </button>
              {categories.map(cat => {
                const count = tasks.filter(t => t.categoryId === cat.id).length
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex justify-between items-center transition-colors ${
                      selectedCategory === cat.id 
                        ? "bg-violet-500/10 text-violet-500 dark:text-violet-400 font-bold" 
                        : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                    <span className="bg-secondary/80 px-1.5 py-0.5 rounded text-[10px]">{count}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tasks List */}
        <div className="md:col-span-3 space-y-4">
          <Card className="glass-card shadow-lg border-white/10 min-h-[400px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-violet-500" />
                รายการสิ่งที่ต้องทำ (To-Do List)
              </CardTitle>
              <CardDescription>
                แผนงานทั้งหมดสำหรับวันที่ {new Date(selectedDate).toLocaleDateString("th-TH", { day: "numeric", month: "long" })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm border border-dashed border-white/10 rounded-2xl bg-black/5 dark:bg-white/5">
                  <CheckCircle className="h-10 w-10 text-violet-500/30 mx-auto mb-2" />
                  ไม่มีงานคงค้างสำหรับวันที่เลือก สนุกกับเวลาว่างของคุณ!
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Show pending tasks first, completed at the bottom */}
                  {filteredTasks
                    .sort((a, b) => {
                      if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1
                      if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1
                      return a.sortOrder - b.sortOrder
                    })
                    .map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onToggleStatus={() => handleToggleStatus(task)} 
                        onEdit={() => { setEditTask(task); setOpenAdd(true); }} 
                        onDelete={() => handleDelete(task.id)} 
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forms Dialogs */}
      <Dialog open={openAdd} onOpenChange={(v) => { setOpenAdd(v); if(!v) setEditTask(null); }}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>{editTask ? "แก้ไขรายละเอียดงาน" : "เพิ่มงานใหม่เข้าลิตส์"}</DialogTitle>
            <DialogDescription>ตั้งค่าหัวข้องาน กำหนดส่ง และหมวดหมู่การแจ้งเตือน</DialogDescription>
          </DialogHeader>
          <TaskForm
            initialData={editTask}
            selectedDate={selectedDate}
            onSuccess={() => {
              setOpenAdd(false);
              setEditTask(null);
              fetchTasks();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
