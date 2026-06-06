"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function CreditScoreForm({ onSuccess, initialScore, initialDate }: { onSuccess?: () => void, initialScore?: number | null, initialDate?: string | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const defaultDate = initialDate 
    ? new Date(initialDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    
    try {
      const res = await fetch("/api/finance/credit-bureau/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditScore: Number(fd.get("creditScore")),
          creditScoreDate: fd.get("creditScoreDate"),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("บันทึกคะแนนเครดิตแล้ว")
      router.refresh()
      if (onSuccess) onSuccess()
    } catch {
      toast.error("ไม่สามารถบันทึกข้อมูลได้")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>คะแนนเครดิต (Credit Score)</Label>
        <p className="text-xs text-muted-foreground">ระบุคะแนนตามที่ปรากฏในรายงาน (300-900)</p>
        <Input name="creditScore" type="number" min="300" max="900" required defaultValue={initialScore || ""} placeholder="e.g. 750" />
      </div>
      
      <div className="space-y-2">
        <Label>วันที่อัพเดทข้อมูล</Label>
        <Input name="creditScoreDate" type="date" required defaultValue={defaultDate} />
      </div>

      <Button type="submit" disabled={loading} className="w-full mt-4 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white h-12 rounded-xl shadow-lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        บันทึกคะแนน (Save Score)
      </Button>
    </form>
  )
}
