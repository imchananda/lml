"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, BarChart4, Bitcoin, Plus, Loader2, RefreshCw, ArrowUpRight, ArrowDownRight, Edit2, Trash2, LineChart, Coins, Building, FileText, Target, PieChart, Calculator } from "lucide-react"
import { PortfolioTreemap } from "@/components/charts/PortfolioTreemap"
import { PortfolioRebalancingAlert } from "@/components/PortfolioRebalancingAlert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts"

type AssetType = 'STOCK' | 'ETF' | 'MUTUAL_FUND' | 'GOLD' | 'CRYPTO' | 'BOND' | 'REAL_ESTATE' | 'OTHER'

type InvestmentTransaction = { id: string; type: 'BUY' | 'SELL'; quantity: number; price: number; fee: number; date: string; note: string }

type Investment = {
  id: string; name: string; ticker: string | null; assetType: AssetType
  quantity: number; costBasis: number; currentPrice: number | null
  currency: string; notes: string | null
  transactions: InvestmentTransaction[]
}

const assetIcons: Record<AssetType, any> = {
  STOCK: BarChart4, ETF: LineChart, MUTUAL_FUND: TrendingUp,
  GOLD: Coins, CRYPTO: Bitcoin, BOND: FileText,
  REAL_ESTATE: Building, OTHER: Target
}

const assetColors: Record<AssetType, string> = {
  STOCK: '#3b82f6', ETF: '#10b981', MUTUAL_FUND: '#8b5cf6',
  GOLD: '#f59e0b', CRYPTO: '#f97316', BOND: '#14b8a6',
  REAL_ESTATE: '#6366f1', OTHER: '#64748b'
}

const assetTypeLabels: Record<AssetType, string> = {
  STOCK: 'หุ้น (Stock)',
  ETF: 'กองทุนดัชนี (ETF)',
  MUTUAL_FUND: 'กองทุนรวม',
  GOLD: 'ทองคำ',
  CRYPTO: 'คริปโท',
  BOND: 'พันธบัตร/หุ้นกู้',
  REAL_ESTATE: 'อสังหาริมทรัพย์',
  OTHER: 'อื่นๆ',
}

