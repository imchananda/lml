"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScoreForm } from "@/components/study/ScoreForm"
import { Plus, Trophy, Loader2, ArrowLeft, Trash2, Edit2, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "recharts"
import Link from "next/link"

type ScoreLog = {
  id: string
  testName: string
  score: number
  maxScore: number
  date: string
  note?: string | null
  subject: { name: string; color: string }
}

export default function StudyScoresPage() {
  const [scores, setScores] = useState<ScoreLog[]>([])
  const [loading, setLoading] = useState(true)
  const [openAdd, setOpenAdd] = useState(false)
  const [editScore, setEditScore] = useState<ScoreLog | null>(null)

  const fetchScores = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/study/scores")
      if (res.ok) {
        setScores(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScores()
  }, [fetchScores])

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบประวัติคะแนนรายการนี้ใช่หรือไม่?")) return
    try {
      const res = await fetch(`/api/study/scores?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("ลบประวัติคะแนนเรียบร้อยแล้ว!")
      fetchScores()
    } catch {
      toast.error("ลบข้อมูลไม่สำเร็จ")
    }
  }

  // Calculate averages
  const totalTests = scores.length
  const avgPct = totalTests > 0 
    ? Math.round(scores.reduce((sum, item) => sum + (item.score / item.maxScore) * 100, 0) / totalTests) 
    : 0

  // Prepare chart data (chronological order)
  const chartData = [...scores]
    .reverse()
    .map(item => ({
      date: new Date(item.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
      pct: Math.round((item.score / item.maxScore) * 100),
      testName: item.testName
    }))

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
            Mock Exam Scores 🏆
          </h2>
          <p className="text-muted-foreground">บันทึกคะแนนจำลองทดลองสอบเพื่อวิเคราะห์และประเมินผลความพร้อม</p>
        </div>

        <Button onClick={() => { setEditScore(null); setOpenAdd(true); }} className="bg-sky-500 hover:bg-sky-600 text-white shadow-md">
          <Plus className="mr-1 h-4 w-4" /> บันทึกคะแนนใหม่
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Stats Summary */}
        <div className="space-y-6">
          <Card className="glass-card shadow-lg border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">สรุปการฝึกฝนข้อสอบ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div>
                <span className="text-xs text-muted-foreground block font-bold uppercase">คะแนนเฉลี่ยประเมิน</span>
                <span className="text-3xl font-black text-sky-500">{avgPct}%</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-bold uppercase">จำนวนการทดลองสอบ</span>
                <span className="text-lg font-bold text-foreground">{totalTests} ครั้ง</span>
              </div>
              <div className="p-3 bg-sky-500/5 rounded-xl border border-sky-500/10 text-xs text-muted-foreground">
                การตั้งเป้าหมายคะแนนสอบที่ 80% ขึ้นไปจะช่วยสร้างความมั่นใจก่อนวันสอบจริง
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score Trend Chart (Span 2 cols) */}
        <Card className="glass-card shadow-lg border-white/10 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-sky-500" />
              แนวโน้มคะแนนจำลอง (Score Trend)
            </CardTitle>
            <CardDescription>กราฟเปอร์เซ็นต์คะแนนเปรียบเทียบตามลำดับเวลาในการทำข้อสอบ</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {chartData.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(15,15,20,0.9)",
                        color: "#fff"
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line 
                      name="เปอร์เซ็นต์คะแนน (%)" 
                      type="monotone" 
                      dataKey="pct" 
                      stroke="#0ea5e9" 
                      strokeWidth={3}
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm">
                ยังไม่มีการบันทึกประวัติการสอบ
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scores Table */}
      <Card className="glass-card shadow-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">ประวัติบันทึกผลสอบจำลอง</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          ) : scores.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">
              ไม่มีบันทึกคะแนนสอบ กดบันทึกคะแนนเพื่อสร้างประวัติ
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/10 dark:border-white/5">
                    <TableHead>วันที่สอบ</TableHead>
                    <TableHead>วิชาเรียน</TableHead>
                    <TableHead>รหัสข้อสอบ / ชุดฝึกฝน</TableHead>
                    <TableHead className="text-right">คะแนน (เต็ม)</TableHead>
                    <TableHead className="text-right">คิดเป็น %</TableHead>
                    <TableHead>โน้ต / วิเคราะห์ผล</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((item) => {
                    const pct = Math.round((item.score / item.maxScore) * 100)
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
                          <span className="font-bold text-xs" style={{ color: item.subject.color }}>
                            {item.subject.name}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {item.testName}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {item.score} / {item.maxScore}
                        </TableCell>
                        <TableCell className="text-right font-black text-sky-500">
                          {pct}%
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                          {item.note || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-sky-500" onClick={() => { setEditScore(item); setOpenAdd(true); }}>
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
      <Dialog open={openAdd} onOpenChange={(v) => { setOpenAdd(v); if(!v) setEditScore(null); }}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>{editScore ? "แก้ไขประวัติคะแนนสอบ" : "บันทึกคะแนนสอบใหม่"}</DialogTitle>
            <DialogDescription>บันทึกชื่อหัวข้อสอบ วิชาเรียน และคะแนนที่ได้จริงเพื่อประเมินความพร้อม</DialogDescription>
          </DialogHeader>
          <ScoreForm
            initialData={editScore}
            onSuccess={() => {
              setOpenAdd(false);
              setEditScore(null);
              fetchScores();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
