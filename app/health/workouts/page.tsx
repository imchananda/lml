"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { WorkoutForm } from "@/components/health/WorkoutForm"
import { Plus, Trash2, Edit2, Loader2, Dumbbell, Calendar as CalendarIcon, Heart, Clock, Zap } from "lucide-react"
import { toast } from "sonner"

type WorkoutLog = {
  id: string
  date: string
  workoutType: "CARDIO" | "STRENGTH" | "FLEXIBILITY" | "SPORTS" | "OTHER"
  name: string
  durationMinutes: number
  caloriesBurned?: number | null
  sets?: number | null
  reps?: number | null
  weightKg?: number | null
  note?: string | null
}

const typeConfig = {
  CARDIO: { label: "คาร์ดิโอ", color: "text-red-500", bg: "bg-red-500/10" },
  STRENGTH: { label: "เวทเทรนนิ่ง", color: "text-amber-500", bg: "bg-amber-500/10" },
  FLEXIBILITY: { label: "ยืดเหยียด/โยคะ", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  SPORTS: { label: "เล่นกีฬา", color: "text-sky-500", bg: "bg-sky-500/10" },
  OTHER: { label: "อื่นๆ", color: "text-purple-500", bg: "bg-purple-500/10" }
}

export default function WorkoutsPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)
  const [openAdd, setOpenAdd] = useState(false)
  const [editLog, setEditLog] = useState<WorkoutLog | null>(null)
  
  // Weekly stats
  const [weeklyCount, setWeeklyCount] = useState(0)
  const [weeklyDuration, setWeeklyDuration] = useState(0)
  const [weeklyBurned, setWeeklyBurned] = useState(0)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/health/workouts")
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
        
        // Calculate weekly stats (from last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        const recentLogs = data.filter((item: WorkoutLog) => new Date(item.date) >= sevenDaysAgo)
        setWeeklyCount(recentLogs.length)
        setWeeklyDuration(recentLogs.reduce((s: number, item: WorkoutLog) => s + item.durationMinutes, 0))
        setWeeklyBurned(recentLogs.reduce((s: number, item: WorkoutLog) => s + (item.caloriesBurned || 0), 0))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบประวัติการออกกำลังกายรายการนี้ใช่หรือไม่?")) return
    try {
      const res = await fetch(`/api/health/workouts?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("ลบรายการออกกำลังกายเรียบร้อยแล้ว!")
      fetchLogs()
    } catch {
      toast.error("ลบข้อมูลไม่สำเร็จ")
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient-health inline-block w-fit">
            Workout Tracking 🏋️‍♂️
          </h2>
          <p className="text-muted-foreground">บันทึกการออกกำลังกาย กิจกรรมฟิตเนส และการเผาผลาญแคลอรี</p>
        </div>

        <Button onClick={() => { setEditLog(null); setOpenAdd(true); }} className="bg-amber-500 hover:bg-amber-600 text-white shadow-md">
          <Plus className="mr-1 h-4 w-4" /> บันทึกออกกำลังกาย
        </Button>
      </div>

      {/* Weekly Stats Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card shadow-lg border-white/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">ออกกำลังกายสะสม</span>
              <span className="text-2xl font-black text-amber-500">{weeklyCount} ครั้ง</span>
              <span className="text-xs text-muted-foreground block">ในรอบ 7 วันที่ผ่านมา</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-lg border-white/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">เวลาสะสม</span>
              <span className="text-2xl font-black text-emerald-500">{weeklyDuration} นาที</span>
              <span className="text-xs text-muted-foreground block">ในรอบ 7 วันที่ผ่านมา</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-lg border-white/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-red-500/10 text-red-500">
              <Zap className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-bold uppercase tracking-wider">เผาผลาญรวม</span>
              <span className="text-2xl font-black text-red-500">{weeklyBurned} kcal</span>
              <span className="text-xs text-muted-foreground block">ในรอบ 7 วันที่ผ่านมา</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workout History Table */}
      <Card className="glass-card shadow-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-amber-500" />
            ประวัติการออกกำลังกาย
          </CardTitle>
          <CardDescription>รายการกิจกรรมและการออกกำลังกายทั้งหมดที่บันทึกไว้</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              ยังไม่มีข้อมูลประวัติการออกกำลังกาย กดปุ่ม "บันทึกออกกำลังกาย" เพื่อเพิ่มข้อมูลรายการแรก
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/10 dark:border-white/5">
                    <TableHead>วันที่บันทึก</TableHead>
                    <TableHead>ประเภทกิจกรรม</TableHead>
                    <TableHead>กิจกรรม / ท่าฝึก</TableHead>
                    <TableHead className="text-right">เวลา (นาที)</TableHead>
                    <TableHead className="text-right">รายละเอียดเซ็ต / น้ำหนัก</TableHead>
                    <TableHead className="text-right">เผาผลาญ (kcal)</TableHead>
                    <TableHead>บันทึกย่อ</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((item) => {
                    const config = typeConfig[item.workoutType] || typeConfig.OTHER
                    return (
                      <TableRow key={item.id} className="hover:bg-white/5 border-white/10 dark:border-white/5">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {new Date(item.date).toLocaleDateString("th-TH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right font-bold text-amber-500">
                          {item.durationMinutes} นาที
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {item.workoutType === "STRENGTH" && item.sets ? (
                            <span className="font-semibold text-muted-foreground">
                              {item.sets} เซ็ต × {item.reps || 0} ครั้ง ({item.weightKg || 0} กก.)
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-red-500">
                          {item.caloriesBurned ? `${item.caloriesBurned} kcal` : "—"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground text-sm">
                          {item.note || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-amber-500" onClick={() => { setEditLog(item); setOpenAdd(true); }}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forms Dialogs */}
      <Dialog open={openAdd} onOpenChange={(v) => { setOpenAdd(v); if(!v) setEditLog(null); }}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>{editLog ? "แก้ไขบันทึกการออกกำลังกาย" : "บันทึกการออกกำลังกาย"}</DialogTitle>
            <DialogDescription>บันทึกรายละเอียดการออกกำลังกาย ความเหนื่อย และการเผาผลาญพลังงาน</DialogDescription>
          </DialogHeader>
          <WorkoutForm
            initialData={editLog}
            onSuccess={() => {
              setOpenAdd(false);
              setEditLog(null);
              fetchLogs();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
