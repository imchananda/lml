"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PiggyBank, Plus, Loader2, ArrowUpRight, ArrowDownRight, Edit2, Trash2, CheckCircle2, Target, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type SavingTransaction = { id: string; amount: number; type: 'DEPOSIT' | 'WITHDRAW'; date: string; note: string }

type SavingPot = {
  id: string; name: string; targetAmount: number; savedAmount: number; term: 'SHORT' | 'MEDIUM' | 'LONG';
  targetDate: string | null; icon: string | null; color: string; autoSaveAmount: number | null;
  transactions: SavingTransaction[]
}

export default function SavingsPage() {
  const [pots, setPots] = useState<SavingPot[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  
  // Dialog States
  const [openNew, setOpenNew] = useState(false)
  const [editPot, setEditPot] = useState<SavingPot | null>(null)
  
  // Transaction Action States
  const [activePot, setActivePot] = useState<SavingPot | null>(null)
  const [actionType, setActionType] = useState<'DEPOSIT' | 'WITHDRAW' | null>(null)
  
  // Drill-down State
  const [drillDownPot, setDrillDownPot] = useState<SavingPot | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/saving-pots')
      if (res.ok) setPots(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalSaved = pots.reduce((acc, p) => acc + p.savedAmount, 0)
  const totalTarget = pots.reduce((acc, p) => acc + p.targetAmount, 0)

  const handlePotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)
    const fd = new FormData(e.currentTarget)
    
    try {
      const payload = {
        id: editPot?.id,
        name: fd.get('name'),
        targetAmount: Number(fd.get('targetAmount')),
        term: fd.get('term'),
        targetDate: fd.get('targetDate') || null,
        color: fd.get('color') || '#10b981',
      }
      
      const res = await fetch('/api/finance/saving-pots', {
        method: editPot ? 'PATCH' : 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      
      toast.success(editPot ? 'อัปเดตกระปุกสำเร็จ!' : 'สร้างกระปุกออมเงินสำเร็จ!')
      setOpenNew(false)
      setEditPot(null)
      fetchData()
    } catch { toast.error('Failed to save saving pot') }
    setFormLoading(false)
  }

  const handleDeletePot = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกระปุกนี้? (ระบบจะซ่อนกระปุกนี้ แต่ประวัติการฝากถอนยังอยู่)')) return
    try {
      const res = await fetch(`/api/finance/saving-pots?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('ลบกระปุกสำเร็จ')
      fetchData()
    } catch { toast.error('Failed to delete pot') }
  }

  const handleTransactionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!activePot || !actionType) return
    setFormLoading(true)
    const fd = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/finance/saving-pots/transactions', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          potId: activePot.id, 
          amount: Number(fd.get('amount')), 
          type: actionType,
          date: new Date(fd.get('date') as string).toISOString(),
          note: fd.get('note')
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(actionType === 'DEPOSIT' ? '💸 ฝากเงินสำเร็จ!' : '💵 ถอนเงินสำเร็จ!')
      setActivePot(null)
      setActionType(null)
      
      // If drill down is open, we should fetch again to update its tx list
      fetchData().then(() => {
        if (drillDownPot) {
           fetch('/api/finance/saving-pots').then(r => r.json()).then(data => {
              const updated = data.find((p: any) => p.id === drillDownPot.id)
              if (updated) setDrillDownPot(updated)
           })
        }
      })
    } catch { toast.error('Failed to process transaction') }
    setFormLoading(false)
  }

  const handleDeleteTx = async (txId: string) => {
    if (!confirm('ยืนยันลบรายการนี้? (ยอดเงินจะถูกคำนวณคืนอัตโนมัติ)')) return
    try {
      const res = await fetch(`/api/finance/saving-pots/transactions?id=${txId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('ลบรายการสำเร็จ')
      fetchData().then(() => {
        if (drillDownPot) {
           fetch('/api/finance/saving-pots').then(r => r.json()).then(data => {
              const updated = data.find((p: any) => p.id === drillDownPot.id)
              if (updated) setDrillDownPot(updated)
           })
        }
      })
    } catch { toast.error('Failed to delete transaction') }
  }

  const colors = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b']

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gradient inline-block w-fit">Saving Pots 🐷</h2>
          <p className="text-muted-foreground">จัดการเป้าหมายการออมเงินของคุณ</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Dialog open={openNew} onOpenChange={(val) => { setOpenNew(val); if (!val) setEditPot(null); }}>
            <DialogTrigger render={<Button className="bg-emerald-500 hover:bg-emerald-600 shadow-md text-white" />}>
              <Plus className="mr-2 h-4 w-4" />สร้างกระปุกใหม่
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>{editPot ? 'แก้ไขกระปุก' : 'สร้างกระปุกออมเงิน'}</DialogTitle>
                <DialogDescription>ตั้งเป้าหมายและจำนวนเงินที่ต้องการเก็บ</DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePotSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>ชื่อเป้าหมาย / Goal Name</Label>
                  <Input name="name" required defaultValue={editPot?.name || ""} placeholder="เช่น ทริปญี่ปุ่น, เงินสำรอง..." />
                </div>
                <div className="space-y-2">
                  <Label>ยอดเงินเป้าหมาย (฿) / Target Amount</Label>
                  <Input name="targetAmount" type="number" required defaultValue={editPot?.targetAmount || ""} min="1" />
                </div>
                <div className="space-y-2">
                  <Label>ระยะเวลา / Term</Label>
                  <Select name="term" defaultValue={editPot?.term || 'SHORT'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SHORT">ระยะสั้น (Short-term)</SelectItem>
                      <SelectItem value="MEDIUM">ระยะกลาง (Medium-term)</SelectItem>
                      <SelectItem value="LONG">ระยะยาว (Long-term)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>สีประจำกระปุก / Color</Label>
                  <div className="flex gap-2">
                    {colors.map(c => (
                      <label key={c} className="cursor-pointer">
                        <input type="radio" name="color" value={c} defaultChecked={(editPot?.color || '#10b981') === c} className="peer sr-only" />
                        <div className="h-8 w-8 rounded-full border-2 border-transparent peer-checked:border-white peer-checked:ring-2 ring-emerald-500 transition-all shadow-sm" style={{ backgroundColor: c }} />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>วันที่ต้องการให้ถึงเป้าหมาย / Target Date (Optional)</Label>
                  <Input name="targetDate" type="date" defaultValue={editPot?.targetDate ? new Date(editPot.targetDate).toISOString().split('T')[0] : ''} />
                </div>
                <Button type="submit" disabled={formLoading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-xl shadow-lg mt-4">
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editPot ? 'อัปเดตกระปุก' : 'สร้างกระปุก'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
      ) : (
        <>
          {pots.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-full md:col-span-1 glass-card shadow-lg shadow-emerald-500/5 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20">
                <CardHeader className="pb-2"><CardTitle className="text-lg text-emerald-700 dark:text-emerald-400">Total Savings Overview</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">฿{totalSaved.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">จากเป้าหมายรวม ฿{totalTarget.toLocaleString()}</div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50 mt-4">
                    <div className="h-full rounded-full transition-all duration-1000 bg-emerald-500" style={{ width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` }} />
                  </div>
                  <p className="text-xs text-right mt-1 text-emerald-600/80 font-medium">{(totalSaved / totalTarget * 100).toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>
          )}

          {pots.length === 0 ? (
            <div className="text-center text-muted-foreground py-16 flex flex-col items-center">
              <PiggyBank className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p>คุณยังไม่ได้สร้างกระปุกออมเงิน เริ่มสร้างเป้าหมายแรกของคุณเลย!</p>
              <Button className="mt-4 bg-emerald-500 text-white" onClick={() => setOpenNew(true)}>
                <Plus className="mr-2 h-4 w-4" /> เริ่มต้นออมเงิน
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
              {pots.map((p) => {
                const pct = Math.min((p.savedAmount / p.targetAmount) * 100, 100)
                const isComplete = p.savedAmount >= p.targetAmount

                return (
                  <Card key={p.id} className="glass-card hover-lift shadow-lg shadow-black/5 group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: p.color }} />
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => setDrillDownPot(p)}>
                        <CardTitle className="text-lg flex items-center gap-2 mt-1 transition-colors hover:opacity-80">
                          {p.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          ดูประวัติฝากถอน
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex gap-1 -mr-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-500" onClick={() => { setEditPot(p); setOpenNew(true); }}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => handleDeletePot(p.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-end mb-2">
                        <div>
                           <div className="text-2xl font-bold" style={{ color: p.color }}>฿{p.savedAmount.toLocaleString()}</div>
                           <div className="text-sm text-muted-foreground">เป้าหมาย ฿{p.targetAmount.toLocaleString()}</div>
                        </div>
                        {isComplete && <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />}
                      </div>

                      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/50 mt-1">
                        <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${pct}%`, backgroundColor: p.color }}>
                           {isComplete && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                         <span className="text-xs font-medium" style={{ color: p.color }}>{pct.toFixed(1)}%</span>
                         {!isComplete && p.targetDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                               <Calendar className="h-3 w-3" /> 
                               {new Date(p.targetDate).toLocaleDateString('th-TH', {month:'short', year:'2-digit'})}
                            </span>
                         )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all" onClick={() => { setActivePot(p); setActionType('DEPOSIT'); }}>
                          <ArrowUpRight className="h-4 w-4" /> ฝากเพิ่ม
                        </Button>
                        <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 transition-all" onClick={() => { setActivePot(p); setActionType('WITHDRAW'); }}>
                          <ArrowDownRight className="h-4 w-4" /> ถอนเงิน
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

      {/* Transaction Action Dialog (Deposit/Withdraw) */}
      <Dialog open={!!activePot && !!actionType} onOpenChange={(val) => { if (!val) { setActivePot(null); setActionType(null); } }}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${actionType === 'DEPOSIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {actionType === 'DEPOSIT' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              {actionType === 'DEPOSIT' ? 'ฝากเงินเข้ากระปุก' : 'ถอนเงินจากกระปุก'}
            </DialogTitle>
            <DialogDescription>
              {activePot?.name} (ปัจจุบันมี ฿{activePot?.savedAmount.toLocaleString()})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransactionSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>จำนวนเงิน (฿) / Amount</Label>
              <Input name="amount" type="number" required placeholder="0.00" min="1" max={actionType === 'WITHDRAW' ? activePot?.savedAmount : undefined} />
              {actionType === 'WITHDRAW' && <p className="text-xs text-rose-500">ถอนได้สูงสุด ฿{activePot?.savedAmount.toLocaleString()}</p>}
            </div>
            <div className="space-y-2">
              <Label>วันที่ / Date</Label>
              <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-2">
              <Label>บันทึกช่วยจำ / Note (Optional)</Label>
              <Input name="note" placeholder="โบนัสออก, ถอนไปจ่ายค่าโรงแรม..." />
            </div>
            <Button type="submit" disabled={formLoading} className={`w-full text-white h-12 rounded-xl shadow-lg mt-4 ${actionType === 'DEPOSIT' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-rose-400 to-rose-600'}`}>
              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ยืนยันการ{actionType === 'DEPOSIT' ? 'ฝาก' : 'ถอน'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Drill-down Pot Transactions */}
      <Dialog open={!!drillDownPot} onOpenChange={(val) => !val && setDrillDownPot(null)}>
        <DialogContent className="sm:max-w-[500px] glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" style={{ color: drillDownPot?.color }} />
              ความเคลื่อนไหว: {drillDownPot?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 mt-4">
            {!drillDownPot?.transactions || drillDownPot.transactions.length === 0 ? (
              <div className="text-center text-muted-foreground p-8 bg-secondary/20 rounded-xl">ยังไม่มีประวัติการฝากถอน</div>
            ) : (
              drillDownPot.transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50 hover:bg-secondary/20 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                      {tx.type === 'DEPOSIT' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{tx.note || (tx.type === 'DEPOSIT' ? 'ฝากเงิน' : 'ถอนเงิน')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('th-TH')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`font-bold ${tx.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}฿{tx.amount.toLocaleString()}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteTx(tx.id)}>
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
