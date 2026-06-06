"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const assetTypes = [
  { value: "STOCK", label: "หุ้น" },
  { value: "ETF", label: "ETF" },
  { value: "MUTUAL_FUND", label: "กองทุนรวม" },
  { value: "GOLD", label: "ทองคำ" },
  { value: "CRYPTO", label: "คริปโต" },
  { value: "BOND", label: "พันธบัตร" },
  { value: "REAL_ESTATE", label: "อสังหาริมทรัพย์" },
  { value: "OTHER", label: "อื่นๆ" },
]

export function InvestmentForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [assetType, setAssetType] = useState("STOCK")

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      const quantity = Number(fd.get("quantity"))
      const price = Number(fd.get("price"))
      const res = await fetch("/api/finance/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          ticker: fd.get("ticker") || undefined,
          assetType,
          quantity,
          costBasis: quantity * price,
          currentPrice: price,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Investment added!")
      router.refresh()
      if (onSuccess) onSuccess()
    } catch {
      toast.error("Failed to save investment.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ชื่อสินทรัพย์ / Name</Label>
          <Input name="name" required placeholder="e.g. S&P 500 ETF" />
        </div>
        <div className="space-y-2">
          <Label>ตัวย่อ / Ticker</Label>
          <Input name="ticker" placeholder="e.g. SPY" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">ระบุชื่อและสัญลักษณ์ตัวย่อของสินทรัพย์</p>
      
      <div className="space-y-2 mt-2">
        <Label>ประเภทสินทรัพย์ / Asset Type</Label>
        <p className="text-xs text-muted-foreground">ระบบจะใช้จัดกลุ่มเพื่อคำนวณการกระจายความเสี่ยง</p>
        <Select value={assetType} onValueChange={(val) => setAssetType(val || '')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {assetTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>จำนวนหน่วย / Quantity</Label>
          <Input name="quantity" type="number" step="0.0001" required placeholder="10" />
        </div>
        <div className="space-y-2">
          <Label>ราคาต่อหน่วย (฿)</Label>
          <Input name="price" type="number" step="0.01" required placeholder="1500" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">กรอกจำนวนหน่วยที่มี และราคาที่ซื้อมา/ราคาตลาดปัจจุบัน เพื่อคำนวณมูลค่ารวม</p>
      <Button type="submit" disabled={loading} className="w-full mt-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white h-12 rounded-xl shadow-lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Add Investment
      </Button>
    </form>
  )
}
