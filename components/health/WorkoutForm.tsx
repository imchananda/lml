"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type WorkoutLog = {
  id?: string
  date?: string | Date
  workoutType: "CARDIO" | "STRENGTH" | "FLEXIBILITY" | "SPORTS" | "OTHER"
  name: string
  durationMinutes: number
  caloriesBurned?: number | null
  sets?: number | null
  reps?: number | null
  weightKg?: number | null
  note?: string | null
}

export function WorkoutForm({ 
  onSuccess, 
  initialData 
}: { 
  onSuccess?: () => void
  initialData?: WorkoutLog | null 
}) {
  const [loading, setLoading] = useState(false)
  const [workoutType, setWorkoutType] = useState<WorkoutLog["workoutType"]>(initialData?.workoutType || "CARDIO")

  const defaultDate = initialData?.date
    ? new Date(initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    
    const calBurned = fd.get("caloriesBurned")
    const sets = fd.get("sets")
    const reps = fd.get("reps")
    const weight = fd.get("weightKg")

    try {
      const res = await fetch("/api/health/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          date: fd.get("date"),
          workoutType,
          name: fd.get("name"),
          durationMinutes: Number(fd.get("durationMinutes")),
          caloriesBurned: calBurned ? Number(calBurned) : null,
          sets: sets ? Number(sets) : null,
          reps: reps ? Number(reps) : null,
          weightKg: weight ? Number(weight) : null,
          note: fd.get("note") || null
        })
      })

      if (!res.ok) throw new Error()
      toast.success("บันทึกการออกกำลังกายเรียบร้อยแล้ว! 🏋️‍♂️")
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
          <Label htmlFor="date">วันที่ออกกำลังกาย</Label>
          <Input id="date" name="date" type="date" required defaultValue={defaultDate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workoutType">ประเภทกิจกรรม</Label>
          <Select value={workoutType} onValueChange={(val: any) => setWorkoutType(val)}>
            <SelectTrigger id="workoutType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CARDIO">คาร์ดิโอ (Cardio)</SelectItem>
              <SelectItem value="STRENGTH">เวทเทรนนิ่ง (Strength)</SelectItem>
              <SelectItem value="FLEXIBILITY">ยืดเหยียด/โยคะ (Flexibility)</SelectItem>
              <SelectItem value="SPORTS">กีฬา (Sports)</SelectItem>
              <SelectItem value="OTHER">อื่นๆ (Other)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">ชื่อกิจกรรม / ท่าฝึก *</Label>
          <Input id="name" name="name" type="text" required defaultValue={initialData?.name || ""} placeholder="e.g. วิ่งลู่, Bench Press..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">ระยะเวลา (นาที) *</Label>
          <Input id="durationMinutes" name="durationMinutes" type="number" required min="1" max="1440" defaultValue={initialData?.durationMinutes || ""} placeholder="e.g. 45" />
        </div>
      </div>

      {workoutType === "STRENGTH" ? (
        <div className="border border-white/10 dark:border-white/5 p-4 rounded-xl space-y-3 bg-black/5 dark:bg-white/5">
          <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">บันทึกเวทเทรนนิ่ง (Strength Set Details)</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="sets" className="text-xs">เซ็ต (Sets)</Label>
              <Input id="sets" name="sets" type="number" min="0" defaultValue={initialData?.sets ?? ""} placeholder="e.g. 4" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reps" className="text-xs">ครั้ง (Reps)</Label>
              <Input id="reps" name="reps" type="number" min="0" defaultValue={initialData?.reps ?? ""} placeholder="e.g. 12" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="weightKg" className="text-xs">น้ำหนัก (กก.)</Label>
              <Input id="weightKg" name="weightKg" type="number" step="any" min="0" defaultValue={initialData?.weightKg ?? ""} placeholder="e.g. 50" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="caloriesBurned">พลังงานที่เผาผลาญ (แคลอรี / kcal)</Label>
          <Input id="caloriesBurned" name="caloriesBurned" type="number" min="0" defaultValue={initialData?.caloriesBurned ?? ""} placeholder="e.g. 300 (เว้นว่างได้)" />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">บันทึกเพิ่มเติม</Label>
        <Input id="note" name="note" defaultValue={initialData?.note || ""} placeholder="เช่น วิ่งลมแรงมาก, อัพน้ำหนักได้อีก..." />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        บันทึกการออกกำลังกาย (Save Workout)
      </Button>
    </form>
  )
}
