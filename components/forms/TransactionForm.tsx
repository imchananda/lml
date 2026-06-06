"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react"

export function TransactionForm({ onSuccess, initialData }: { onSuccess?: () => void, initialData?: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{id: string, name: string, type: string}[]>([])
  const [type, setType] = useState<"EXPENSE" | "INCOME">(initialData?.type || "EXPENSE")
  const [categoryId, setCategoryId] = useState(initialData?.category?.id || initialData?.categoryId || "")

  const defaultAmount = initialData?.amount || ""
  const defaultName = initialData?.description || ""
  const defaultDate = initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetch('/api/finance/categories')
      .then(r => r.json())
      .then((cats: {id: string, name: string, type: string}[]) => {
        setCategories(cats)
      })
      .catch(() => {})
  }, [])

  const filtered = categories.filter(c => c.type === type)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get("amount"))
    const name = formData.get("name") as string
    const date = formData.get("date") as string

    try {
      const isEdit = !!initialData?.id
      const res = await fetch("/api/finance/transactions", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: initialData?.id,
          amount, 
          type, 
          description: name, 
          categoryId: categoryId || undefined, 
          date 
        }),
      })

      if (!res.ok) throw new Error("Failed to save")
      toast.success(isEdit ? "อัปเดตข้อมูลสำเร็จ!" : "Transaction added!")
      router.refresh()
      if (onSuccess) onSuccess()
    } catch {
      toast.error("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button type="button" onClick={() => setType("EXPENSE")}
          className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${type === "EXPENSE" ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"}`}>
          <ArrowDownRight className="h-5 w-5" /><span className="font-semibold">Expense</span>
        </button>
        <button type="button" onClick={() => setType("INCOME")}
          className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${type === "INCOME" ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"}`}>
          <ArrowUpRight className="h-5 w-5" /><span className="font-semibold">Income</span>
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">จำนวนเงิน / Amount (฿)</Label>
        <p className="text-xs text-muted-foreground">ระบุยอดเงินที่เป็นตัวเลขเท่านั้น</p>
        <Input id="amount" name="amount" type="number" step="0.01" required defaultValue={defaultAmount} placeholder="0.00" className="text-lg font-semibold h-12" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">รายละเอียด / Description</Label>
        <p className="text-xs text-muted-foreground">บันทึกช่วยจำว่าเงินก้อนนี้ใช้ทำอะไร (เช่น ค่ากาแฟ, เงินเดือน)</p>
        <Input id="name" name="name" required defaultValue={defaultName} placeholder="What was this for?" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>หมวดหมู่ / Category</Label>
          <p className="text-xs text-muted-foreground">เลือกเพื่อใช้ดูสถิติ</p>
          <Select value={categoryId} onValueChange={(val) => setCategoryId(val || '')}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {filtered.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" required defaultValue={defaultDate} />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-12 rounded-xl shadow-lg shadow-emerald-500/20">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {initialData?.id ? "บันทึกการแก้ไข (Update)" : "Save Transaction"}
      </Button>
    </form>
  )
}
