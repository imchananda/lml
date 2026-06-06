"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export function RecurringForm({ 
  onSuccess, 
  defaultType = "INCOME",
  initialData
}: { 
  onSuccess: () => void
  defaultType?: "INCOME" | "EXPENSE"
  initialData?: any
}) {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState(initialData?.type || defaultType)
  const [freq, setFreq] = useState(initialData?.frequency || "MONTHLY")
  const [categories, setCategories] = useState<{id: string, name: string, type: string}[]>([])
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "")

  const defaultName = initialData?.name || ""
  const defaultAmount = initialData?.amount || ""
  const defaultDayOfMonth = initialData?.dayOfMonth || ""

  useEffect(() => {
    fetch('/api/finance/categories')
      .then(r => r.json())
      .then(cats => setCategories(cats))
      .catch(() => {})
  }, [])

  const filteredCats = categories.filter(c => c.type === type)

  // Clear category if type changes and selected category doesn't belong to the new type
  useEffect(() => {
    if (categoryId && !categories.find(c => c.id === categoryId && c.type === type)) {
      setCategoryId("")
    }
  }, [type, categories, categoryId])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const isEdit = !!initialData?.id
      const res = await fetch('/api/finance/recurring', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: initialData?.id,
          name: fd.get('name'),
          amount: Number(fd.get('amount')),
          type,
          frequency: freq,
          dayOfMonth: fd.get('dayOfMonth') ? Number(fd.get('dayOfMonth')) : null,
          categoryId: categoryId === "none" ? null : (categoryId || null)
        }),
      })
      if (!res.ok) throw new Error()
      onSuccess()
    } catch {}
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>ชื่อรายการ / Name</Label>
        <p className="text-xs text-muted-foreground">ระบุชื่อรายการ (เช่น เงินเดือนบริษัท A, ค่าเช่าบ้าน)</p>
        <Input name="name" required defaultValue={defaultName} placeholder="e.g. Main Salary" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ประเภท / Type</Label>
          <Select value={type} onValueChange={(val) => setType(val as "INCOME"|"EXPENSE" || "INCOME")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INCOME">รายรับ (Income)</SelectItem>
              <SelectItem value="EXPENSE">รายจ่าย (Expense)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ยอดเงิน (฿) / Amount</Label>
          <Input name="amount" type="number" step="0.01" required defaultValue={defaultAmount} placeholder="50000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="space-y-2">
          <Label>ความถี่ / Frequency</Label>
          <Select value={freq} onValueChange={(val) => setFreq(val || 'MONTHLY')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">ทุกเดือน (Monthly)</SelectItem>
              <SelectItem value="YEARLY">ทุกปี (Yearly)</SelectItem>
              <SelectItem value="WEEKLY">ทุกสัปดาห์ (Weekly)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>วันที่ชำระ (1-31)</Label>
          <Input name="dayOfMonth" type="number" min="1" max="31" defaultValue={defaultDayOfMonth} placeholder="25" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>หมวดหมู่ / Category (Optional)</Label>
        <Select value={categoryId} onValueChange={(val) => setCategoryId(val === 'none' ? '' : val)}>
          <SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่ให้ตรงกับ Transaction" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-- ไม่มีหมวดหมู่ --</SelectItem>
            {filteredCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground mt-2">ระบุวันที่ของเดือนที่รับเงิน/จ่ายเงินประจำ (ใส่หรือไม่ใส่ก็ได้)</p>

      <Button type="submit" disabled={loading} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl shadow-lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {initialData?.id ? "บันทึกการแก้ไข (Update)" : "บันทึกรายการ"}
      </Button>
    </form>
  )
}
