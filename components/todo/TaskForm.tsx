"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type Category = {
  id: string
  name: string
  color: string
}

type TaskData = {
  id?: string
  title: string
  description?: string | null
  date?: string | Date
  dueTime?: string | null
  priority: "LOW" | "MEDIUM" | "HIGH"
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  categoryId?: string | null
  isRecurring?: boolean
  recurFrequency?: "DAILY" | "WEEKLY" | "MONTHLY" | null
}

export function TaskForm({
  onSuccess,
  initialData,
  selectedDate
}: {
  onSuccess?: () => void
  initialData?: TaskData | null
  selectedDate?: string
}) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  
  // Form States
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [dueTime, setDueTime] = useState(initialData?.dueTime || "")
  const [priority, setPriority] = useState<TaskData["priority"]>(initialData?.priority || "MEDIUM")
  const [status, setStatus] = useState<TaskData["status"]>(initialData?.status || "PENDING")
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId || "none")
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false)
  const [recurFrequency, setRecurFrequency] = useState<string>(initialData?.recurFrequency || "DAILY")

  const defaultDate = initialData?.date
    ? new Date(initialData.date).toISOString().split('T')[0]
    : selectedDate || new Date().toISOString().split('T')[0]

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/todo/categories")
        if (res.ok) {
          setCategories(await res.json())
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchCategories()
  }, [])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title) {
      toast.error("กรุณาระบุชื่อรายการงาน")
      return
    }

    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      const res = await fetch("/api/todo/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          title,
          description: description || null,
          date: fd.get("date"),
          dueTime: dueTime || null,
          priority,
          status,
          categoryId: categoryId === "none" ? null : categoryId,
          isRecurring,
          recurFrequency: isRecurring ? recurFrequency : null
        })
      })

      if (!res.ok) throw new Error()
      toast.success(initialData ? "อัปเดตงานสำเร็จ!" : "เพิ่มงานใหม่เข้าลิตส์แล้ว! ✅")
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
        <Label htmlFor="title">ชื่องาน / รายการที่ต้องทำ *</Label>
        <Input 
          id="title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          required 
          placeholder="e.g. ส่งรายงานการประชุม, ไปวิ่งออกกำลังกาย..." 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">คำอธิบายเพิ่มเติม</Label>
        <Input 
          id="description" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          placeholder="ระบุโน้ตย่อหรือรายละเอียดงาน" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">วันที่ทำรายการ</Label>
          <Input id="date" name="date" type="date" required defaultValue={defaultDate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueTime">เวลาแจ้งเตือน (Due Time)</Label>
          <Input 
            id="dueTime" 
            type="time" 
            value={dueTime} 
            onChange={e => setDueTime(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-2 col-span-2">
          <Label htmlFor="categoryId">หมวดหมู่งาน (Category)</Label>
          <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "none")}>
            <SelectTrigger id="categoryId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">ไม่ระบุหมวดหมู่ (None)</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">ความสำคัญ</Label>
          <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">ต่ำ</SelectItem>
              <SelectItem value="MEDIUM">ปกติ</SelectItem>
              <SelectItem value="HIGH">สูง</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {initialData && (
        <div className="space-y-2">
          <Label htmlFor="status">สถานะงาน</Label>
          <Select value={status} onValueChange={(val: any) => setStatus(val)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">ยังไม่ทำ (Pending)</SelectItem>
              <SelectItem value="IN_PROGRESS">กำลังดำเนินงาน (In Progress)</SelectItem>
              <SelectItem value="COMPLETED">เสร็จสิ้นแล้ว (Completed)</SelectItem>
              <SelectItem value="CANCELLED">ยกเลิก (Cancelled)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Recurring Tasks Option */}
      <div className="border border-white/5 p-3 rounded-xl bg-black/5 dark:bg-white/5 space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="isRecurring"
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 bg-secondary"
          />
          <Label htmlFor="isRecurring" className="text-xs font-bold text-muted-foreground cursor-pointer hover:text-foreground">
            ตั้งเป็นงานที่เกิดซ้ำต่อเนื่อง (Recurring Task)
          </Label>
        </div>
        {isRecurring && (
          <div className="pt-1 space-y-1">
            <Label htmlFor="recurFrequency" className="text-[10px] uppercase font-bold text-muted-foreground">ความถี่ในการทำซ้ำ</Label>
            <Select value={recurFrequency} onValueChange={(val) => setRecurFrequency(val || "DAILY")}>
              <SelectTrigger id="recurFrequency" className="h-8 text-xs bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="DAILY">ทุกวัน (Daily)</SelectItem>
                <SelectItem value="WEEKLY">ทุกสัปดาห์ (Weekly)</SelectItem>
                <SelectItem value="MONTHLY">ทุกเดือน (Monthly)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-violet-500 hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "บันทึกการแก้ไขรายการงาน" : "ยืนยันการเพิ่มงานลงในตาราง"}
      </Button>
    </form>
  )
}
