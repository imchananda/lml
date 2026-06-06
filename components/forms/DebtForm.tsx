"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const debtTypes = [
  { value: "CREDIT_CARD", label: "บัตรเครดิต" },
  { value: "PERSONAL_LOAN", label: "สินเชื่อส่วนบุคคล" },
  { value: "MORTGAGE", label: "สินเชื่อบ้าน" },
  { value: "CAR_LOAN", label: "สินเชื่อรถยนต์" },
  { value: "STUDENT_LOAN", label: "กยศ." },
  { value: "OTHER", label: "อื่นๆ" },
]

export function DebtForm({ onSuccess, initialData }: { onSuccess?: () => void, initialData?: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [debtType, setDebtType] = useState(initialData?.type || "CREDIT_CARD")

  const defaultName = initialData?.name || ""
  const defaultTotal = initialData?.totalAmount || ""
  const defaultBalance = initialData?.currentBalance || ""
  const defaultRate = initialData?.interestRate || ""
  const defaultMinPay = initialData?.minimumPayment || ""
  const defaultDueDate = initialData?.dueDate || ""
  
  // Handle asOfDate (YYYY-MM-DD for input type="date")
  let defaultAsOfDate = new Date().toISOString().split('T')[0]
  if (initialData?.asOfDate) {
    defaultAsOfDate = new Date(initialData.asOfDate).toISOString().split('T')[0]
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      const isEdit = !!initialData?.id
      const res = await fetch("/api/finance/debt", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          name: fd.get("name"),
          type: debtType,
          totalAmount: Number(fd.get("totalAmount")),
          currentBalance: Number(fd.get("currentBalance")),
          interestRate: Number(fd.get("interestRate")),
          minimumPayment: Number(fd.get("minimumPayment")),
          dueDate: fd.get("dueDate") ? Number(fd.get("dueDate")) : null,
          asOfDate: fd.get("asOfDate")
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(initialData?.id ? "อัปเดตข้อมูลหนี้สินแล้ว" : "บันทึกหนี้สินใหม่แล้ว")
      router.refresh()
      if (onSuccess) onSuccess()
    } catch {
      toast.error("Failed to save debt.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>ชื่อหนี้สิน / Debt Name</Label>
        <p className="text-xs text-muted-foreground">ระบุชื่อหนี้สิน (เช่น บัตรเครดิต KTC, สินเชื่อบ้าน)</p>
        <Input name="name" required defaultValue={defaultName} placeholder="e.g. Krungthai Credit Card" />
      </div>
      <div className="space-y-2">
        <Label>ประเภท / Type</Label>
        <p className="text-xs text-muted-foreground">ระบบจะใช้ประเภทเพื่อประเมินความเสี่ยง</p>
        <Select value={debtType} onValueChange={(val) => setDebtType(val || '')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {debtTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ยอดกู้รวม / Total (฿)</Label>
          <Input name="totalAmount" type="number" required defaultValue={defaultTotal} placeholder="100000" />
        </div>
        <div className="space-y-2">
          <Label>ยอดคงค้าง / Balance (฿)</Label>
          <Input name="currentBalance" type="number" required defaultValue={defaultBalance} placeholder="85000" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">ระบุยอดหนี้เดิมทั้งหมด และ ยอดที่ยังเหลือต้องจ่ายในปัจจุบัน</p>
      
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="space-y-2">
          <Label>ดอกเบี้ย (% ต่อปี)</Label>
          <Input name="interestRate" type="number" step="0.01" required defaultValue={defaultRate} placeholder="16.0" />
        </div>
        <div className="space-y-2">
          <Label>จ่ายขั้นต่ำ (฿/เดือน)</Label>
          <Input name="minimumPayment" type="number" required defaultValue={defaultMinPay} placeholder="2500" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">ดอกเบี้ยแบบ APR (%) และ ยอดขั้นต่ำที่คุณต้องจ่ายทุกเดือน</p>
      
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="space-y-2">
          <Label>Due Date (Day of Month)</Label>
          <Input name="dueDate" type="number" min="1" max="31" defaultValue={defaultDueDate} placeholder="25" />
        </div>
        <div className="space-y-2">
          <Label>ยอดของวันที่ (As of Date)</Label>
          <Input name="asOfDate" type="date" required defaultValue={defaultAsOfDate} />
        </div>
      </div>
      
      <Button type="submit" disabled={loading} className="w-full mt-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white h-12 rounded-xl shadow-lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {initialData?.id ? "บันทึกการแก้ไข (Update)" : "Add Debt"}
      </Button>
    </form>
  )
}
