"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type BodyMeasurement = {
  id?: string
  date?: string | Date
  waistCm?: number | null
  hipCm?: number | null
  chestCm?: number | null
  leftArmCm?: number | null
  rightArmCm?: number | null
  leftThighCm?: number | null
  rightThighCm?: number | null
  leftCalfCm?: number | null
  rightCalfCm?: number | null
  buttCm?: number | null
  neckCm?: number | null
  note?: string | null
}

export function MeasurementForm({ 
  onSuccess, 
  initialData 
}: { 
  onSuccess?: () => void
  initialData?: BodyMeasurement | null 
}) {
  const [loading, setLoading] = useState(false)

  const defaultDate = initialData?.date
    ? new Date(initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const getValue = (key: string) => {
      const val = fd.get(key)
      return val ? Number(val) : null
    }

    try {
      const res = await fetch("/api/health/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          date: fd.get("date"),
          waistCm: getValue("waistCm"),
          hipCm: getValue("hipCm"),
          chestCm: getValue("chestCm"),
          leftArmCm: getValue("leftArmCm"),
          rightArmCm: getValue("rightArmCm"),
          leftThighCm: getValue("leftThighCm"),
          rightThighCm: getValue("rightThighCm"),
          leftCalfCm: getValue("leftCalfCm"),
          rightCalfCm: getValue("rightCalfCm"),
          buttCm: getValue("buttCm"),
          neckCm: getValue("neckCm"),
          note: fd.get("note") || null
        })
      })

      if (!res.ok) throw new Error()
      toast.success("บันทึกสัดส่วนร่างกายเรียบร้อยแล้ว! 📏")
      if (onSuccess) onSuccess()
    } catch {
      toast.error("บันทึกสัดส่วนไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form key={initialData?.id || "new"} onSubmit={onSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="date">วันที่วัดสัดส่วน</Label>
        <Input id="date" name="date" type="date" required defaultValue={defaultDate} />
      </div>

      <div className="border border-white/10 dark:border-white/5 p-4 rounded-xl space-y-4 bg-black/5 dark:bg-white/5">
        <h3 className="font-semibold text-sm text-amber-600 dark:text-amber-400">สัดส่วนท่อนบน (Upper Body)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="chestCm" className="text-xs">รอบอก (ซม.)</Label>
            <Input id="chestCm" name="chestCm" type="number" step="any" min="0" defaultValue={initialData?.chestCm ?? ""} placeholder="e.g. 95" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="neckCm" className="text-xs">รอบคอ (ซม.)</Label>
            <Input id="neckCm" name="neckCm" type="number" step="any" min="0" defaultValue={initialData?.neckCm ?? ""} placeholder="e.g. 38" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="leftArmCm" className="text-xs">ต้นแขนซ้าย (ซม.)</Label>
            <Input id="leftArmCm" name="leftArmCm" type="number" step="any" min="0" defaultValue={initialData?.leftArmCm ?? ""} placeholder="e.g. 32" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rightArmCm" className="text-xs">ต้นแขนขวา (ซม.)</Label>
            <Input id="rightArmCm" name="rightArmCm" type="number" step="any" min="0" defaultValue={initialData?.rightArmCm ?? ""} placeholder="e.g. 32" />
          </div>
        </div>
      </div>

      <div className="border border-white/10 dark:border-white/5 p-4 rounded-xl space-y-4 bg-black/5 dark:bg-white/5">
        <h3 className="font-semibold text-sm text-amber-600 dark:text-amber-400">สัดส่วนท่อนกลางและล่าง (Mid & Lower Body)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="waistCm" className="text-xs">รอบเอว (ซม.)</Label>
            <Input id="waistCm" name="waistCm" type="number" step="any" min="0" defaultValue={initialData?.waistCm ?? ""} placeholder="e.g. 82" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hipCm" className="text-xs">รอบสะโพก (ซม.)</Label>
            <Input id="hipCm" name="hipCm" type="number" step="any" min="0" defaultValue={initialData?.hipCm ?? ""} placeholder="e.g. 96" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="buttCm" className="text-xs">รอบก้น (ซม.)</Label>
            <Input id="buttCm" name="buttCm" type="number" step="any" min="0" defaultValue={initialData?.buttCm ?? ""} placeholder="e.g. 98" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="leftThighCm" className="text-xs">ต้นขาซ้าย (ซม.)</Label>
            <Input id="leftThighCm" name="leftThighCm" type="number" step="any" min="0" defaultValue={initialData?.leftThighCm ?? ""} placeholder="e.g. 52" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rightThighCm" className="text-xs">ต้นขาขวา (ซม.)</Label>
            <Input id="rightThighCm" name="rightThighCm" type="number" step="any" min="0" defaultValue={initialData?.rightThighCm ?? ""} placeholder="e.g. 52" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="leftCalfCm" className="text-xs">น่องซ้าย (ซม.)</Label>
            <Input id="leftCalfCm" name="leftCalfCm" type="number" step="any" min="0" defaultValue={initialData?.leftCalfCm ?? ""} placeholder="e.g. 36" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rightCalfCm" className="text-xs">น่องขวา (ซม.)</Label>
            <Input id="rightCalfCm" name="rightCalfCm" type="number" step="any" min="0" defaultValue={initialData?.rightCalfCm ?? ""} placeholder="e.g. 36" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">บันทึกเพิ่มเติม</Label>
        <Input id="note" name="note" defaultValue={initialData?.note || ""} placeholder="เช่น วัดหลังตื่นนอนตอนเช้า..." />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        บันทึกสัดส่วน (Save Measurements)
      </Button>
    </form>
  )
}
