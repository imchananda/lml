"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  GraduationCap, Plus, Loader2, BookOpen, Clock, 
  Trophy, Flame, Calendar, Settings, ArrowRight 
} from "lucide-react"
import { ExamCountdown } from "@/components/study/ExamCountdown"
import { StudySessionForm } from "@/components/study/StudySessionForm"
import { StudyStreakBadge } from "@/components/study/StudyStreakBadge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"

export default function StudyDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [examSaving, setExamSaving] = useState(false)
  const [subjectSaving, setSubjectSaving] = useState(false)

  // Dialog Opens
  const [openExam, setOpenExam] = useState(false)
  const [openSession, setOpenSession] = useState(false)
  const [openSubject, setOpenSubject] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/study/summary")
      if (res.ok) {
        setData(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const handleExamSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setExamSaving(true)
    const fd = new FormData(e.currentTarget)

    try {
      const res = await fetch("/api/study/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data?.exam?.id,
          name: fd.get("name"),
          examDate: fd.get("examDate"),
          university: fd.get("university"),
          program: fd.get("program"),
          isActive: true
        })
      })

      if (!res.ok) throw new Error()
      toast.success("อัปเดตข้อมูลเป้าหมายการสอบเรียบร้อยแล้ว!")
      setOpenExam(false)
      fetchSummary()
    } catch {
      toast.error("บันทึกข้อมูลล้มเหลว")
    } finally {
      setExamSaving(false)
    }
  }

  const handleSubjectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!data?.exam?.id) {
      toast.error("กรุณาตั้งค่าเป้าหมายการสอบก่อนสร้างวิชาเรียน")
      return
    }

    setSubjectSaving(true)
    const fd = new FormData(e.currentTarget)

    try {
      const res = await fetch("/api/study/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: data.exam.id,
          name: fd.get("name"),
          weight: fd.get("weight") ? Number(fd.get("weight")) : null,
          targetScore: fd.get("targetScore") ? Number(fd.get("targetScore")) : null,
          color: fd.get("color") || "#3b82f6"
        })
      })

      if (!res.ok) throw new Error()
      toast.success("เพิ่มรายวิชาเรียนเรียบร้อยแล้ว!")
      setOpenSubject(false)
      fetchSummary()
    } catch {
      toast.error("บันทึกวิชาล้มเหลว")
    } finally {
      setSubjectSaving(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    )
  }

  const formattedExamDate = data?.exam?.examDate
    ? new Date(data.exam.examDate).toISOString().split('T')[0]
    : ""

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient-study inline-block w-fit">
            Master Prep Planner 📚 Program CU SE
          </h2>
          <p className="text-muted-foreground">ตารางการเตรียมสอบ ป.โท วิศวกรรมซอฟต์แวร์ จุฬาลงกรณ์มหาวิทยาลัย</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Study Streak Badge */}
          {data?.study?.streak > 0 && (
            <StudyStreakBadge streak={data.study.streak} />
          )}

          {/* Exam Target Config Button */}
          <Dialog open={openExam} onOpenChange={setOpenExam}>
            <DialogTrigger render={<Button variant="outline" className="border-white/10 bg-black/20" />}>
              <Settings className="mr-2 h-4 w-4 text-sky-500" /> ข้อมูลเป้าหมาย
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>เป้าหมายการสอบป.โท</DialogTitle>
                <DialogDescription>ตั้งค่าการสอบและเดดไลน์เพื่อใช้นับถอยหลังช่วยเตรียมความพร้อม</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleExamSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">เป้าหมาย / ชื่อหลักสูตร *</Label>
                  <Input id="name" name="name" type="text" required defaultValue={data?.exam?.name || "สอบเข้า ป.โท วิศวกรรมซอฟต์แวร์ จุฬาฯ"} placeholder="e.g. สอบเข้า ป.โท CU SE" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="examDate">วันสอบ (Exam Date) *</Label>
                  <Input id="examDate" name="examDate" type="date" required defaultValue={formattedExamDate} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="university">มหาวิทยาลัย</Label>
                    <Input id="university" name="university" type="text" defaultValue={data?.exam?.university || "จุฬาลงกรณ์มหาวิทยาลัย"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="program">สาขาวิชา</Label>
                    <Input id="program" name="program" type="text" defaultValue={data?.exam?.program || "วิศวกรรมซอฟต์แวร์"} />
                  </div>
                </div>
                <Button type="submit" disabled={examSaving} className="w-full bg-sky-500 hover:bg-sky-600 text-white h-12 rounded-xl mt-4">
                  {examSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  บันทึกเป้าหมาย
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Quick Study Session */}
          <Dialog open={openSession} onOpenChange={setOpenSession}>
            <DialogTrigger render={<Button className="bg-sky-500 hover:bg-sky-600 text-white shadow-md" />}>
              <Plus className="mr-1 h-4 w-4" /> บันทึกเวลาอ่านหนังสือ
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>บันทึกเวลาเรียนวันนี้</DialogTitle>
                <DialogDescription>บันทึกจำนวนชั่วโมง/นาทีที่ใช้อ่านหนังสือและทำแบบฝึกหัด</DialogDescription>
              </DialogHeader>
              <StudySessionForm onSuccess={() => { setOpenSession(false); fetchSummary(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Study Cards Row */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* 1. Exam Countdown */}
        <div className="md:col-span-1">
          <ExamCountdown 
            examName={data?.exam?.name} 
            examDate={data?.exam?.examDate} 
            daysRemaining={data?.exam?.daysToExam} 
          />
        </div>

        {/* 2. Reading Progress Summary */}
        <Card className="glass-card shadow-lg border-sky-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-sky-500" />
              การอ่านหนังสือสะสม
            </CardTitle>
            <CardDescription>สัดส่วนหนังสือในคลังและความก้าวหน้า</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-muted-foreground font-semibold text-2xl text-gradient-study">
                {data?.reading?.progressPct || 0}%
              </span>
              <span className="text-muted-foreground font-medium text-[10px]">
                {data?.reading?.completedBooks || 0} / {data?.reading?.totalBooks || 0} เล่มจบ
              </span>
            </div>
            <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-500 rounded-full transition-all duration-1000"
                style={{ width: `${data?.reading?.progressPct || 0}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground flex justify-between items-center">
              <span>กำลังอ่าน: {data?.reading?.readingBooks || 0} เล่ม</span>
              <Link href="/study/books" className="text-sky-500 hover:underline inline-flex items-center gap-0.5">
                ดูคลังหนังสือ <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 3. Study Streak / Hours Card */}
        <Card className="glass-card shadow-lg border-sky-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-sky-500" />
              เวลาเตรียมตัวสัปดาห์นี้
            </CardTitle>
            <CardDescription>ชั่วโมงสะสมการเรียนเทียบกับเป้า</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-3xl font-black text-sky-500">
                  {data?.study?.weeklyHours || 0}
                </span>
                <span className="text-xs text-muted-foreground ml-1">ชม. สัปดาห์นี้</span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                สะสมรวม: {data?.study?.totalHours || 0} ชม.
              </span>
            </div>
            
            <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/10 text-xs text-muted-foreground flex items-center justify-between">
              <span>ชั่วโมงอ่านเฉลี่ยต่อสัปดาห์ช่วยเพิ่มโอกาสสอบผ่านหลักสูตร CU SE ได้อย่างดี!</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Exam Average Score Card */}
        <Card className="glass-card shadow-lg border-sky-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-sky-500 animate-pulse" />
              ผลการจำลองสอบ
            </CardTitle>
            <CardDescription>คะแนนรวมและเป้าหมายการทำคะแนน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-muted-foreground font-semibold text-2xl text-gradient-study">
                {data?.scores?.averagePct || 0}%
              </span>
              <span className="text-muted-foreground font-medium text-[10px]">
                ทำแบบฝึกหัด {data?.scores?.count || 0} ครั้ง
              </span>
            </div>
            <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-500 rounded-full transition-all duration-1000"
                style={{ width: `${data?.scores?.averagePct || 0}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground flex justify-between items-center">
              <span>เป้าประเมินรวม: 80%</span>
              <Link href="/study/scores" className="text-sky-500 hover:underline inline-flex items-center gap-0.5">
                ดูประวัติคะแนน <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Subject Detailed Grid & Daily Schedules */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Subject Planner (Col Span 2) */}
        <Card className="glass-card shadow-lg md:col-span-2 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-sky-500" />
                รายวิชาสอบและแผนดำเนินงาน (Subjects)
              </CardTitle>
              <CardDescription>วิชาเรียนหลักในการสอบเข้า ป.โท CU SE และความคืบหน้าของแต่ละด้าน</CardDescription>
            </div>
            {data?.exam && (
              <Dialog open={openSubject} onOpenChange={setOpenSubject}>
                <DialogTrigger render={<Button size="sm" variant="outline" className="border-sky-500/20 text-sky-500 hover:bg-sky-500/10" />}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> เพิ่มวิชา
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] glass-card border-white/10">
                  <DialogHeader>
                    <DialogTitle>เพิ่มรายวิชาเรียนสอบ</DialogTitle>
                    <DialogDescription>เพิ่มวิชาเรียนเพื่อจัดกลุ่มหนังสือ ตารางเรียน และบันทึกคะแนน</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubjectSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="subjName">ชื่อวิชาเรียน *</Label>
                      <Input id="subjName" name="name" type="text" required placeholder="เช่น Software Engineering, CU-TEP..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="weight">สัดส่วนคะแนน (%)</Label>
                        <Input id="weight" name="weight" type="number" min="0" max="100" placeholder="e.g. 30" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="targetScore">คะแนนเป้าหมาย</Label>
                        <Input id="targetScore" name="targetScore" type="number" placeholder="e.g. 80" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">สีของวิชา</Label>
                      <Input id="color" name="color" type="color" defaultValue="#3b82f6" />
                    </div>
                    <Button type="submit" disabled={subjectSaving} className="w-full bg-sky-500 hover:bg-sky-600 text-white h-11 rounded-xl">
                      {subjectSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      ยืนยันการเพิ่มวิชา
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {!data?.exam ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                ยังไม่ได้ระบุเป้าหมายวันสอบ กรุณากดปุ่ม "ข้อมูลเป้าหมาย" เพื่อเริ่มสร้างแผนเรียนวิชา
              </div>
            ) : data.subjects?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                ยังไม่มีข้อมูลรายวิชาที่จะสอบ กดปุ่ม "เพิ่มวิชา" ด้านบนเพื่อเพิ่มวิชาแรก (เช่น CU-TEP, Algorithms, SE)
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.subjects.map((subj: any) => (
                  <div 
                    key={subj.id}
                    className="p-4 rounded-xl border border-white/5 bg-black/10 dark:bg-white/5 relative flex flex-col justify-between"
                    style={{ borderLeft: `4px solid ${subj.color}` }}
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm text-foreground">{subj.name}</span>
                        {subj.weight && (
                          <span className="text-[10px] text-muted-foreground font-bold bg-secondary/50 px-1.5 py-0.5 rounded">
                            สัดส่วน {subj.weight}%
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <p>ชั่วโมงเรียนสะสม: <span className="text-foreground font-semibold">{subj.studyHours} ชม.</span></p>
                        <p>คะแนนจำลองเฉลี่ย: <span className="text-foreground font-semibold">{subj.avgScore}%</span> (เป้า: {subj.targetScore || "—"}%)</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-white/5 flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground">หนังสือเรียน: {subj.completedBooks}/{subj.booksCount} จบ</span>
                      <span className="font-bold text-sky-400">อ่าน {subj.bookProgress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily timeline / schedule */}
        <Card className="glass-card shadow-lg border-white/10 flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row justify-between items-start space-y-0">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-sky-500" />
                ตารางติววันนี้
              </CardTitle>
              <CardDescription>ตารางเตรียมอ่านหนังสือเฉพาะของวันนี้</CardDescription>
            </div>
            <Link href="/study/schedule" className="text-xs text-sky-500 font-bold hover:underline">
              ดูตารางเต็ม
            </Link>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {data?.todaySchedules?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground/60 text-xs italic">
                ไม่มีนัดติวอ่านหนังสือวันนี้
              </div>
            ) : (
              <div className="space-y-3 pr-1 overflow-y-auto max-h-[250px]">
                {data?.todaySchedules?.map((item: any) => (
                  <div 
                    key={item.id}
                    className="p-3 rounded-xl border border-white/5 flex justify-between items-center text-xs"
                    style={{ borderLeft: `3.5px solid ${item.color}` }}
                  >
                    <div>
                      <span className="font-bold text-foreground block">{item.title}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        ⏱️ {item.startTime} - {item.endTime}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-sky-400 capitalize">
                      {item.type.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
