"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldCheck, Plus, Loader2, Pencil, Trash2, AlertTriangle, Building2, Clock, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CreditBureauForm } from "@/components/forms/CreditBureauForm"
import { CreditScoreForm } from "@/components/forms/CreditScoreForm"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CreditBureauItem = {
  id: string; accountName: string; accountType: string; lender: string
  creditLimit: number | null; outstandingBalance: number; monthlyPayment: number
  status: string; reportDate: string; inquiryDate?: string | null; accountOpenDate: string | null; notes: string | null
}

const typeLabels: Record<string, string> = {
  CREDIT_CARD: "บัตรเครดิต", PERSONAL_LOAN: "สินเชื่อส่วนบุคคล",
  MORTGAGE: "สินเชื่อบ้าน", CAR_LOAN: "สินเชื่อรถยนต์",
  STUDENT_LOAN: "กยศ.", OVERDRAFT: "O/D", HIRE_PURCHASE: "เช่าซื้อ", OTHER: "อื่นๆ"
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  NORMAL: { label: "ปกติ", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  DELINQUENT: { label: "ค้างชำระ", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  CLOSED: { label: "ปิดแล้ว", color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800/30" },
  WRITTEN_OFF: { label: "ตัดหนี้สูญ", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  RESTRUCTURED: { label: "ปรับโครงสร้าง", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
}

function getScoreAnalysis(score: number | null) {
  if (!score) return null;
  if (score >= 753) return { level: 'AA', description: 'น่าเชื่อถือมากที่สุด', prob: 'สูงมาก', color: 'text-emerald-500', bg: 'bg-emerald-500', gradient: 'from-emerald-400 to-emerald-600' }
  if (score >= 725) return { level: 'BB', description: 'น่าเชื่อถือมาก', prob: 'สูง', color: 'text-emerald-400', bg: 'bg-emerald-400', gradient: 'from-emerald-300 to-emerald-500' }
  if (score >= 699) return { level: 'CC', description: 'น่าเชื่อถือดี', prob: 'ค่อนข้างสูง', color: 'text-lime-500', bg: 'bg-lime-500', gradient: 'from-lime-400 to-lime-600' }
  if (score >= 681) return { level: 'DD', description: 'น่าเชื่อถือค่อนข้างดี', prob: 'ปานกลาง', color: 'text-yellow-500', bg: 'bg-yellow-500', gradient: 'from-yellow-400 to-yellow-600' }
  if (score >= 666) return { level: 'EE', description: 'น่าเชื่อถือปานกลาง', prob: 'ค่อนข้างต่ำ', color: 'text-amber-500', bg: 'bg-amber-500', gradient: 'from-amber-400 to-amber-600' }
  if (score >= 646) return { level: 'FF', description: 'น่าเชื่อถือค่อนข้างน้อย', prob: 'ต่ำ', color: 'text-orange-500', bg: 'bg-orange-500', gradient: 'from-orange-400 to-orange-600' }
  if (score >= 616) return { level: 'GG', description: 'น่าเชื่อถือน้อย', prob: 'ต่ำมาก', color: 'text-red-400', bg: 'bg-red-400', gradient: 'from-red-300 to-red-500' }
  return { level: 'HH', description: 'น่าเชื่อถือน้อยที่สุด', prob: 'เสี่ยงสูงมาก', color: 'text-red-600', bg: 'bg-red-600', gradient: 'from-red-500 to-red-700' }
}

export default function CreditBureauPage() {
  const [open, setOpen] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [editItem, setEditItem] = useState<CreditBureauItem | null>(null)
  
  const [items, setItems] = useState<CreditBureauItem[]>([])
  const [creditScore, setCreditScore] = useState<number | null>(null)
  const [creditScoreDate, setCreditScoreDate] = useState<string | null>(null)
  const [scoreHistory, setScoreHistory] = useState<{ id: string; score: number; date: string }[]>([])
  const [balanceHistory, setBalanceHistory] = useState<{ date: string; outstandingBalance: number; creditLimit: number; monthlyPayment: number }[]>([])
  const [rawBalanceHistories, setRawBalanceHistories] = useState<{ creditBureauId: string; outstandingBalance: number; creditLimit: number | null; monthlyPayment: number; reportDate: string; inquiryDate?: string | null; status: string }[]>([])
  const [activeTab, setActiveTab] = useState<"score" | "debt">("score")
  const [selectedMonth, setSelectedMonth] = useState<string>("latest") // "latest" or "YYYY-MM-01"
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/credit-bureau', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          // Fallback if browser/Next cached the old API response format
          setItems(data)
          setCreditScore(null)
          setCreditScoreDate(null)
          setScoreHistory([])
          setBalanceHistory([])
          setRawBalanceHistories([])
        } else {
          // New format
          setItems(data.items || [])
          setCreditScore(data.creditScore)
          setCreditScoreDate(data.creditScoreDate)
          setScoreHistory(data.scoreHistory || [])
          setBalanceHistory(data.balanceHistory || [])
          setRawBalanceHistories(data.balanceHistories || [])

          // Auto-select the latest available month (by inquiry date)
          const histories = data.balanceHistories || []
          if (histories.length > 0) {
            const months = new Set<string>()
            for (const bh of histories) {
              const dateVal = bh.inquiryDate || bh.reportDate
              if (!dateVal) continue
              const d = new Date(dateVal)
              months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
            }
            const sorted = Array.from(months).sort((a, b) => b.localeCompare(a))
            if (sorted.length > 0) {
              setSelectedMonth(prev => prev === "latest" ? sorted[0] : prev)
            }
          }
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const deleteItem = async (id: string) => {
    if (!confirm('ลบรายการเครดิตบูโรนี้?')) return
    await fetch('/api/finance/credit-bureau', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchData()
  }

  const dynamicBalanceHistory = (() => {
    const monthlyData: Record<string, { date: string; outstandingBalance: number; creditLimit: number; monthlyPayment: number }> = {}
    for (const bh of rawBalanceHistories) {
      const dateVal = bh.inquiryDate || bh.reportDate
      if (!dateVal) continue
      const d = new Date(dateVal)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      if (!monthlyData[monthStr]) {
        monthlyData[monthStr] = {
          date: monthStr,
          outstandingBalance: 0,
          creditLimit: 0,
          monthlyPayment: 0,
        }
      }
      monthlyData[monthStr].outstandingBalance += bh.outstandingBalance
      monthlyData[monthStr].creditLimit += bh.creditLimit || 0
      monthlyData[monthStr].monthlyPayment += bh.monthlyPayment || 0
    }
    return Object.values(monthlyData).sort((a, b) => a.date.localeCompare(b.date))
  })()

  const displayedItems = selectedMonth === "latest"
    ? items
    : items.map(item => {
        const hist = rawBalanceHistories.find(h => {
          if (h.creditBureauId !== item.id) return false
          const dateVal = h.inquiryDate || h.reportDate
          if (!dateVal) return false
          const dVal = new Date(dateVal)
          const dSel = new Date(selectedMonth)
          return dVal.getFullYear() === dSel.getFullYear() && dVal.getMonth() === dSel.getMonth()
        })
        if (!hist) return null
        return {
          ...item,
          outstandingBalance: hist.outstandingBalance,
          creditLimit: hist.creditLimit,
          monthlyPayment: hist.monthlyPayment,
          status: hist.status,
          reportDate: hist.reportDate,
          inquiryDate: hist.inquiryDate ?? null,
        } as CreditBureauItem
      }).filter((item): item is CreditBureauItem => item !== null)

  const displayedScore = selectedMonth === "latest"
    ? creditScore
    : scoreHistory.find(h => {
        const dH = new Date(h.date)
        const dSel = new Date(selectedMonth)
        return dH.getFullYear() === dSel.getFullYear() && dH.getMonth() === dSel.getMonth()
      })?.score ?? null

  const displayedScoreDate = selectedMonth === "latest"
    ? creditScoreDate
    : scoreHistory.find(h => {
        const dH = new Date(h.date)
        const dSel = new Date(selectedMonth)
        return dH.getFullYear() === dSel.getFullYear() && dH.getMonth() === dSel.getMonth()
      })?.date ?? null

  const scoreAnalysis = getScoreAnalysis(displayedScore)

  const totalOutstanding = displayedItems.reduce((s, d) => s + d.outstandingBalance, 0)
  const totalMonthlyPay = displayedItems.reduce((s, d) => s + d.monthlyPayment, 0)
  const totalCreditLimit = displayedItems.reduce((s, d) => s + (d.creditLimit || 0), 0)
  const utilization = totalCreditLimit > 0 ? Math.round((totalOutstanding / totalCreditLimit) * 100) : 0

  const latestDate = displayedItems.length > 0
    ? displayedItems.reduce((latest, item) => {
        const dateStr = item.inquiryDate || item.reportDate
        if (!dateStr) return latest
        const d = new Date(dateStr)
        return d > latest ? d : latest
      }, new Date(0))
    : null

  const delinquentCount = displayedItems.filter(i => i.status === 'DELINQUENT' || i.status === 'WRITTEN_OFF').length

  const availableMonths = Array.from(new Set([
    ...dynamicBalanceHistory.map(h => h.date.split('T')[0]),
    ...scoreHistory.map(h => h.date.split('T')[0])
  ])).sort((a, b) => b.localeCompare(a))

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent inline-block w-fit">
            Credit Bureau
          </h2>
          <p className="text-muted-foreground">ข้อมูลหนี้สินตามรายงานเครดิตบูโร (NCB) — อัพเดทช้ากว่ายอด Debt ปัจจุบัน</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedMonth} onValueChange={(val) => { if (val) setSelectedMonth(val) }}>
            <SelectTrigger className="w-[180px] border-violet-500/30 text-violet-700 dark:text-violet-400 font-medium bg-white dark:bg-zinc-900 rounded-xl">
              <SelectValue placeholder="เลือกเดือน" />
            </SelectTrigger>
            <SelectContent className="glass-card">
              {availableMonths.map((m) => {
                const date = new Date(m)
                const monthLabel = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
                const count = new Set(rawBalanceHistories.filter(h => {
                  const dv = h.inquiryDate || h.reportDate
                  if (!dv) return false
                  const d = new Date(dv)
                  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth()
                }).map(h => h.creditBureauId)).size
                return (
                  <SelectItem key={m} value={m}>
                    {monthLabel} ({count} รายการ)
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
            <DialogTrigger render={<Button variant="outline" className="border-violet-500/30 text-violet-600 hover:bg-violet-50" />}>
              <Activity className="mr-2 h-4 w-4" /> อัพเดทคะแนน
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>อัพเดทคะแนนเครดิต (Credit Score)</DialogTitle>
                <DialogDescription>บันทึกคะแนนจากรายงานเครดิตบูโรล่าสุดของคุณ</DialogDescription>
              </DialogHeader>
              <CreditScoreForm 
                initialScore={displayedScore} 
                initialDate={displayedScoreDate ?? (selectedMonth !== "latest" ? selectedMonth : null)} 
                onSuccess={() => { setScoreOpen(false); fetchData() }} 
              />
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-violet-500 hover:bg-violet-600 shadow-md text-white" />}>
              <Plus className="mr-2 h-4 w-4" />เพิ่มรายการ
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>เพิ่มรายการเครดิตบูโร</DialogTitle>
                <DialogDescription>บันทึกข้อมูลจากรายงาน NCB ของคุณ</DialogDescription>
              </DialogHeader>
              <CreditBureauForm onSuccess={() => { setOpen(false); fetchData() }} existingAccounts={items} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Credit Score Section */}
        <Card className="col-span-full lg:col-span-4 glass-card shadow-lg relative overflow-hidden group">
          <div className={`absolute top-0 left-0 w-full h-1 ${scoreAnalysis ? `bg-gradient-to-r ${scoreAnalysis.gradient}` : 'bg-gray-300'}`} />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex justify-between items-center">
              <span>คะแนนเครดิต (Credit Score)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayedScore ? (
              <div className="flex flex-col h-full justify-between">
                <div className="flex items-end gap-3">
                  <div className={`text-5xl font-black ${scoreAnalysis?.color}`}>{displayedScore}</div>
                  <div className="text-sm text-muted-foreground mb-1">/ 900</div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">ระดับคะแนน (Grade)</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 ${scoreAnalysis?.color}`}>
                      {scoreAnalysis?.level} - {scoreAnalysis?.description}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">โอกาสชำระหนี้คืน</span>
                    <span className="font-semibold">{scoreAnalysis?.prob}</span>
                  </div>
                </div>

                {displayedScoreDate && (
                  <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                    {selectedMonth === "latest" ? "อัพเดทล่าสุด: " : "ข้อมูล ณ วันที่: "}
                    {new Date(displayedScoreDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center h-full space-y-3">
                <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium">ยังไม่มีข้อมูลคะแนนเครดิต</p>
                  <p className="text-xs text-muted-foreground">กด "อัพเดทคะแนน" เพื่อบันทึกข้อมูลจากรายงาน NCB</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info banner about data freshness & Other Stats */}
        <div className="col-span-full lg:col-span-8 flex flex-col gap-6">
          <Card className="glass-card border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 shadow-lg">
            <CardContent className="p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  ข้อมูลจากเครดิตบูโรจะอัพเดทช้ากว่ายอดหนี้ปัจจุบัน
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  รายงาน NCB อัพเดทตามรอบรายงานของสถาบันการเงิน (ปกติเดือนละ 1 ครั้ง) 
                  ดังนั้นยอดที่แสดงอาจไม่ตรงกับยอด Debt ที่เป็นปัจจุบัน
                  {latestDate && (
                    <>
                      {" · ข้อมูลสืบค้นล่าสุด: "}
                      <strong>{latestDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 flex-1">
            <Card className="glass-card shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">ยอดหนี้รวม (NCB)</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">฿{totalOutstanding.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">{items.length} บัญชี</p>
              </CardContent>
            </Card>
            <Card className="glass-card shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">ผ่อนชำระ/เดือน</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">฿{totalMonthlyPay.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="glass-card shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Utilization</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${utilization > 70 ? 'text-red-600 dark:text-red-400' : utilization > 40 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {totalCreditLimit > 0 ? `${utilization}%` : '—'}
                </div>
              </CardContent>
            </Card>
            <Card className={`glass-card shadow-sm ${delinquentCount > 0 ? 'border-red-500/30' : ''}`}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground font-medium">สถานะผิดนัด</CardTitle>
                {delinquentCount > 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${delinquentCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {delinquentCount > 0 ? `${delinquentCount} บัญชี` : 'ไม่มี ✓'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      {(() => {
        const formatMonthLabel = (dateStr: string) => {
          const d = new Date(dateStr)
          return d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
        }

        const formatBaht = (value: number) => {
          return `฿${value.toLocaleString()}`
        }

        return (
          <Card className="glass-card shadow-lg p-6">
            <CardHeader className="px-0 pt-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-violet-500" />
                    ประวัติการพัฒนาเครดิตและหนี้สิน
                  </CardTitle>
                  <CardDescription>วิเคราะห์ทิศทางคะแนนเครดิตและยอดหนี้คงค้างรายเดือน</CardDescription>
                </div>
                
                {/* Tab Buttons */}
                <div className="flex bg-muted dark:bg-zinc-800 p-1 rounded-xl gap-1 self-stretch sm:self-auto">
                  <button
                    onClick={() => setActiveTab("score")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "score"
                        ? "bg-white dark:bg-zinc-900 shadow-sm text-violet-600 dark:text-violet-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    คะแนนเครดิต (Score)
                  </button>
                  <button
                    onClick={() => setActiveTab("debt")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "debt"
                        ? "bg-white dark:bg-zinc-900 shadow-sm text-violet-600 dark:text-violet-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ยอดคงค้าง & วงเงิน (Debt & Limit)
                  </button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="px-0 pb-0 pt-4">
              {activeTab === "score" ? (
                scoreHistory.length < 2 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Activity className="h-10 w-10 text-muted-foreground/50 mb-3 animate-pulse" />
                    <p className="font-medium">ต้องการประวัติอย่างน้อย 2 เดือนเพื่อคำนวณแนวโน้ม</p>
                    <p className="text-xs text-muted-foreground mt-1">อัปเดตคะแนนเครดิตของคุณในแต่ละรอบเดือนเพื่อสร้างกราฟแนวโน้ม</p>
                  </div>
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={scoreHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatMonthLabel} 
                          tick={{ fontSize: 11 }}
                          stroke="currentColor"
                          opacity={0.5}
                        />
                        <YAxis 
                          domain={[300, 900]} 
                          tick={{ fontSize: 11 }}
                          stroke="currentColor"
                          opacity={0.5}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderColor: '#8b5cf6',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#1f2937'
                          }}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                          formatter={(value: any) => [`${value} คะแนน`, 'คะแนนเครดิต']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#8b5cf6" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#scoreColor)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : (
                dynamicBalanceHistory.length < 2 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Activity className="h-10 w-10 text-muted-foreground/50 mb-3 animate-pulse" />
                    <p className="font-medium">ต้องการประวัติอย่างน้อย 2 เดือนเพื่อคำนวณแนวโน้ม</p>
                    <p className="text-xs text-muted-foreground mt-1">อัปเดตยอดคงค้างบัญชีสินเชื่ออย่างสม่ำเสมอเพื่อสร้างกราฟแนวโน้มหนี้สิน</p>
                  </div>
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dynamicBalanceHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="debtColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="limitColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatMonthLabel} 
                          tick={{ fontSize: 11 }}
                          stroke="currentColor"
                          opacity={0.5}
                        />
                        <YAxis 
                          tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 11 }}
                          stroke="currentColor"
                          opacity={0.5}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderColor: '#6366f1',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#1f2937'
                          }}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                          formatter={(value: any, name: any) => {
                            const nameLabel = name === 'outstandingBalance' ? 'ยอดคงค้าง' : name === 'creditLimit' ? 'วงเงินรวม' : 'ยอดผ่อนรายเดือน'
                            return [formatBaht(value), nameLabel]
                          }}
                        />
                          <Area 
                            type="monotone" 
                            dataKey="outstandingBalance" 
                            stroke="#ec4899" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#debtColor)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="creditLimit" 
                            stroke="#6366f1" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fillOpacity={1} 
                            fill="url(#limitColor)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          );
        })()}

      {/* Items List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">รายการบัญชีสินเชื่อ</h3>
        {displayedItems.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 bg-black/5 dark:bg-white/5 rounded-xl border border-border">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-violet-300" />
            <p>ยังไม่มีข้อมูลเครดิตบูโรสำหรับเดือนนี้</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayedItems.map((item) => {
              const st = statusLabels[item.status] || statusLabels.NORMAL
              const utilizationPct = item.creditLimit && item.creditLimit > 0
                ? Math.round((item.outstandingBalance / item.creditLimit) * 100)
                : null
              return (
                <Card key={item.id} className="glass-card hover-lift relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-violet-500/50" />
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="h-12 w-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                          <Building2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{item.accountName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.lender} · {typeLabels[item.accountType] || item.accountType}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color} font-medium`}>
                              {st.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.inquiryDate ? (
                                <>สืบค้นเมื่อ {new Date(item.inquiryDate).toLocaleDateString('th-TH')} (รายงาน {new Date(item.reportDate).toLocaleDateString('th-TH')})</>
                              ) : (
                                <>รายงานวันที่ {new Date(item.reportDate).toLocaleDateString('th-TH')}</>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-8 w-full md:w-auto justify-between md:justify-end items-center text-right">
                        {utilizationPct !== null && (
                          <div>
                            <p className="text-sm text-muted-foreground">Utilization</p>
                            <p className={`font-medium ${utilizationPct > 70 ? 'text-red-600' : utilizationPct > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {utilizationPct}%
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">ยอดคงค้าง</p>
                          <p className="font-bold text-xl text-violet-600 dark:text-violet-400">
                            ฿{item.outstandingBalance.toLocaleString()}
                          </p>
                          {item.monthlyPayment > 0 && (
                            <p className="text-[10px] text-muted-foreground">ผ่อน ฿{item.monthlyPayment.toLocaleString()}/เดือน</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditItem(item)} className="gap-1 border-violet-500/30 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950">
                            <Pencil className="h-3.5 w-3.5" /> แก้ไข
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteItem(item.id)} className="gap-1 border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(val) => !val && setEditItem(null)}>
        <DialogContent className="sm:max-w-[480px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>แก้ไขรายการเครดิตบูโร</DialogTitle>
            <DialogDescription>อัปเดตข้อมูลจากรายงาน NCB</DialogDescription>
          </DialogHeader>
          {editItem && <CreditBureauForm initialData={editItem} onSuccess={() => { setEditItem(null); fetchData() }} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
