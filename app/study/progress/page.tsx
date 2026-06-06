"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StudySessionForm } from "@/components/study/StudySessionForm"
import { Loader2, ArrowLeft, Trash2, Edit2, Clock, BookOpen, Calendar as CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, BarChart, Bar, Legend } from "recharts"
import Link from "next/link"

type StudySession = {
  id: string
  date: string
  durationMinutes: number
  pagesRead?: number | null
  note?: string | null
  subject?: { name: string; color: string } | null
}

export default function StudyProgressPage() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [editSession, setEditSession] = useState<StudySession | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/study/sessions")
      if (res.ok) {
        setSessions(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบประวัติการอ่านหนังสือรายการนี้ใช่หรือไม่?")) return
    try {
      const res = await fetch(`/api/study/sessions?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("ลบประวัติชั่วโมงเรียนเรียบร้อยแล้ว!")
      fetchSessions()
    } catch {
      toast.error("ลบข้อมูลไม่สำเร็จ")
    }
  }

  // Group by date for charts (accumulating pages read and duration)
  const groupedData = sessions.reduce((acc: any, curr) => {
    const dateStr = new Date(curr.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
    if (!acc[dateStr]) {
      acc[dateStr] = { date: dateStr, duration: 0, pages: 0, rawDate: new Date(curr.date).getTime() }
    }
    acc[dateStr].duration += curr.durationMinutes
    acc[dateStr].pages += curr.pagesRead || 0
    return acc
  }, {})

  const chartData = Object.values(groupedData)
    .sort((a: any, b: any) => a.rawDate - b.rawDate)
    .slice(-15) // last 15 days of active learning

  // Averages
  const totalMinutes = sessions.reduce((sum, item) => sum + item.durationMinutes, 0)
  const totalPages = sessions.reduce((sum, item) => sum + (item.pagesRead || 0), 0)

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
            Study Session History & Stats 📈
          </h2>
          <p className="text-muted-foreground">สรุปสถิติเวลาติวตำรา จำนวนหน้าที่อ่าน และข้อมูลบันทึกทั้งหมด</p>
        </div>

        <Button onClick={() => { setEditSession(null); setOpenForm(true); }} className="bg-sky-500 hover:bg-sky-600 text-white shadow-md">
          <Clock className="mr-1 h-4 w-4" /> เพิ่มประวัติการติว
        </Button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-white/10">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-bold uppercase">เวลาติวสะสม</span>
              <span className="text-xl font-black text-foreground">
                {Math.round((totalMinutes / 60) * 10) / 10} ชม.
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">{totalMinutes} นาทีทั้งหมด</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-bold uppercase">จำนวนหน้าสะสม</span>
              <span className="text-xl font-black text-foreground">
                {totalPages} หน้า
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">จากหนังสือเรียนทั้งหมด</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Study Hours Trend Area Chart */}
        <Card className="glass-card shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">กราฟเวลาเรียน (Learning Time)</CardTitle>
            <CardDescription>แนวโน้มเวลาติวหนังสือในแต่ละวัน (นาที)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {chartData.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(15,15,20,0.9)",
                        color: "#fff"
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area 
                      name="เวลาติว (นาที)" 
                      type="monotone" 
                      dataKey="duration" 
                      stroke="#0ea5e9" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorDuration)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground text-sm">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pages Read Bar Chart */}
        <Card className="glass-card shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">จำนวนหน้าที่อ่าน (Pages Read)</CardTitle>
            <CardDescription>กราฟแท่งความคืบหน้าจำนวนหน้าในคลังหนังสือต่อวัน</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {chartData.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(15,15,20,0.9)",
                        color: "#fff"
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar name="หน้าที่อ่านจบ (หน้า)" dataKey="pages" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground text-sm">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="glass-card shadow-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">ประวัติกิจกรรมการอ่านหนังสือและการติว</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">
              ไม่มีข้อมูลประวัติการเรียน
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/10 dark:border-white/5">
                    <TableHead>วันที่บันทึก</TableHead>
                    <TableHead>วิชาเรียน</TableHead>
                    <TableHead className="text-right">ระยะเวลา</TableHead>
                    <TableHead className="text-right">หน้าที่อ่านได้</TableHead>
                    <TableHead>บันทึกสรุปย่อ</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((item) => (
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
                        {item.subject ? (
                          <span className="font-bold text-xs" style={{ color: item.subject.color }}>
                            {item.subject.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sky-500">
                        {item.durationMinutes} นาที
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-500">
                        {item.pagesRead ? `${item.pagesRead} หน้า` : "—"}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-muted-foreground text-xs">
                        {item.note || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-sky-500" onClick={() => { setEditSession(item); setOpenForm(true); }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={(v) => { setOpenForm(v); if(!v) setEditSession(null); }}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>{editSession ? "แก้ไขเวลาติวหนังสือ" : "บันทึกชั่วโมงติวหนังสือ"}</DialogTitle>
            <DialogDescription>แก้ไขรายละเอียดชั่วโมงวิชาและจำนวนหน้าหนังสือของรอบนั้นๆ</DialogDescription>
          </DialogHeader>
          <StudySessionForm
            initialData={editSession}
            onSuccess={() => {
              setOpenForm(false);
              setEditSession(null);
              fetchSessions();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