export default function InvestmentsPage() {
  const [assets, setAssets] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  
  // Dialog States
  const [openNew, setOpenNew] = useState(false)
  const [editAsset, setEditAsset] = useState<Investment | null>(null)
  
  // Action States
  const [activeAsset, setActiveAsset] = useState<Investment | null>(null)
  const [actionType, setActionType] = useState<'BUY' | 'SELL' | 'UPDATE_PRICE' | null>(null)
  const [syncing, setSyncing] = useState(false)
  
  // Drill-down State
  const [drillDownAsset, setDrillDownAsset] = useState<Investment | null>(null)

  // DCA Planner State
  const [dcaMonthly, setDcaMonthly] = useState(5000)
  const [dcaYears, setDcaYears] = useState(10)
  const [dcaReturn, setDcaReturn] = useState(8)

  // DCA compound interest calculation: FV = PMT × ((1+r)^n − 1) / r
  const dcaProjection = useMemo(() => {
    const r = dcaReturn / 100 / 12
    return Array.from({ length: dcaYears }, (_, i) => {
      const n = (i + 1) * 12
      const fv = r === 0
        ? dcaMonthly * n
        : dcaMonthly * ((Math.pow(1 + r, n) - 1) / r)
      const invested = dcaMonthly * n
      return {
        year: `ปีที่ ${i + 1}`,
        มูลค่าพอร์ต: Math.round(fv),
        เงินลงทุนสะสม: Math.round(invested),
        กำไรสะสม: Math.round(fv - invested),
      }
    })
  }, [dcaMonthly, dcaYears, dcaReturn])

  const dcaFinal = dcaProjection[dcaProjection.length - 1]

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/investments')
      if (res.ok) setAssets(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSyncPrices = async () => {
    setSyncing(true)
    const toastId = toast.loading('กำลังอัปเดตราคาล่าสุดจากตลาดโลก (Market Data Sync)...')
    try {
      const res = await fetch('/api/finance/investments/sync', { method: 'POST' })
      const resData = await res.json()
      if (res.ok) {
        toast.success(`อัปเดตราคาสำเร็จ ${resData.updated} รายการ`, { id: toastId })
        fetchData()
      } else {
        throw new Error(resData.error || 'Failed')
      }
    } catch (e: any) {
      toast.error(`อัปเดตราคาไม่สำเร็จ: ${e.message}`, { id: toastId })
    }
    setSyncing(false)
  }

  const totalValue = assets.reduce((s, a) => s + ((a.currentPrice || (a.quantity > 0 ? a.costBasis/a.quantity : 0)) * a.quantity), 0)
  const totalCost = assets.reduce((s, a) => s + a.costBasis, 0)
  const totalPL = totalValue - totalCost
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0
  const isTotalPositive = totalPL >= 0

  const currentAllocationRecord = useMemo(() => {
    const alloc: Record<string, number> = {}
    if (totalValue === 0) return alloc;
    assets.forEach(asset => {
      const avgCost = asset.quantity > 0 ? asset.costBasis / asset.quantity : 0
      const currentPrice = asset.currentPrice || avgCost
      const val = currentPrice * asset.quantity
      if (!alloc[asset.assetType]) alloc[asset.assetType] = 0
      alloc[asset.assetType] += (val / totalValue) * 100
    })
    return alloc
  }, [assets, totalValue])

  const handleAssetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)
    const fd = new FormData(e.currentTarget)
    
    try {
      const payload = {
        id: editAsset?.id,
        name: fd.get('name'),
        ticker: fd.get('ticker') || null,
        assetType: fd.get('assetType'),
        quantity: Number(fd.get('quantity')),
        costBasis: Number(fd.get('costBasis')),
        currentPrice: fd.get('currentPrice') ? Number(fd.get('currentPrice')) : null,
      }
      
      const res = await fetch('/api/finance/investments', {
        method: editAsset ? 'PATCH' : 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      
      toast.success(editAsset ? 'อัปเดตสินทรัพย์สำเร็จ!' : 'เพิ่มสินทรัพย์ใหม่สำเร็จ!')
      setOpenNew(false)
      setEditAsset(null)
      fetchData()
    } catch { toast.error('เกิดข้อผิดพลาดในการบันทึกสินทรัพย์') }
    setFormLoading(false)
  }

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินทรัพย์นี้? (ประวัติการซื้อขายทั้งหมดจะถูกลบไปด้วย)')) return
    try {
      const res = await fetch(`/api/finance/investments?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('ลบสินทรัพย์สำเร็จ')
      fetchData()
    } catch { toast.error('ลบสินทรัพย์ไม่สำเร็จ') }
  }

  const handleActionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!activeAsset || !actionType) return
    setFormLoading(true)
    const fd = new FormData(e.currentTarget)
    
    try {
      if (actionType === 'UPDATE_PRICE') {
        const payload = { ...activeAsset, currentPrice: Number(fd.get('price')) }
        const res = await fetch('/api/finance/investments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.success('อัปเดตราคาตลาดสำเร็จ!')
      } else {
        const payload = {
          investmentId: activeAsset.id,
          type: actionType,
          quantity: Number(fd.get('quantity')),
          price: Number(fd.get('price')),
          fee: Number(fd.get('fee') || 0),
          date: new Date(fd.get('date') as string).toISOString(),
          note: fd.get('note')
        }
        const res = await fetch('/api/finance/investments/transactions', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed')
        }
        toast.success(actionType === 'BUY' ? 'บันทึกการซื้อสำเร็จ!' : 'บันทึกการขายสำเร็จ!')
      }
      
      setActiveAsset(null)
      setActionType(null)
      
      fetchData().then(() => {
        if (drillDownAsset) {
           fetch('/api/finance/investments').then(r => r.json()).then(data => {
              const updated = data.find((a: any) => a.id === drillDownAsset.id)
              if (updated) setDrillDownAsset(updated)
           })
        }
      })
    } catch (error: any) { 
      toast.error(error.message || 'เกิดข้อผิดพลาดในการทำรายการ') 
    }
    setFormLoading(false)
  }

  const handleDeleteTx = async (txId: string) => {
    if (!confirm('ยืนยันลบประวัติการเทรดนี้? (ระบบจะกู้คืนจำนวนหน่วยและต้นทุนให้อัตโนมัติ)')) return
    try {
      const res = await fetch(`/api/finance/investments/transactions?id=${txId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('ลบรายการสำเร็จ')
      fetchData().then(() => {
        if (drillDownAsset) {
           fetch('/api/finance/investments').then(r => r.json()).then(data => {
              const updated = data.find((a: any) => a.id === drillDownAsset.id)
              if (updated) setDrillDownAsset(updated)
           })
        }
      })
    } catch { toast.error('ลบรายการไม่สำเร็จ') }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gradient inline-block w-fit">Investment Portfolio 📈</h2>
          <p className="text-muted-foreground">ติดตามพอร์ตการลงทุนและกำไร/ขาดทุนแบบรวมศูนย์</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-white/10 bg-black/20" onClick={handleSyncPrices} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync ราคาล่าสุด
          </Button>
          <Dialog open={openNew} onOpenChange={(val) => { setOpenNew(val); if (!val) setEditAsset(null); }}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 shadow-md text-white" />}>
              <Plus className="mr-2 h-4 w-4" />เพิ่มสินทรัพย์ใหม่
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>{editAsset ? 'แก้ไขสินทรัพย์' : 'เพิ่มสินทรัพย์ (Initial Setup)'}</DialogTitle>
                <DialogDescription>ตั้งค่าข้อมูลเริ่มต้นของสินทรัพย์ที่คุณถืออยู่</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAssetSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ชื่อสินทรัพย์ / Name</Label>
                    <Input name="name" required defaultValue={editAsset?.name || ""} placeholder="เช่น PTT, Bitcoin" />
                  </div>
                  <div className="space-y-2">
                    <Label>ตัวย่อ / Ticker</Label>
                    <Input name="ticker" defaultValue={editAsset?.ticker || ""} placeholder="PTT, BTC" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>ประเภท / Asset Type</Label>
                  <Select name="assetType" defaultValue={editAsset?.assetType || 'STOCK'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STOCK">หุ้น (Stock)</SelectItem>
                      <SelectItem value="ETF">กองทุนรวมดัชนี (ETF)</SelectItem>
                      <SelectItem value="MUTUAL_FUND">กองทุนรวม (Mutual Fund)</SelectItem>
                      <SelectItem value="CRYPTO">คริปโทเคอร์เรนซี (Crypto)</SelectItem>
                      <SelectItem value="GOLD">ทองคำ (Gold)</SelectItem>
                      <SelectItem value="REAL_ESTATE">อสังหาริมทรัพย์ (Real Estate)</SelectItem>
                      <SelectItem value="BOND">พันธบัตร/หุ้นกู้ (Bond)</SelectItem>
                      <SelectItem value="OTHER">อื่นๆ (Other)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>จำนวนหน่วย / Quantity</Label>
                    <Input name="quantity" type="number" step="any" required defaultValue={editAsset?.quantity ?? ""} min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>ต้นทุนรวม (฿) / Total Cost</Label>
                    <Input name="costBasis" type="number" step="any" required defaultValue={editAsset?.costBasis ?? ""} min="0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ราคาตลาดต่อหน่วย (฿) / Current Price</Label>
                  <Input name="currentPrice" type="number" step="any" defaultValue={editAsset?.currentPrice ?? ""} min="0" placeholder="เว้นว่างได้" />
                </div>

                <Button type="submit" disabled={formLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl shadow-lg mt-4">
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editAsset ? 'อัปเดตข้อมูล' : 'บันทึกสินทรัพย์'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : (
        <>
          {assets.length > 0 && (
            <>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="col-span-full md:col-span-1 glass-card shadow-lg shadow-blue-500/5 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20">
                <CardHeader className="pb-2"><CardTitle className="text-lg text-blue-700 dark:text-blue-400">Total Portfolio Value</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-foreground">฿{totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                  <div className="flex flex-col gap-4 mt-4">
                     <div>
                        <p className="text-xs text-muted-foreground">ต้นทุนรวม (Total Cost)</p>
                        <p className="text-lg font-medium">฿{totalCost.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                     </div>
                     <div className="w-full h-px bg-border/50"></div>
                     <div>
                        <p className="text-xs text-muted-foreground">กำไร/ขาดทุนรวม (Total P/L)</p>
                        <div className="flex items-center gap-2">
                           <p className={`text-lg font-bold ${isTotalPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {isTotalPositive ? '+' : ''}฿{totalPL.toLocaleString(undefined, {maximumFractionDigits: 2})}
                           </p>
                           <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${isTotalPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                              {isTotalPositive ? '+' : ''}{totalPLPct.toFixed(2)}%
                           </span>
                        </div>
                     </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-full md:col-span-2 glass-card shadow-lg shadow-black/5">
                <CardHeader className="pb-2">
                   <CardTitle className="text-lg flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-indigo-500" />
                      การกระจายความเสี่ยง (Asset Allocation)
                   </CardTitle>
                   <CardDescription>สัดส่วนสินทรัพย์แยกตามประเภท (Treemap)</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                   <PortfolioTreemap data={assets} />
                </CardContent>
              </Card>

              <Card className="col-span-full md:col-span-1 glass-card shadow-lg shadow-black/5 flex flex-col">
                <CardHeader className="pb-2">
                   <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-fuchsia-500" />
                      สัดส่วนตามประเภท
                   </CardTitle>
                   <CardDescription>สรุปมูลค่าแยกตาม Asset Class</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1 overflow-y-auto max-h-[350px]">
                   <div className="space-y-4 pr-2">
                     {Object.entries(
                       assets.reduce((acc, asset) => {
                         const avgCost = asset.quantity > 0 ? asset.costBasis / asset.quantity : 0
                         const currentPrice = asset.currentPrice || avgCost
                         const val = currentPrice * asset.quantity
                         if (!acc[asset.assetType]) acc[asset.assetType] = 0
                         acc[asset.assetType] += val
                         return acc
                       }, {} as Record<string, number>)
                     )
                     .sort(([, a], [, b]) => b - a)
                     .map(([type, value]) => {
                       const pct = totalValue > 0 ? (value / totalValue) * 100 : 0
                       const color = assetColors[type as AssetType] || '#64748b'
                       return (
                         <div key={type} className="space-y-1">
                           <div className="flex justify-between items-center text-sm">
                             <div className="flex items-center gap-2 font-medium">
                               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                               {assetTypeLabels[type as AssetType] ?? type}
                             </div>
                             <span className="font-bold">฿{value.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs">
                             <div className="h-1.5 flex-1 mx-2 overflow-hidden rounded-full bg-secondary">
                               <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                             </div>
                             <span className="text-muted-foreground w-8 text-right">{pct.toFixed(1)}%</span>
                           </div>
                         </div>
                       )
                     })}
                   </div>
                </CardContent>
              </Card>
            </div>
            <PortfolioRebalancingAlert currentAllocation={currentAllocationRecord} />
            </>
          )}

          {assets.length === 0 ? (
            <div className="text-center text-muted-foreground py-16 flex flex-col items-center">
              <TrendingUp className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p>คุณยังไม่มีข้อมูลการลงทุนในพอร์ต เพิ่มสินทรัพย์แรกของคุณเลย!</p>
              <Button className="mt-4 bg-blue-600 text-white" onClick={() => setOpenNew(true)}>
                <Plus className="mr-2 h-4 w-4" /> เพิ่มสินทรัพย์
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
              {assets.map((asset) => {
                const avgCost = asset.quantity > 0 ? asset.costBasis / asset.quantity : 0
                const currentPrice = asset.currentPrice || avgCost
                const marketVal = currentPrice * asset.quantity
                const pl = marketVal - asset.costBasis
                const plPct = asset.costBasis > 0 ? (pl / asset.costBasis) * 100 : 0
                const isPositive = pl >= 0
                
                const Icon = assetIcons[asset.assetType] || TrendingUp
                const colorCode = assetColors[asset.assetType] || '#64748b'

                return (
                  <Card key={asset.id} className="glass-card hover-lift shadow-lg shadow-black/5 group relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: colorCode }} />
                    <CardHeader className="pb-0 flex flex-row items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => setDrillDownAsset(asset)}>
                         <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: colorCode + '20', color: colorCode }}>
                             <Icon className="h-5 w-5" />
                           </div>
                           <div>
                             <CardTitle className="text-base flex items-center gap-2 transition-colors hover:opacity-80">
                               {asset.name}
                             </CardTitle>
                             <p className="text-xs font-semibold text-muted-foreground mt-0.5">{asset.ticker || asset.assetType}</p>
                           </div>
                         </div>
                      </div>
                      <div className="flex gap-1 -mr-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-500" onClick={() => { setEditAsset(asset); setOpenNew(true); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500" onClick={() => handleDeleteAsset(asset.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Value Row */}
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-xs text-muted-foreground">Market Value</p>
                              <div className="text-xl font-bold">฿{marketVal.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                           </div>
                           <div className="text-right">
                              <div className={`text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {isPositive ? '+' : ''}฿{pl.toLocaleString(undefined, {maximumFractionDigits: 2})}
                              </div>
                              <div className={`text-xs font-semibold ${isPositive ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                                 ({isPositive ? '+' : ''}{plPct.toFixed(2)}%)
                              </div>
                           </div>
                        </div>

                        <div className="h-px w-full bg-border/50" />

                        {/* Details Row */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                           <div>
                              <p className="text-xs text-muted-foreground">Holdings (หน่วย)</p>
                              <p className="font-medium">{asset.quantity.toLocaleString(undefined, {maximumFractionDigits: 6})}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs text-muted-foreground">Avg Cost (ทุนเฉลี่ย)</p>
                              <p className="font-medium">฿{avgCost.toLocaleString(undefined, {maximumFractionDigits: 4})}</p>
                           </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-5">
                        <Button variant="outline" size="sm" className="w-1/3 text-xs bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" onClick={() => { setActiveAsset(asset); setActionType('BUY'); }}>
                          Buy
                        </Button>
                        <Button variant="outline" size="sm" className="w-1/3 text-xs bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20" onClick={() => { setActiveAsset(asset); setActionType('SELL'); }}>
                          Sell
                        </Button>
                        <Button variant="outline" size="sm" className="w-1/3 text-xs bg-secondary/50 hover:bg-secondary border-border/50" onClick={() => { setActiveAsset(asset); setActionType('UPDATE_PRICE'); }}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Price
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ─── DCA Planner Section ─────────────────────────────── */}
      <Card className="glass-card shadow-lg shadow-violet-500/5 border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-violet-500" />
            DCA Planner — จำลองผลตอบแทนการลงทุนแบบสม่ำเสมอ
          </CardTitle>
          <CardDescription>
            ถ้าลงทุนซื้อสินทรัพย์สม่ำเสมอทุกเดือน จะมีมูลค่าพอร์ตเท่าไรใน N ปี?
            คำนวณด้วยสมการดอกเบี้ยทบต้น: <span className="font-mono text-xs">FV = PMT × ((1+r)ⁿ − 1) / r</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">💰 ลงทุนต่อเดือน (฿)</Label>
              <Input
                id="dca-monthly"
                type="number" min={100} step={500}
                value={dcaMonthly}
                onChange={e => setDcaMonthly(Number(e.target.value))}
                className="text-lg font-bold h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">📅 ระยะเวลา (ปี)</Label>
              <Input
                id="dca-years"
                type="number" min={1} max={50} step={1}
                value={dcaYears}
                onChange={e => setDcaYears(Number(e.target.value))}
                className="text-lg font-bold h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">📈 ผลตอบแทนต่อปี (%)</Label>
              <Input
                id="dca-return"
                type="number" min={0} max={50} step={0.5}
                value={dcaReturn}
                onChange={e => setDcaReturn(Number(e.target.value))}
                className="text-lg font-bold h-12"
              />
              <p className="text-xs text-muted-foreground">เช่น SET ระยะยาว ~7-10% / S&P500 ~10%</p>
            </div>
          </div>

          {/* Result Summary Cards */}
          {dcaFinal && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">มูลค่าพอร์ตสุดท้าย</p>
                <p className="text-2xl font-black text-violet-600 dark:text-violet-400">
                  ฿{dcaFinal["มูลค่าพอร์ต"].toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">เงินลงทุนสะสม</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  ฿{dcaFinal["เงินลงทุนสะสม"].toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">กำไรสะสม (ดอกทบต้น)</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  +฿{dcaFinal["กำไรสะสม"].toLocaleString()}
                </p>
                <p className="text-xs text-emerald-500 mt-1">
                  × {dcaFinal["เงินลงทุนสะสม"] > 0 ? (dcaFinal["มูลค่าพอร์ต"] / dcaFinal["เงินลงทุนสะสม"]).toFixed(2) : '—'} เท่า
                </p>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dcaProjection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }}
                  tickFormatter={v => v >= 1_000_000 ? `฿${(v/1_000_000).toFixed(1)}M` : `฿${(v/1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,15,20,0.9)', color: '#fff' }}
                  formatter={(value: any, name: any) => [`฿${Number(value).toLocaleString()}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Area type="monotone" dataKey="มูลค่าพอร์ต" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradPortfolio)" />
                <Area type="monotone" dataKey="เงินลงทุนสะสม" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 3" fill="url(#gradInvested)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog (BUY/SELL/UPDATE) */}
      <Dialog open={!!activeAsset && !!actionType} onOpenChange={(val) => { if (!val) { setActiveAsset(null); setActionType(null); } }}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 
              ${actionType === 'BUY' ? 'text-emerald-500' : actionType === 'SELL' ? 'text-rose-500' : 'text-blue-500'}`}>
              {actionType === 'BUY' ? <ArrowUpRight className="h-5 w-5" /> : actionType === 'SELL' ? <ArrowDownRight className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
              {actionType === 'BUY' ? 'ซื้อเพิ่ม (Buy Asset)' : actionType === 'SELL' ? 'ขายออก (Sell Asset)' : 'อัปเดตราคาตลาด (Update Price)'}
            </DialogTitle>
            <DialogDescription>
              {activeAsset?.name} ({activeAsset?.ticker || activeAsset?.assetType})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleActionSubmit} className="space-y-4 pt-4">
            {actionType === 'UPDATE_PRICE' ? (
              <div className="space-y-2">
                <Label>ราคาตลาดปัจจุบัน / Current Market Price (฿)</Label>
                <Input name="price" type="number" step="any" required defaultValue={activeAsset?.currentPrice || ""} min="0" />
                <p className="text-xs text-muted-foreground">ระบบจะไม่อัปเดตต้นทุนรวม แต่จะเปลี่ยนแค่มูลค่าตลาดของพอร์ต</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>จำนวนหน่วย / Quantity</Label>
                    <Input name="quantity" type="number" step="any" required min="0" max={actionType === 'SELL' ? activeAsset?.quantity : undefined} placeholder="0.00" />
                    {actionType === 'SELL' && <p className="text-xs text-rose-500">สูงสุด: {activeAsset?.quantity}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>ราคาต่อหน่วย / Price (฿)</Label>
                    <Input name="price" type="number" step="any" required min="0" placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ค่าธรรมเนียม / Fee (฿) (Optional)</Label>
                  <Input name="fee" type="number" step="any" min="0" defaultValue={0} />
                </div>
                <div className="space-y-2">
                  <Label>วันที่ / Date</Label>
                  <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="space-y-2">
                  <Label>บันทึก / Note (Optional)</Label>
                  <Input name="note" placeholder="ซื้อถัว, ล้างพอร์ต, ตัดขาดทุน..." />
                </div>
              </>
            )}

            <Button type="submit" disabled={formLoading} className={`w-full text-white h-12 rounded-xl shadow-lg mt-4 
              ${actionType === 'BUY' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 
                actionType === 'SELL' ? 'bg-gradient-to-r from-rose-400 to-rose-600' : 
                'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === 'UPDATE_PRICE' ? 'อัปเดตราคา' : 'ยืนยันการบันทึกเทรด'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Drill-down Asset Transactions */}
      <Dialog open={!!drillDownAsset} onOpenChange={(val) => !val && setDrillDownAsset(null)}>
        <DialogContent className="sm:max-w-[550px] glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              ประวัติการซื้อขาย: {drillDownAsset?.name} ({drillDownAsset?.ticker})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 mt-4">
            {!drillDownAsset?.transactions || drillDownAsset.transactions.length === 0 ? (
              <div className="text-center text-muted-foreground p-8 bg-secondary/20 rounded-xl">ยังไม่มีประวัติการเทรด</div>
            ) : (
              drillDownAsset.transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50 hover:bg-secondary/20 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                      {tx.type === 'BUY' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="font-bold">{tx.type === 'BUY' ? 'BUY' : 'SELL'}</p>
                        <p className="text-sm font-medium">{tx.quantity.toLocaleString(undefined, {maximumFractionDigits:4})} @ ฿{tx.price.toLocaleString()}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('th-TH')} {tx.fee > 0 && `· Fee: ฿${tx.fee}`} {tx.note && `· ${tx.note}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                       <p className="font-bold text-sm">฿{((tx.quantity * tx.price) + (tx.type === 'BUY' ? tx.fee : -tx.fee)).toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                       <p className="text-xs text-muted-foreground">Total {tx.type === 'BUY' ? 'Paid' : 'Received'}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2" onClick={() => handleDeleteTx(tx.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
