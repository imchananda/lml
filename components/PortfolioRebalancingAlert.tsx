import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, TrendingUp, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type AssetType = 'STOCK' | 'ETF' | 'MUTUAL_FUND' | 'GOLD' | 'CRYPTO' | 'BOND' | 'REAL_ESTATE' | 'OTHER'

export function PortfolioRebalancingAlert({ currentAllocation }: { currentAllocation: Record<string, number> }) {
  const [targetAllocation, setTargetAllocation] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchTarget = async () => {
    try {
      const res = await fetch('/api/finance/investments/allocation')
      if (res.ok) setTargetAllocation(await res.json())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTarget()
  }, [])

  const handleSaveTarget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const payload: Record<string, number> = {}
    let total = 0
    
    ;['STOCK', 'BOND', 'CASH', 'REAL_ESTATE', 'GOLD', 'CRYPTO'].forEach(type => {
      const val = Number(fd.get(type) || 0)
      payload[type] = val
      total += val
    })

    if (total !== 100) {
      toast.error(`สัดส่วนรวมต้องเท่ากับ 100% (ปัจจุบัน: ${total}%)`)
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/finance/investments/allocation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        toast.success('บันทึกสัดส่วนเป้าหมายแล้ว')
        setTargetAllocation(payload)
        setOpen(false)
      } else {
        const data = await res.json()
        toast.error(data.error || 'บันทึกไม่สำเร็จ')
      }
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด')
    }
    setSaving(false)
  }

  if (loading) return null

  // Calculate deviations
  const deviations: { type: string; diff: number; action: string; current: number; target: number }[] = []
  
  // Maps our simple target asset classes to the actual asset types
  const mapActualToTarget = (actualType: string) => {
    if (['STOCK', 'ETF', 'MUTUAL_FUND'].includes(actualType)) return 'STOCK'
    return actualType
  }

  // Aggregate current allocation
  const aggregatedCurrent: Record<string, number> = {}
  Object.keys(currentAllocation).forEach(type => {
    const tGroup = mapActualToTarget(type)
    aggregatedCurrent[tGroup] = (aggregatedCurrent[tGroup] || 0) + currentAllocation[type]
  })

  // Compare
  Object.keys(targetAllocation).forEach(type => {
    const target = targetAllocation[type] || 0
    const current = aggregatedCurrent[type] || 0
    const diff = current - target
    
    // Alert if absolute deviation is > 5%
    if (Math.abs(diff) >= 5) {
      deviations.push({
        type,
        diff,
        current,
        target,
        action: diff > 0 ? 'SELL' : 'BUY'
      })
    }
  })

  return (
    <Card className={`glass-card shadow-lg ${deviations.length > 0 ? 'shadow-amber-500/5 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent' : 'shadow-emerald-500/5 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent'}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${deviations.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          <AlertTriangle className="h-4 w-4" /> 
          แจ้งเตือนปรับสมดุลพอร์ต (Rebalancing Alert)
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" />}>
            <Settings className="h-3.5 w-3.5 mr-1" /> ตั้งค่าเป้าหมาย
          </DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>กำหนดสัดส่วนเป้าหมาย (Target Allocation)</DialogTitle>
              <DialogDescription>
                กำหนดสัดส่วนที่คุณต้องการให้รวมกันได้ 100% เพื่อใช้คำนวณการ Rebalance
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveTarget} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                {['STOCK', 'BOND', 'CASH', 'REAL_ESTATE', 'GOLD', 'CRYPTO'].map(type => (
                  <div key={type} className="space-y-1">
                    <Label className="text-xs">{type}</Label>
                    <div className="relative">
                      <Input name={type} type="number" defaultValue={targetAllocation[type] || 0} min={0} max={100} />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึกเป้าหมาย
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {deviations.length === 0 ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            ✨ สัดส่วนพอร์ตปัจจุบันของคุณอยู่ในเกณฑ์เป้าหมายที่ตั้งไว้ (ไม่มีสินทรัพย์ใดเบี่ยงเบนเกิน 5%)
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              พบว่าสัดส่วนพอร์ตปัจจุบันเบี่ยงเบนจากเป้าหมายที่ตั้งไว้เกิน 5% ควรพิจารณาปรับพอร์ตดังนี้:
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {deviations.map((dev, i) => (
                <div key={i} className={`p-3 rounded-lg flex justify-between items-center border ${dev.action === 'SELL' ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                  <div>
                    <span className="font-bold">{dev.type}</span>
                    <p className="text-xs text-muted-foreground">เป้าหมาย: {dev.target.toFixed(1)}% | ปัจจุบัน: <span className={dev.action === 'SELL' ? 'text-red-500' : 'text-emerald-500'}>{dev.current.toFixed(1)}%</span></p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${dev.action === 'SELL' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {dev.action === 'SELL' ? `ลดสัดส่วนลง ${dev.diff.toFixed(1)}%` : `เพิ่มสัดส่วนขึ้น ${Math.abs(dev.diff).toFixed(1)}%`}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
