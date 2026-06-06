"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type Subject = {
  id: string
  name: string
  color: string
}

type BookData = {
  id?: string
  title: string
  author?: string | null
  totalPages: number
  currentPage: number
  totalChapters?: number | null
  currentChapter: number
  priority: "LOW" | "MEDIUM" | "HIGH"
  status: "NOT_STARTED" | "READING" | "COMPLETED" | "ON_HOLD"
  coverColor: string
  notes?: string | null
  startDate?: string | Date | null
  finishDate?: string | Date | null
  subjectId?: string | null
}

const defaultColors = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", 
  "#ec4899", "#14b8a6", "#6366f1", "#f97316"
]

export function BookForm({
  onSuccess,
  initialData
}: {
  onSuccess?: () => void
  initialData?: BookData | null
}) {
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  
  // Form States
  const [title, setTitle] = useState(initialData?.title || "")
  const [author, setAuthor] = useState(initialData?.author || "")
  const [totalPages, setTotalPages] = useState<string>(initialData?.totalPages ? String(initialData.totalPages) : "")
  const [currentPage, setCurrentPage] = useState<string>(initialData?.currentPage !== undefined ? String(initialData.currentPage) : "0")
  const [totalChapters, setTotalChapters] = useState<string>(initialData?.totalChapters ? String(initialData.totalChapters) : "")
  const [currentChapter, setCurrentChapter] = useState<string>(initialData?.currentChapter !== undefined ? String(initialData.currentChapter) : "0")
  const [priority, setPriority] = useState<BookData["priority"]>(initialData?.priority || "MEDIUM")
  const [status, setStatus] = useState<BookData["status"]>(initialData?.status || "NOT_STARTED")
  const [coverColor, setCoverColor] = useState(initialData?.coverColor || "#3b82f6")
  const [notes, setNotes] = useState(initialData?.notes || "")
  const [subjectId, setSubjectId] = useState<string>(initialData?.subjectId || "none")

  // Date defaults
  const [startDate, setStartDate] = useState(
    initialData?.startDate 
      ? new Date(initialData.startDate).toISOString().split('T')[0]
      : ""
  )
  const [finishDate, setFinishDate] = useState(
    initialData?.finishDate
      ? new Date(initialData.finishDate).toISOString().split('T')[0]
      : ""
  )

  useEffect(() => {
    // Fetch subjects list to link to book
    const fetchSubjects = async () => {
      try {
        const res = await fetch("/api/study/subjects")
        if (res.ok) {
          setSubjects(await res.json())
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchSubjects()
  }, [])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title || !totalPages) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/study/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          title,
          author: author || null,
          totalPages: Number(totalPages),
          currentPage: Number(currentPage),
          totalChapters: totalChapters ? Number(totalChapters) : null,
          currentChapter: Number(currentChapter),
          priority,
          status,
          coverColor,
          notes: notes || null,
          startDate: startDate || null,
          finishDate: finishDate || null,
          subjectId: subjectId === "none" ? null : subjectId
        })
      })

      if (!res.ok) throw new Error()
      toast.success(initialData ? "อัปเดตข้อมูลหนังสือสำเร็จ!" : "เพิ่มหนังสือสำเร็จ! 📚")
      if (onSuccess) onSuccess()
    } catch {
      toast.error("บันทึกข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="title">ชื่อหนังสือ (Book Title) *</Label>
        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Introduction to Algorithms..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="author">ผู้แต่ง (Author)</Label>
          <Input id="author" value={author} onChange={e => setAuthor(e.target.value)} placeholder="e.g. Thomas H. Cormen" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subjectId">วิชาเรียน (Subject)</Label>
          <Select value={subjectId} onValueChange={(val) => setSubjectId(val || "none")}>
            <SelectTrigger id="subjectId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">ไม่ระบุวิชา (None)</SelectItem>
              {subjects.map(subj => (
                <SelectItem key={subj.id} value={subj.id}>{subj.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border border-white/5 p-3.5 rounded-xl bg-black/10 dark:bg-white/5">
        <div className="space-y-1">
          <Label htmlFor="totalPages" className="text-xs">จำนวนหน้าทั้งหมด *</Label>
          <Input id="totalPages" type="number" min="1" required value={totalPages} onChange={e => setTotalPages(e.target.value)} placeholder="e.g. 500" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="currentPage" className="text-xs">อ่านถึงหน้าปัจจุบัน</Label>
          <Input id="currentPage" type="number" min="0" value={currentPage} onChange={e => setCurrentPage(e.target.value)} placeholder="e.g. 120" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">สถานะการอ่าน</Label>
          <Select value={status} onValueChange={(val: any) => setStatus(val)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_STARTED">ยังไม่ได้เริ่ม (Not Started)</SelectItem>
              <SelectItem value="READING">กำลังอ่าน (Reading)</SelectItem>
              <SelectItem value="COMPLETED">อ่านจบแล้ว (Completed)</SelectItem>
              <SelectItem value="ON_HOLD">ดองไว้ก่อน (On Hold)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">ความสำคัญ (Priority)</Label>
          <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">ต่ำ (Low)</SelectItem>
              <SelectItem value="MEDIUM">ปานกลาง (Medium)</SelectItem>
              <SelectItem value="HIGH">สูง (High)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">วันที่เริ่มอ่าน</Label>
          <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finishDate">วันที่อ่านจบ</Label>
          <Input id="finishDate" type="date" value={finishDate} onChange={e => setFinishDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>สีหน้าปกหนังสือ (Theme Color)</Label>
        <div className="flex flex-wrap gap-2 pt-1">
          {defaultColors.map(c => (
            <button
              key={c}
              type="button"
              className={`h-7 w-7 rounded-lg transition-transform ${coverColor === c ? "scale-110 ring-2 ring-white/40" : "hover:scale-105"}`}
              style={{ backgroundColor: c }}
              onClick={() => setCoverColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">โน้ต / บันทึกย่อ</Label>
        <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="เช่น เน้นบทที่ 3-5 เป็นพิเศษ..." />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "บันทึกการแก้ไขข้อมูลหนังสือ" : "เพิ่มหนังสือลงในคลัง"}
      </Button>
    </form>
  )
}
