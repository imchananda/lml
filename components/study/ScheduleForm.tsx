"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const scheduleTypes = [
  { value: "STUDY", label: "อ่านหนังสือ (Study)" },
  { value: "EXAM", label: "วันสอบ (Exam)" },
  { value: "REVIEW", label: "ทบทวนบทเรียน (Review)" },
  { value: "BREAK", label: "พักผ่อน (Break)" }
]

const daysOfWeek = [
  { value: "0", label: "วันอาทิตย์ (Sunday)" },
  { value: "1", label: "วันจันทร์ (Monday)" },
  { value: "2", label: "วันอังคาร (Tuesday)" },
  { value: "3", label: "วันพุธ (Wednesday)" },
  { value: "4", label: "วันพฤหัสบดี (Thursday)" },
  { value: "5", label: "วันศุกร์ (Friday)" },
  { value: "6", label: "วันเสาร์ (Saturday)" }
]

const colorOptions = [
  "#3b82f6", "#ef4444", "#eab308", "#10b981", "#8b5cf6", "#6b7280"
]

export function ScheduleForm({
  onSuccess,
  initialData
}: {
  onSuccess?: () => void
  initialData?: any | null
}) {
  const [loading, setLoading] = useState(false)
  
  // Form States
  const [title, setTitle] = useState(initialData?.title || "")
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false)
  const [dayOfWeek, setDayOfWeek] = useState<string>(
    initialData?.dayOfWeek !== undefined && initialData?.dayOfWeek !== null 
      ? String(initialData.dayOfWeek) 
      : "1"
  )
  const [date, setDate] = useState(
    initialData?.date 
      ? new Date(initialData.date).toISOString().split('T')[0]
      : ""
  )
  const [startTime, setStartTime] = useState(initialData?.startTime || "09:00")
  const [endTime, setEndTime] = useState(initialData?.endTime || "11:00")
  const [type, setType] = useState<string>(initialData?.type || "STUDY")
  const [color, setColor] = useState(initialData?.color || "#3b82f6")

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title || !startTime || !endTime) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/study/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          title,
          isRecurring,
          dayOfWeek: isRecurring ? Number(dayOfWeek) : null,
          date: isRecurring ? null : (date || new Date().toISOString().split('T')[0]),
          startTime,
          endTime,
          type,
          color
        })
      })

      if (!res.ok) throw new Error()
      toast.success(initialData ? "อัปเดตตารางเวลาสำเร็จ!" : "เพิ่มรายการตารางเวลาสำเร็จ! 📅")
      if (onSuccess) onSuccess()
    } catch {
      toast.error("บันทึกตารางเวลาไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="title">หัวข้อกิจกรรม *</Label>
        <Input 
          id="title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          required 
          placeholder="e.g. อ่าน Algorithms Ch.3, สอบ CU-TEP จุฬา" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">ประเภทกิจกรรม</Label>
          <Select value={type} onValueChange={(val) => setType(val || "STUDY")}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scheduleTypes.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="isRecurring">ลักษณะตาราง</Label>
          <Select value={isRecurring ? "recurring" : "onetime"} onValueChange={val => setIsRecurring(val === "recurring")}>
            <SelectTrigger id="isRecurring">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="onetime">เฉพาะวันที่ (One-time)</SelectItem>
              <SelectItem value="recurring">เป็นประจำทุกสัปดาห์ (Weekly)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isRecurring ? (
        <div className="space-y-2">
          <Label htmlFor="dayOfWeek">วันที่ทำกิจกรรมประจำสัปดาห์</Label>
          <Select value={dayOfWeek} onValueChange={(val) => setDayOfWeek(val || "1")}>
            <SelectTrigger id="dayOfWeek">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {daysOfWeek.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="date">วันที่ของกิจกรรม</Label>
          <Input 
            id="date" 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">เวลาเริ่มเรียน (Start) *</Label>
          <Input 
            id="startTime" 
            type="time" 
            required 
            value={startTime} 
            onChange={e => setStartTime(e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">เวลาสิ้นสุด (End) *</Label>
          <Input 
            id="endTime" 
            type="time" 
            required 
            value={endTime} 
            onChange={e => setEndTime(e.target.value)} 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>สีป้ายกิจกรรม (Label Color)</Label>
        <div className="flex gap-2 pt-1">
          {colorOptions.map(c => (
            <button
              key={c}
              type="button"
              className={`h-7 w-7 rounded-lg transition-transform ${color === c ? "scale-110 ring-2 ring-white/40" : "hover:scale-105"}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "แก้ไขรายการตารางเวลา" : "เพิ่มลงในตารางเวลา"}
      </Button>
    </form>
  )
}
