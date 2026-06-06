"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { WeeklyTimetable } from "@/components/study/WeeklyTimetable"
import { ScheduleForm } from "@/components/study/ScheduleForm"
import { Plus, Calendar, Loader2, ArrowLeft, Trash2, CalendarCheck } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function StudySchedulePage() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialog controls
  const [openForm, setOpenForm] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/study/schedule")
      if (res.ok) {
        setSchedules(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบกิจกรรมนี้ออกจากตารางติวสอบใช่หรือไม่?")) return
    try {
      const res = await fetch(`/api/study/schedule?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("ลบรายการออกจากตารางเรียบร้อยแล้ว!")
      fetchSchedules()
    } catch {
      toast.error("ลบข้อมูลไม่สำเร็จ")
    }
  }

  // Get upcoming one-off events
  const oneTimeEvents = schedules.filter(s => !s.isRecurring && s.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 hover:text-sky-500">
            <ArrowLeft className="h-3.5 w-3.5" />
            <Link href="/study">กลับแดชบอร์ดหลัก</Link>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-gradient-study inline-block w-fit">
            Weekly Study Schedule 📅
          </h2>
          <p className="text-muted-foreground">ตารางเรียน ตารางติวสอบรายสัปดาห์ และบันทึกวันสอบ CU SE</p>
        </div>

        <Button onClick={() => { setEditItem(null); setOpenForm(true); }} className="bg-sky-500 hover:bg-sky-600 text-white shadow-md">
          <Plus className="mr-1 h-4 w-4" /> เพิ่มเวลาเรียน/วันสอบ
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Timetable grid component */}
          <Card className="glass-card shadow-lg border-white/10 overflow-hidden">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-sky-500" />
                ตารางเรียนประจำสัปดาห์ (Weekly Timetable)
              </CardTitle>
              <CardDescription>แสดงกิจกรรมการเรียนสอบที่ตั้งเป็นตารางเวลาประจำสัปดาห์</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <WeeklyTimetable 
                schedules={schedules} 
                onEdit={(item) => { setEditItem(item); setOpenForm(true); }} 
                onDelete={handleDelete} 
              />
            </CardContent>
          </Card>

          {/* 2. One-time Events and Milestones List */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="glass-card shadow-lg border-white/10 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-sky-500" />
                  วันสอบและกิจกรรมสำคัญ (Important Dates)
                </CardTitle>
                <CardDescription>เดดไลน์วันสอบจริง หรือสอบทดลองแบบไม่ใช่กิจกรรมรายสัปดาห์</CardDescription>
              </CardHeader>
              <CardContent>
                {oneTimeEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center italic">ไม่มีกำหนดการสำคัญเฉพาะวัน</p>
                ) : (
                  <div className="space-y-3">
                    {oneTimeEvents.map((item) => (
                      <div key={item.id} className="p-3.5 rounded-xl border border-white/5 bg-black/10 dark:bg-white/5 flex justify-between items-center text-sm" style={{ borderLeft: `4px solid ${item.color}` }}>
                        <div>
                          <span className="font-extrabold text-foreground">{item.title}</span>
                          <span className="text-xs text-muted-foreground block mt-0.5">
                            📅 {new Date(item.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })} · {item.startTime} - {item.endTime}
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-sky-500" onClick={() => { setEditItem(item); setOpenForm(true); }}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card shadow-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">ข้อแนะนำการสร้างตารางเวลา</CardTitle>
                <CardDescription>เพิ่มประสิทธิภาพการอ่านสอบ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <p>
                  🎯 <strong className="text-foreground">แยกประเภทศึกษา (Study vs Review):</strong> วางแผนเรียนหัวข้อใหม่สลับกับการทำแบบฝึกหัดทบทวนในสัปดาห์
                </p>
                <p>
                  🧘‍♂️ <strong className="text-foreground">อย่าลืมตารางพัก (Break):</strong> ป้อนช่วงพักสั้นๆ เพื่อหลีกเลี่ยงความเหนื่อยล้าสะสมจากการอ่านหนังสือ
                </p>
                <p>
                  📅 <strong className="text-foreground">บันทึกวันสอบ CU-TEP:</strong> บันทึกเดดไลน์ลงในปฏิทินเพื่อใช้วางแผนการทำข้อสอบ Mock Test ล่วงหน้า
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={(v) => { setOpenForm(v); if(!v) setEditItem(null); }}>
        <DialogContent className="sm:max-w-[400px] glass-card border-white/10 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "แก้ไขตารางเรียน/นัดติว" : "เพิ่มเวลาเรียนหรือกำหนดการ"}</DialogTitle>
            <DialogDescription>เพิ่มวิชาเรียน ตารางอ่าน หรือนัดวันสอบลงในระบบปฏิทิน</DialogDescription>
          </DialogHeader>
          <ScheduleForm
            initialData={editItem}
            onSuccess={() => {
              setOpenForm(false);
              setEditItem(null);
              fetchSchedules();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
