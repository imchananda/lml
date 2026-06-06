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

type Book = {
  id: string
  title: string
  currentPage: number
  totalPages: number
}

export function StudySessionForm({
  onSuccess,
  initialData
}: {
  onSuccess?: () => void
  initialData?: any | null
}) {
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [books, setBooks] = useState<Book[]>([])
  
  // Form States
  const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes ? String(initialData.durationMinutes) : "")
  const [pagesRead, setPagesRead] = useState(initialData?.pagesRead ? String(initialData.pagesRead) : "")
  const [note, setNote] = useState(initialData?.note || "")
  const [subjectId, setSubjectId] = useState<string>(initialData?.subjectId || "none")
  const [bookId, setBookId] = useState<string>("none")

  const defaultDate = initialData?.date
    ? new Date(initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  useEffect(() => {
    // Fetch subjects and books lists
    const fetchData = async () => {
      try {
        const [subjRes, booksRes] = await Promise.all([
          fetch("/api/study/subjects"),
          fetch("/api/study/books")
        ])

        if (subjRes.ok) setSubjects(await subjRes.json())
        if (booksRes.ok) {
          const allBooks = await booksRes.json()
          // Only show reading or not started books
          setBooks(allBooks.filter((b: any) => b.status !== "COMPLETED"))
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchData()
  }, [])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!durationMinutes) {
      toast.error("กรุณากรอกระยะเวลาอ่านหนังสือ")
      return
    }

    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      const res = await fetch("/api/study/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          date: fd.get("date"),
          durationMinutes: Number(durationMinutes),
          pagesRead: pagesRead ? Number(pagesRead) : null,
          note: note || null,
          subjectId: subjectId === "none" ? null : subjectId,
          bookId: bookId === "none" ? null : bookId
        })
      })

      if (!res.ok) throw new Error()
      toast.success(initialData ? "แก้ไขชั่วโมงอ่านหนังสือสำเร็จ!" : "บันทึกเวลาการเรียนสำเร็จ! ⏱️")
      if (onSuccess) onSuccess()
    } catch {
      toast.error("บันทึกข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">วันที่อ่านหนังสือ</Label>
          <Input id="date" name="date" type="date" required defaultValue={defaultDate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">ระยะเวลา (นาที) *</Label>
          <Input 
            id="durationMinutes" 
            type="number" 
            min="1" 
            required 
            value={durationMinutes} 
            onChange={e => setDurationMinutes(e.target.value)} 
            placeholder="e.g. 60, 120" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="pagesRead">หน้าที่อ่านได้ (Pages Read)</Label>
          <Input 
            id="pagesRead" 
            type="number" 
            min="0" 
            value={pagesRead} 
            onChange={e => setPagesRead(e.target.value)} 
            placeholder="e.g. 15" 
          />
        </div>
      </div>

      {/* Auto-update book dropdown (only for new session creation) */}
      {!initialData && books.length > 0 && (
        <div className="space-y-2 border border-dashed border-sky-500/20 p-3 rounded-xl bg-sky-500/5">
          <Label htmlFor="bookId" className="text-xs text-sky-500 font-bold block mb-1">
            อัปเดตความคืบหน้าของหนังสือด้วย? (Optional)
          </Label>
          <Select value={bookId} onValueChange={(val) => setBookId(val || "none")}>
            <SelectTrigger id="bookId" className="h-9 border-sky-500/20 bg-transparent text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="none">ไม่ระบุหนังสือ (None)</SelectItem>
              {books.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title} (หน้า {b.currentPage}/{b.totalPages})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {bookId !== "none" && pagesRead && (
            <p className="text-[10px] text-sky-400 mt-1 italic">
              * การกระทำนี้จะเพิ่มหน้าที่อ่านเข้าหนังสือ {books.find(b => b.id === bookId)?.title} ทันที +{pagesRead} หน้า
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">บันทึกย่อ (Notes)</Label>
        <Input 
          id="note" 
          value={note} 
          onChange={e => setNote(e.target.value)} 
          placeholder="เช่น สรุปสูตรบทที่ 2 และทดลองทำโจทย์..." 
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "บันทึกการแก้ไขชั่วโมงเรียน" : "บันทึกเซสชันการเรียน"}
      </Button>
    </form>
  )
}
