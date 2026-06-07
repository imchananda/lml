"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Flame, Plus, Loader2, Pencil, Trash2, ChevronLeft, ChevronRight, BarChart4 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DebtForm } from "@/components/forms/DebtForm"
import { calcPayoffMonths } from "@/lib/calculators/debt"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"

type Debt = {
  id: string; name: string; type: string; totalAmount: number
  currentBalance: number; interestRate: number; minimumPayment: number
  dueDate: number | null; notes: string | null; asOfDate: string
}

export default function DebtPage() {
  const [open, setOpen] = useState(false)
  const [editDebt, setEditDebt] = useState<Debt | null>(null)
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/debt')
      if (res.ok) setDebts(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const deleteDebt = async (id: string) => {
    if (!confirm('ลบรายการหนี้นี้?')) return
    await fetch('/api/finance/debt', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchData()
  }

  // Month navigation handlers
  const prevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))

  // Filter debts by selected month and year
  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      if (!d.asOfDate) return false
      const date = new Date(d.asOfDate)
      return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
    })
  }, [debts, currentDate])

  const totalDebt = filteredDebts.reduce((s, d) => s + d.currentBalance, 0)
  const totalMinPay = filteredDebts.reduce((s, d) => s + d.minimumPayment, 0)

  // Estimate debt-free date using avg interest rate of filtered debts
  const avgRate = filteredDebts.length ? filteredDebts.reduce((s, d) => s + d.interestRate, 0) / filteredDebts.length : 0
  const estMonths = totalDebt > 0 ? calcPayoffMonths(totalDebt, avgRate, totalMinPay) : 0
  const freeDate = new Date(currentDate)
  freeDate.setMonth(freeDate.getMonth() + (estMonths === Infinity ? 999 : estMonths))

  // Prepare monthly comparison chart data
  const chartData = useMemo(() => {
    const groups: Record<string, { monthKey: string; date: Date; total: number }> = {}
    
    debts.forEach(d => {
      if (!d.asOfDate) return
      const date = new Date(d.asOfDate)
      const year = date.getFullYear()
      const month = date.getMonth()
      const key = `${year}-${month}`
      
      if (!groups[key]) {
        const monthName = date.toLocaleString('en-US', { month: 'short' })
        const shortYear = date.getFullYear().toString().substring(2)
        groups[key] = {
          monthKey: `${monthName} '${shortYear}`,
          date: new Date(year, month, 1),
          total: 0
        }
      }
      groups[key].total += d.currentBalance
    })
    
    return Object.values(groups)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(g => ({
        month: g.monthKey,
        "ยอดหนี้รวม": g.total,
      }))
  }, [debts])

  const debtTypeLabels: Record<string, string> = {
    CREDIT_CARD: "บัตรเครดิต", PERSONAL_LOAN: "สินเชื่อส่วนบุคคล",
    MORTGAGE: "สินเชื่อบ้าน", CAR_LOAN: "สินเชื่อรถ", STUDENT_LOAN: "กยศ.", OTHER: "อื่นๆ"
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gradient inline-block w-fit">Debt Manager</h2>
          <p className="text-muted-foreground">Track and strategize your debt payoff.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
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

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-red-500 hover:bg-red-600 shadow-md text-white" />}>
              <Plus className="mr-2 h-4 w-4" />Add Debt
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
              <DialogHeader><DialogTitle>Add New Debt</DialogTitle><DialogDescription>Track a loan or credit card.</DialogDescription></DialogHeader>
              <DebtForm defaultDate={currentDate} onSuccess={() => { setOpen(false); fetchData() }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card shadow-lg shadow-red-500/5 border-t-4 border-t-red-500">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Total Debt</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-red-600 dark:text-red-400">฿{totalDebt.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="glass-card shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Debt-Free Date</CardTitle>
            <Flame className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {filteredDebts.length > 0 && estMonths !== Infinity ? freeDate.toLocaleDateString('en', { month: 'short', year: 'numeric' }) : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{estMonths !== Infinity ? `~${estMonths} months left` : 'Add payments to estimate'}</p>
          </CardContent>
        </Card>
        <Card className="glass-card shadow-lg">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Monthly Min. Payment</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">฿{totalMinPay.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="glass-card shadow-lg shadow-red-500/5 border-red-500/20 bg-gradient-to-br from-background to-red-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart4 className="h-5 w-5 text-red-500" />
              เปรียบเทียบยอดหนี้สินรายเดือน (Monthly Debt Comparison)
            </CardTitle>
            <CardDescription>แนวโน้มยอดหนี้คงค้างรวมในแต่ละเดือน</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDebtVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => v >= 1000 ? `฿${(v / 1000).toLocaleString()}k` : `฿${v}`}
                />
                <RechartsTooltip
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    background: 'rgba(15,15,20,0.9)', 
                    color: '#fff' 
                  }}
                  formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'ยอดหนี้รวม']}
                />
                <Bar dataKey="ยอดหนี้รวม" fill="url(#colorDebtVal)" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {filteredDebts.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          {debts.length === 0 
            ? 'No debts tracked. Click "Add Debt" to start!'
            : 'ไม่มีรายการหนี้สินที่บันทึกไว้ในเดือนนี้ คลิก "Add Debt" เพื่อเริ่มบันทึก หรือย้อนกลับไปดูเดือนที่มีข้อมูล'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDebts.map((d) => {
            const paidPct = d.totalAmount > 0 ? Math.round(((d.totalAmount - d.currentBalance) / d.totalAmount) * 100) : 0
            const months = calcPayoffMonths(d.currentBalance, d.interestRate, d.minimumPayment)
            return (
              <Card key={d.id} className="glass-card hover-lift relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <CreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{d.name}</h3>
                        <p className="text-sm text-muted-foreground">{debtTypeLabels[d.type] || d.type} · {d.interestRate}% APR · {months !== Infinity ? `~${months} months` : '∞'}</p>
                      </div>
                    </div>
                    <div className="flex gap-8 w-full md:w-auto justify-between md:justify-end items-center text-right">
                      <div>
                        <p className="text-sm text-muted-foreground">Paid</p>
                        <p className="font-medium text-emerald-600">{paidPct}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className="font-bold text-xl text-red-600 dark:text-red-400">฿{d.currentBalance.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">As of {d.asOfDate ? new Date(d.asOfDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditDebt(d)} className="gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950">
                          <Pencil className="h-3.5 w-3.5" /> แก้ไข
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteDebt(d.id)} className="gap-1 border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                          <Trash2 className="h-3.5 w-3.5" /> ลบ
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editDebt} onOpenChange={(val) => !val && setEditDebt(null)}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader><DialogTitle>Edit Debt</DialogTitle><DialogDescription>แก้ไขรายละเอียดหนี้สิน</DialogDescription></DialogHeader>
          {editDebt && <DebtForm initialData={editDebt} onSuccess={() => { setEditDebt(null); fetchData() }} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
