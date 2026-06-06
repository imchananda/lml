"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type BodyMetric = {
  id?: string
  date?: string | Date
  weightKg: number
  bodyFatPct?: number | null
  muscleMassKg?: number | null
  note?: string | null
}

export function BodyMetricForm({ 
  onSuccess, 
  initialData 
}: { 
  onSuccess?: () => void
  initialData?: BodyMetric | null 
}) {
  const [loading, setLoading] = useState(false)

  const defaultDate = initialData?.date
    ? new Date(initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    
    const bodyFat = fd.get("bodyFatPct")
    const muscleMass = fd.get("muscleMassKg")

    try {
      const res = await fetch("/api/health/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          date: fd.get("date"),
          weightKg: Number(fd.get("weightKg")),
          bodyFatPct: bodyFat ? Number(bodyFat) : null,
          muscleMassKg: muscleMass ? Number(muscleMass) : null,
          note: fd.get("note") || null
        })
      })

      if (!res.ok) throw new Error()
      toast.success("บันทึกน้ำหนักเรียบร้อยแล้ว! ⚖️")
      if (onSuccess) onSuccess()
    } catch {
      toast.error("บันทึกข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form key={initialData?.id || "new"} onSubmit={onSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">วันที่ชั่งน้ำหนัก</Label>
          <Input id="date" name="date" type="date" required defaultValue={defaultDate} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weightKg">น้ำหนัก (กิโลกรัม) *</Label>
          <Input id="weightKg" name="weightKg" type="number" step="any" required min="1" max="500" defaultValue={initialData?.weightKg || ""} placeholder="e.g. 72.5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bodyFatPct">ไขมันในร่างกาย (%)</Label>
          <Input id="bodyFatPct" name="bodyFatPct" type="number" step="any" min="0" max="100" defaultValue={initialData?.bodyFatPct ?? ""} placeholder="e.g. 18.5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="muscleMassKg">มวลกล้ามเนื้อ (กก.)</Label>
          <Input id="muscleMassKg" name="muscleMassKg" type="number" step="any" min="0" max="200" defaultValue={initialData?.muscleMassKg ?? ""} placeholder="e.g. 58.2" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">บันทึกเพิ่มเติม</Label>
        <Input id="note" name="note" defaultValue={initialData?.note || ""} placeholder="เช่น ชั่งตอนเช้าหลังตื่นนอน..." />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        บันทึกน้ำหนัก (Save Metric)
      </Button>
    </form>
  )
}
