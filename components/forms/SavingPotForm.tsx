"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const terms = [
  { value: "SHORT", label: "ระยะสั้น (< 1 ปี)" },
  { value: "MEDIUM", label: "ระยะกลาง (1-3 ปี)" },
  { value: "LONG", label: "ระยะยาว (> 3 ปี)" },
]

export function SavingPotForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [term, setTerm] = useState("SHORT")

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      const res = await fetch("/api/finance/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          targetAmount: Number(fd.get("targetAmount")),
          term,
          targetDate: fd.get("targetDate") || undefined,
          autoSaveAmount: fd.get("autoSave") ? Number(fd.get("autoSave")) : undefined,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Saving pot created!")
      router.refresh()
      if (onSuccess) onSuccess()
    } catch {
      toast.error("Failed to create saving pot.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>ชื่อกระปุก / Pot Name</Label>
        <p className="text-xs text-muted-foreground">ตั้งเป้าหมายของการเก็บเงินก้อนนี้ (เช่น ทริปญี่ปุ่น, เงินสำรองฉุกเฉิน)</p>
        <Input name="name" required placeholder="e.g. Japan Trip" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ยอดเป้าหมาย (฿)</Label>
          <p className="text-xs text-muted-foreground">จำนวนเงินที่ต้องการเก็บ</p>
          <Input name="targetAmount" type="number" required placeholder="50000" />
        </div>
        <div className="space-y-2">
          <Label>ระยะเวลาเก็บ / Term</Label>
          <Select value={term} onValueChange={(val) => setTerm(val || '')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {terms.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Target Date</Label>
          <Input name="targetDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label>Auto-Save (฿/month)</Label>
          <Input name="autoSave" type="number" placeholder="2000" />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white h-12 rounded-xl shadow-lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create Pot
      </Button>
    </form>
  )
}
