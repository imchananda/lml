"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Plus, Loader2, ChevronLeft, ChevronRight, Edit2, Trash2, Info, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type Budget = {
  id: string; amount: number; spent: number
  category: { id: string; name: string; color: string }
}

type Category = { id: string; name: string; type: string; color: string }

export default function BudgetPage() {
  const [open, setOpen] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [catId, setCatId] = useState("")
  const [formLoading, setFormLoading] = useState(false)
  
  // Navigation & Edit States
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [editBudget, setEditBudget] = useState<Budget | null>(null)

  // Drill-down States
  const [drillDownBudget, setDrillDownBudget] = useState<Budget | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loadingTx, setLoadingTx] = useState(false)

  // Quick Add States
  const [quickAddBudget, setQuickAddBudget] = useState<Budget | null>(null)
  const [isSubmittingTx, setIsSubmittingTx] = useState(false)

  // Edit Transaction State
  const [editTransaction, setEditTransaction] = useState<any | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const m = currentDate.getMonth() + 1
    const y = currentDate.getFullYear()
    try {
      const [bRes, cRes] = await Promise.all([
        fetch(`/api/finance/budget?month=${m}&year=${y}`), 
        fetch('/api/finance/categories')
      ])
      if (bRes.ok) setBudgets(await bRes.json())
      if (cRes.ok) {
        const cats = await cRes.json()
        setCategories(cats.filter((c: Category) => c.type === 'EXPENSE'))
      }
    } catch {}
    setLoading(false)
  }, [currentDate])

  useEffect(() => { fetchData() }, [fetchData])

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)

  // Daily Allowance Calculation
  const isCurrentMonth = new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear()
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - new Date().getDate() + 1 
  const safePerDay = isCurrentMonth && daysLeft > 0 ? Math.max(0, (totalBudget - totalSpent) / daysLeft) : 0

  const prevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget envelope?')) return
    try {
      const res = await fetch(`/api/finance/budget?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Budget envelope deleted')
      fetchData()
    } catch { toast.error('Failed to delete') }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)
    const fd = new FormData(e.currentTarget)
    const m = currentDate.getMonth() + 1
    const y = currentDate.getFullYear()
    
    try {
      const res = await fetch('/api/finance/budget', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: catId, amount: Number(fd.get('amount')), month: m, year: y }),
      })
      if (!res.ok) throw new Error()
      toast.success(editBudget ? 'Budget updated!' : 'Budget set!')
      setOpen(false)
      fetchData()
    } catch { toast.error('Failed to save budget') }
    setFormLoading(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) { setEditBudget(null); setCatId(""); }
  }

  const handleQuickAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!quickAddBudget) return
    setIsSubmittingTx(true)
    const fd = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          categoryId: quickAddBudget.category.id, 
          amount: Number(fd.get('amount')), 
          description: fd.get('description'),
          type: 'EXPENSE',
          date: new Date(fd.get('date') as string).toISOString()
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Expense added successfully!')
      setQuickAddBudget(null)
      fetchData() // Refresh budget progress
    } catch { 
      toast.error('Failed to add expense') 
    }
    setIsSubmittingTx(false)
  }

  const fetchTransactions = async (budget: Budget) => {
    setDrillDownBudget(budget)
    setLoadingTx(true)
    const m = currentDate.getMonth() + 1
    const y = currentDate.getFullYear()
    try {
      const res = await fetch(`/api/finance/transactions?month=${m}&year=${y}&categoryId=${budget.category.id}`)
      if (res.ok) setTransactions(await res.json())
    } catch {}
    setLoadingTx(false)
  }

  const handleEditTxSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editTransaction) return
    setIsSubmittingTx(true)
    const fd = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editTransaction.id,
          amount: Number(fd.get('amount')), 
          description: fd.get('description'),
          date: new Date(fd.get('date') as string).toISOString()
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Expense updated!')
      setEditTransaction(null)
      if (drillDownBudget) fetchTransactions(drillDownBudget)
      fetchData()
    } catch { toast.error('Failed to update expense') }
    setIsSubmittingTx(false)
  }

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    try {
      const res = await fetch(`/api/finance/transactions?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Expense deleted')
      if (drillDownBudget) fetchTransactions(drillDownBudget)
      fetchData()
    } catch { toast.error('Failed to delete expense') }
  }

  const handleCopyPrevious = async () => {
    setFormLoading(true)
    try {
      const m = currentDate.getMonth() + 1
      const y = currentDate.getFullYear()
      const res = await fetch('/api/finance/budget/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: m, year: y })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to copy budgets')
      }
      toast.success('คัดลอกงบประมาณจากเดือนที่แล้วสำเร็จ!')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
    setFormLoading(false)
  }

  const colorMap: Record<string, string> = { '#6366f1': 'bg-indigo-500', '#ef4444': 'bg-red-500', '#f59e0b': 'bg-amber-500', '#10b981': 'bg-emerald-500', '#3b82f6': 'bg-blue-500', '#8b5cf6': 'bg-purple-500' }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gradient inline-block w-fit">Budget Envelopes</h2>
          <p className="text-muted-foreground">Monitor your category limits for this month.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-xl shadow-sm border border-border/50">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 hover:bg-background">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold min-w-[130px] text-center text-sm">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 hover:bg-background">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleCopyPrevious} disabled={formLoading} title="Copy from Previous Month" className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Dialog open={open} onOpenChange={handleOpenChange}>
              <DialogTrigger render={<Button className="bg-amber-500 hover:bg-amber-600 shadow-md text-white" />}>
                <Plus className="mr-2 h-4 w-4" />New Budget
              </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>{editBudget ? 'แก้ไขงบประมาณ (Edit)' : 'ตั้งงบประมาณรายจ่าย (Budget)'}</DialogTitle>
                <DialogDescription>
                  {editBudget ? 'ปรับปรุงลิมิตการใช้จ่ายในหมวดหมู่นี้' : 'กำหนดลิมิตการใช้จ่ายในแต่ละหมวดหมู่ประจำเดือนนี้'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>หมวดหมู่ / Category</Label>
                  <p className="text-xs text-muted-foreground">เลือกหมวดหมู่ค่าใช้จ่ายที่ต้องการควบคุม</p>
                  <Select value={catId} onValueChange={(val) => setCatId(val || '')} disabled={!!editBudget}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>งบประมาณ (฿) / Monthly Limit</Label>
                  <p className="text-xs text-muted-foreground">จำนวนเงินสูงสุดที่จะใช้ในหมวดหมู่นี้ตลอดทั้งเดือน</p>
                  <Input name="amount" type="number" required defaultValue={editBudget?.amount || ""} placeholder="5000" />
                </div>
                <Button type="submit" disabled={formLoading} className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white h-12 rounded-xl shadow-lg">
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editBudget ? 'Update Budget' : 'Set Budget'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="glass-card shadow-lg shadow-emerald-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-lg">Total Budget</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">฿{totalBudget.toLocaleString()}</div>
                <div className="flex flex-col mt-2">
                  <p className="text-sm text-muted-foreground">
                    <span className={totalBudget - totalSpent >= 0 ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>
                      ฿{(totalBudget - totalSpent).toLocaleString()}
                    </span> remaining
                  </p>
                  {isCurrentMonth && totalBudget - totalSpent > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Safe to spend: <span className="font-medium text-emerald-500">฿{safePerDay.toLocaleString(undefined, {maximumFractionDigits:0})}</span> / day
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {budgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-16 space-y-4">
              <p>No budgets set for {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.</p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={handleCopyPrevious} disabled={formLoading} className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10">
                  {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                  Copy from Previous Month
                </Button>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Budget
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {budgets.map((b) => {
                const pct = Math.min((b.spent / b.amount) * 100, 100)
                const over = b.spent > b.amount
                const warning = !over && pct >= 80

                let progressColor = colorMap[b.category.color] || 'bg-indigo-500'
                if (over) progressColor = 'bg-red-500'
                else if (warning) progressColor = 'bg-amber-500'

                return (
                  <Card key={b.id} className="glass-card hover-lift shadow-lg shadow-black/5 group">
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => fetchTransactions(b)}>
                        <CardTitle className="text-lg flex items-center gap-2 mt-1 group-hover:text-amber-500 transition-colors">
                          <Wallet className="h-4 w-4 text-muted-foreground group-hover:text-amber-500" />
                          {b.category.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to view transactions
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-right">
                          <span className={`text-xl font-bold ${over ? 'text-red-500' : warning ? 'text-amber-500' : ''}`}>
                            ฿{b.spent.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground"> / ฿{b.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-1 -mr-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10" onClick={() => { setEditBudget(b); setCatId(b.category.id); setOpen(true); }}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(b.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/50 mt-1">
                        <div className={`h-full rounded-full transition-all duration-1000 ${progressColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      {over && <p className="text-xs text-red-500 mt-2 font-medium">Over budget by ฿{(b.spent - b.amount).toLocaleString()}</p>}
                      {warning && <p className="text-xs text-amber-500 mt-2 font-medium">Approaching limit ({(pct).toFixed(0)}% used)</p>}
                      <Button variant="outline" size="sm" className="mt-4 w-full flex items-center justify-center gap-2 border-dashed hover:border-solid hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500 transition-all" onClick={() => setQuickAddBudget(b)}>
                        <Plus className="h-4 w-4" /> Quick Add Expense
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Drill-down Dialog */}
      <Dialog open={!!drillDownBudget} onOpenChange={(val) => !val && setDrillDownBudget(null)}>
        <DialogContent className="sm:max-w-[500px] glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> 
              {drillDownBudget?.category.name} Transactions
            </DialogTitle>
            <DialogDescription>
              รายการใช้จ่ายในเดือน {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 mt-4">
            {loadingTx ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
            ) : transactions.length === 0 ? (
              <div className="text-center text-muted-foreground p-8 bg-secondary/20 rounded-xl">ไม่มีรายการใช้จ่ายในหมวดหมู่นี้</div>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50 hover:bg-secondary/20 transition-colors group">
                  <div className="flex-1">
                    <p className="font-medium">{tx.description || tx.category.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('th-TH')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-red-500">-฿{tx.amount.toLocaleString()}</div>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-500" onClick={() => setEditTransaction(tx)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteTx(tx.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Expense Dialog */}
      <Dialog open={!!quickAddBudget} onOpenChange={(val) => !val && setQuickAddBudget(null)}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-500" />
              บันทึกรายจ่าย: {quickAddBudget?.category.name}
            </DialogTitle>
            <DialogDescription>
              เพิ่มรายการใช้จ่ายย่อย เพื่อนำไปหักลบในซองงบประมาณนี้
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickAddSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>รายการ / Description</Label>
              <Input name="description" required placeholder="เช่น ซื้อข้าว, กาแฟ..." />
            </div>
            <div className="space-y-2">
              <Label>จำนวนเงิน (฿) / Amount</Label>
              <Input name="amount" type="number" required placeholder="100" min="1" />
            </div>
            <div className="space-y-2">
              <Label>วันที่ / Date</Label>
              <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <Button type="submit" disabled={isSubmittingTx} className="w-full bg-gradient-to-r from-emerald-400 to-emerald-600 text-white h-12 rounded-xl shadow-lg mt-4">
              {isSubmittingTx && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Expense
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editTransaction} onOpenChange={(val) => !val && setEditTransaction(null)}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10 z-[60]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-amber-500" />
              แก้ไขรายจ่าย
            </DialogTitle>
          </DialogHeader>
          {editTransaction && (
            <form onSubmit={handleEditTxSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>รายการ / Description</Label>
                <Input name="description" required defaultValue={editTransaction.description} />
              </div>
              <div className="space-y-2">
                <Label>จำนวนเงิน (฿) / Amount</Label>
                <Input name="amount" type="number" required defaultValue={editTransaction.amount} min="1" />
              </div>
              <div className="space-y-2">
                <Label>วันที่ / Date</Label>
                <Input name="date" type="date" required defaultValue={new Date(editTransaction.date).toISOString().split('T')[0]} />
              </div>
              <Button type="submit" disabled={isSubmittingTx} className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-white h-12 rounded-xl shadow-lg mt-4">
                {isSubmittingTx && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Expense
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

