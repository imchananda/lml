"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const accountTypes = [
  { value: "CREDIT_CARD", label: "บัตรเครดิต" },
  { value: "PERSONAL_LOAN", label: "สินเชื่อส่วนบุคคล" },
  { value: "MORTGAGE", label: "สินเชื่อบ้าน" },
  { value: "CAR_LOAN", label: "สินเชื่อรถยนต์" },
  { value: "STUDENT_LOAN", label: "กยศ." },
  { value: "OVERDRAFT", label: "วงเงินเบิกเกินบัญชี (O/D)" },
  { value: "HIRE_PURCHASE", label: "เช่าซื้อ" },
  { value: "OTHER", label: "อื่นๆ" },
]

const statusOptions = [
  { value: "NORMAL", label: "ปกติ" },
  { value: "DELINQUENT", label: "ค้างชำระ" },
  { value: "CLOSED", label: "ปิดแล้ว" },
  { value: "WRITTEN_OFF", label: "ตัดหนี้สูญ" },
  { value: "RESTRUCTURED", label: "ปรับโครงสร้าง" },
]

export function CreditBureauForm({
  onSuccess,
  initialData,
  existingAccounts,
}: {
  onSuccess?: () => void
  initialData?: any
  existingAccounts?: any[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [accountType, setAccountType] = useState(initialData?.accountType || "CREDIT_CARD")
  const [status, setStatus] = useState(initialData?.status || "NORMAL")

  // Controlled state inputs to support prefilling from existing accounts
  const [accountName, setAccountName] = useState(initialData?.accountName || "")
  const [lender, setLender] = useState(initialData?.lender || "")
  const [creditLimit, setCreditLimit] = useState(initialData?.creditLimit ?? "")
  const [outstandingBalance, setOutstandingBalance] = useState(initialData?.outstandingBalance ?? "")
  const [monthlyPayment, setMonthlyPayment] = useState(initialData?.monthlyPayment ?? "")
  const [accountOpenDate, setAccountOpenDate] = useState(
    initialData?.accountOpenDate
      ? new Date(initialData.accountOpenDate).toISOString().split('T')[0]
      : ""
  )
  const [notes, setNotes] = useState(initialData?.notes || "")

  const defaultReportDate = initialData?.reportDate
    ? new Date(initialData.reportDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const defaultInquiryDate = initialData?.inquiryDate
    ? new Date(initialData.inquiryDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const handleSelectExisting = (accId: string | null) => {
    if (!accId) return
    const acc = existingAccounts?.find(a => a.id === accId)
    if (acc) {
      setAccountName(acc.accountName || "")
      setAccountType(acc.accountType || "CREDIT_CARD")
      setStatus(acc.status || "NORMAL")
      setLender(acc.lender || "")
      setCreditLimit(acc.creditLimit ?? "")
      setOutstandingBalance(acc.outstandingBalance ?? "")
      setMonthlyPayment(acc.monthlyPayment ?? "")
      setAccountOpenDate(
        acc.accountOpenDate
          ? new Date(acc.accountOpenDate).toISOString().split('T')[0]
          : ""
      )
      setNotes(acc.notes || "")
      toast.info(`คัดลอกข้อมูลจาก ${acc.accountName} แล้ว`)
    }
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const isEdit = !!initialData?.id
      const res = await fetch("/api/finance/credit-bureau", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          accountName: fd.get("accountName"),
          accountType,
          lender: fd.get("lender"),
          creditLimit: fd.get("creditLimit") ? Number(fd.get("creditLimit")) : null,
          outstandingBalance: Number(fd.get("outstandingBalance")),
          monthlyPayment: Number(fd.get("monthlyPayment")) || 0,
          status,
          reportDate: fd.get("reportDate"),
          inquiryDate: fd.get("inquiryDate") || null,
          accountOpenDate: fd.get("accountOpenDate") || null,
          notes: fd.get("notes") || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(isEdit ? "อัปเดตข้อมูลเครดิตบูโรแล้ว" : "บันทึกรายการเครดิตบูโรใหม่แล้ว")
      router.refresh()
      if (onSuccess) onSuccess()
    } catch {
      toast.error("ไม่สามารถบันทึกข้อมูลได้")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
      {!initialData?.id && existingAccounts && existingAccounts.length > 0 && (
        <div className="space-y-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <Label className="text-violet-600 dark:text-violet-400 font-semibold">คัดลอกข้อมูลจากบัญชีเดิม</Label>
          <Select onValueChange={handleSelectExisting}>
            <SelectTrigger className="border-violet-500/30 rounded-xl">
              <SelectValue placeholder="เลือกบัญชีที่ต้องการคัดลอกข้อมูล..." />
            </SelectTrigger>
            <SelectContent className="glass-card">
              {existingAccounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.accountName} ({acc.lender})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">เลือกเพื่อดึงข้อมูล วงเงิน สถาบันการเงิน วันเปิดบัญชี ฯลฯ มากรอกให้อัตโนมัติ</p>
        </div>
      )}

      <div className="space-y-2">
        <Label>ชื่อบัญชี / Account Name</Label>
        <p className="text-xs text-muted-foreground">ระบุชื่อบัญชีตามที่ปรากฏในรายงานเครดิตบูโร</p>
        <Input name="accountName" required value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. บัตรเครดิต KTC" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ประเภทบัญชี</Label>
          <Select value={accountType} onValueChange={v => setAccountType(v || '')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {accountTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>สถานะบัญชี</Label>
          <Select value={status} onValueChange={v => setStatus(v || '')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>สถาบันการเงิน / Lender</Label>
        <Input name="lender" required value={lender} onChange={e => setLender(e.target.value)} placeholder="e.g. ธ.กสิกร, KTC" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>วงเงิน / Credit Limit (฿)</Label>
          <Input name="creditLimit" type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="200000" />
        </div>
        <div className="space-y-2">
          <Label>ยอดคงค้าง / Outstanding (฿)</Label>
          <Input name="outstandingBalance" type="number" required value={outstandingBalance} onChange={e => setOutstandingBalance(e.target.value)} placeholder="85000" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">ยอดหนี้คงค้างตามรายงานเครดิตบูโร (อัพเดทช้ากว่ายอด Debt ปัจจุบัน)</p>
      <div className="space-y-2">
        <Label>ยอดผ่อนชำระ / Monthly Payment (฿)</Label>
        <Input name="monthlyPayment" type="number" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} placeholder="5000" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>วันที่รายงาน / Report Date</Label>
          <Input name="reportDate" type="date" required defaultValue={defaultReportDate} />
        </div>
        <div className="space-y-2">
          <Label>วันที่สืบค้น / Inquiry Date</Label>
          <Input name="inquiryDate" type="date" defaultValue={defaultInquiryDate} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>วันที่เปิดบัญชี</Label>
          <Input name="accountOpenDate" type="date" value={accountOpenDate} onChange={e => setAccountOpenDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>หมายเหตุ / Notes</Label>
        <Input name="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="บันทึกเพิ่มเติม..." />
      </div>
      <Button type="submit" disabled={loading} className="w-full mt-4 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white h-12 rounded-xl shadow-lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {initialData?.id ? "บันทึกการแก้ไข (Update)" : "เพิ่มรายการ (Add)"}
      </Button>
    </form>
  )
}
