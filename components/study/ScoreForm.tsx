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

export function ScoreForm({
  onSuccess,
  initialData
}: {
  onSuccess?: () => void
  initialData?: any | null
}) {
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  
  // Form States
  const [testName, setTestName] = useState(initialData?.testName || "")
  const [score, setScore] = useState(initialData?.score !== undefined ? String(initialData.score) : "")
  const [maxScore, setMaxScore] = useState(initialData?.maxScore ? String(initialData.maxScore) : "")
  const [note, setNote] = useState(initialData?.note || "")
  const [subjectId, setSubjectId] = useState<string>(initialData?.subjectId || "")

  const defaultDate = initialData?.date
    ? new Date(initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch("/api/study/subjects")
        if (res.ok) {
          const subjs = await res.json()
          setSubjects(subjs)
          if (!subjectId && subjs.length > 0) {
            setSubjectId(subjs[0].id)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchSubjects()
  }, [subjectId])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!testName || !score || !maxScore || !subjectId) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน")
      return
    }

    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      const res = await fetch("/api/study/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          date: fd.get("date"),
          testName,
          score: Number(score),
          maxScore: Number(maxScore),
          note: note || null,
          subjectId
        })
      })

      if (!res.ok) throw new Error()
      toast.success(initialData ? "แก้ไขคะแนนสำเร็จ!" : "บันทึกผลคะแนนสำเร็จ! 🏆")
      if (onSuccess) onSuccess()
    } catch {
      toast.error("บันทึกคะแนนไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="testName">ชื่อการสอบ / รหัสข้อสอบ *</Label>
        <Input 
          id="testName" 
          value={testName} 
          onChange={e => setTestName(e.target.value)} 
          required 
          placeholder="e.g. CU-TEP Mock Test #1, Algorithms Final 2024" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subjectId">วิชาเรียน *</Label>
          <Select value={subjectId} onValueChange={(val) => setSubjectId(val || "")}>
            <SelectTrigger id="subjectId">
              <SelectValue placeholder="เลือกวิชาเรียน" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(subj => (
                <SelectItem key={subj.id} value={subj.id}>{subj.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">วันที่สอบ</Label>
          <Input id="date" name="date" type="date" required defaultValue={defaultDate} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border border-white/5 p-3.5 rounded-xl bg-black/10 dark:bg-white/5">
        <div className="space-y-1">
          <Label htmlFor="score" className="text-xs">คะแนนที่ได้ *</Label>
          <Input 
            id="score" 
            type="number" 
            step="any" 
            min="0" 
            required 
            value={score} 
            onChange={e => setScore(e.target.value)} 
            placeholder="e.g. 75" 
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="maxScore" className="text-xs">คะแนนเต็ม *</Label>
          <Input 
            id="maxScore" 
            type="number" 
            step="any" 
            min="1" 
            required 
            value={maxScore} 
            onChange={e => setMaxScore(e.target.value)} 
            placeholder="e.g. 100" 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">บันทึกเพิ่มเติม</Label>
        <Input 
          id="note" 
          value={note} 
          onChange={e => setNote(e.target.value)} 
          placeholder="เช่น พลาดพาร์ท Grammar, ทำโจทย์ไม่ทัน..." 
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "บันทึกการแก้ไขคะแนน" : "บันทึกคะแนนสอบ"}
      </Button>
    </form>
  )
}
