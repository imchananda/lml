"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { ArrowDownRight, ArrowUpRight, Wallet, Target, DollarSign, Loader2, AlertTriangle, Bot } from "lucide-react"
import { CashflowSankey } from "@/components/charts/CashflowSankey"
import { NetWorthAreaChart } from "@/components/charts/NetWorthAreaChart"
import { InsightWidget } from "@/components/ai/InsightWidget"
import dynamic from "next/dynamic"

const DownloadReportButton = dynamic(
  () => import("@/components/pdf/DownloadReportButton").then(m => m.DownloadReportButton),
  { ssr: false }
)

type SummaryData = {
  totalIncome: number
  projectedIncome: number
  totalExpense: number
  netCashflow: number
  netWorth: number
  savingsRate: number
  byCategory: { name: string; value: number; color: string }[]
  recentTransactions: { id: string; description: string; date: string; amount: number; type: string }[]
  cashflow: { month: string; income: number; expense: number }[]
  netWorthHistory: { month: string; netWorth: number; assets: number; debt: number }[]
  goals: { id: string; name: string; targetAmount: number; savedAmount: number; color: string }[]
}

export default function DashboardPage() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [budgets, setBudgets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [res, budgetRes] = await Promise.all([
        fetch('/api/finance/summary'),
        fetch('/api/finance/budget')
      ])
      
      if (res.ok) {
        setData(await res.json())
      } else {
        const err = await res.json().catch(() => ({}))
        setErrorMsg(`Error ${res.status}: ${err.error || res.statusText}`)
      }

      if (budgetRes.ok) {
        setBudgets(await budgetRes.json())
      }
    } catch (e: any) {
      setErrorMsg(`Network Error: ${e.message}`)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
  if (errorMsg) return <div className="text-center text-red-500 py-20">{errorMsg}</div>
  if (!data) return <div className="text-center text-muted-foreground py-20">Failed to load data</div>

  // Filter top 3 critical budgets: over budget or warning (>= 80%)
  const criticalBudgets = budgets
    .map(b => ({ ...b, pct: Math.min((b.spent / b.amount) * 100, 100) }))
    .filter(b => b.pct >= 80)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-gradient inline-block w-fit">Dashboard</h2>
        <DownloadReportButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card shadow-lg shadow-emerald-500/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">฿{data.netWorth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Assets − Debts</p>
          </CardContent>
        </Card>
        <Card className="glass-card shadow-lg shadow-black/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{data.totalIncome.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="glass-card shadow-lg shadow-black/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expense</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{data.totalExpense.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="glass-card shadow-lg shadow-black/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.savingsRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">฿{data.netCashflow.toLocaleString()} remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts Widget */}
      {criticalBudgets.length > 0 && (
        <Card className="glass-card shadow-lg shadow-amber-500/5 border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              แจ้งเตือนงบประมาณ (Budget Alerts)
            </CardTitle>
            <CardDescription>หมวดหมู่ที่ใช้เงินใกล้ถึงหรือเกินเพดานที่ตั้งไว้ในเดือนนี้</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="grid gap-4 md:grid-cols-3">
               {criticalBudgets.map(b => {
                 const over = b.spent > b.amount
                 const colorClass = over ? 'text-red-500' : 'text-amber-500'
                 const barColor = over ? 'bg-red-500' : 'bg-amber-500'
                 return (
                   <div key={b.id} className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-amber-500/20">
                     <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-semibold">{b.category.name}</p>
                        <span className={`text-xs font-bold ${colorClass}`}>{b.pct.toFixed(0)}%</span>
                     </div>
                     <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50 mb-2">
                        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${b.pct}%` }} />
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">฿{b.spent.toLocaleString()} / ฿{b.amount.toLocaleString()}</span>
                        {over && <span className="text-red-500 font-medium">Over ฿{(b.spent - b.amount).toLocaleString()}</span>}
                     </div>
                   </div>
                 )
               })}
             </div>
          </CardContent>
        </Card>
      )}

      {/* 50/30/20 Widget */}
      {data.projectedIncome > 0 && (
        <Card className="glass-card shadow-lg shadow-indigo-500/5 border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-500" />
              โควต้าการจัดสรรเงินเดือนนี้ (50/30/20 Rule)
            </CardTitle>
            <CardDescription>คำนวณจากรายได้คาดการณ์ (฿{data.projectedIncome.toLocaleString()}) เพื่อรักษาสมดุลทางการเงิน</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-blue-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><Wallet className="h-16 w-16 text-blue-500" /></div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Needs (50%)</p>
                <p className="text-xs text-muted-foreground mb-2">ค่าใช้จ่ายจำเป็น (ค่าเช่า, ค่าอาหาร, เดินทาง)</p>
                <p className="text-2xl font-bold">฿{(data.projectedIncome * 0.5).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-pink-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign className="h-16 w-16 text-pink-500" /></div>
                <p className="text-sm font-semibold text-pink-600 dark:text-pink-400">Wants (30%)</p>
                <p className="text-xs text-muted-foreground mb-2">ให้รางวัลตัวเอง (ช้อปปิ้ง, ดูหนัง, กินหรู)</p>
                <p className="text-2xl font-bold">฿{(data.projectedIncome * 0.3).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><ArrowUpRight className="h-16 w-16 text-emerald-500" /></div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Savings & Debt (20%)</p>
                <p className="text-xs text-muted-foreground mb-2">ออมเงิน, ลงทุน, และโปะหนี้ดอกเบี้ยสูง</p>
                <p className="text-2xl font-bold">฿{(data.projectedIncome * 0.2).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Net Worth Area Chart */}
      <Card className="glass-card shadow-lg shadow-blue-500/5 border-blue-500/20 bg-gradient-to-br from-background to-blue-500/5">
        <CardHeader>
          <CardTitle>Net Worth Growth (ภูเขาความมั่งคั่ง)</CardTitle>
          <CardDescription>การเติบโตของสินทรัพย์เทียบกับหนี้สิน (6 เดือนย้อนหลัง)</CardDescription>
        </CardHeader>
        <CardContent>
          <NetWorthAreaChart data={data.netWorthHistory} />
        </CardContent>
      </Card>

      {/* Cashflow Sankey Diagram */}
      <Card className="glass-card shadow-lg shadow-emerald-500/5 border-emerald-500/20 bg-gradient-to-br from-background to-emerald-500/5">
        <CardHeader>
          <CardTitle>Cashflow River (กระแสเงินสดเดือนนี้)</CardTitle>
          <CardDescription>สแกนรอยรั่วทางการเงิน ดูว่ารายรับของคุณไหลไปลงที่ท่อไหนมากที่สุด</CardDescription>
        </CardHeader>
        <CardContent>
          <CashflowSankey data={data} />
        </CardContent>
      </Card>

      {/* ─── AI Insight Widgets ─────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-violet-500" />
          <h3 className="text-lg font-bold">AI Financial Insights</h3>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400">Powered by Gemini</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <InsightWidget type="MONTHLY_CASHFLOW" />
          <InsightWidget type="PORTFOLIO_HEALTH" />
          <InsightWidget type="TAX_ALERT" />
          <InsightWidget type="DEBT_ALERT" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 glass-card shadow-lg shadow-black/5">
          <CardHeader>
            <CardTitle>Cashflow (6 Months)</CardTitle>
            <CardDescription>Income vs Expenses over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pl-2">
            {data.cashflow.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={data.cashflow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `฿${v / 1000}k`} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data yet. Add some transactions!</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 glass-card shadow-lg shadow-black/5">
          <CardHeader>
            <CardTitle>Expense by Category</CardTitle>
            <CardDescription>Where your money went this month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={data.byCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {data.byCategory.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No expenses this month.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card shadow-lg shadow-black/5">
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            {data.recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0">
                    <div className="flex items-center space-x-4">
                      <div className={`rounded-full p-2 ${tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {tx.type === 'INCOME' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description || 'No description'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('th-TH')}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}฿{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No transactions yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card shadow-lg shadow-black/5">
          <CardHeader><CardTitle>Goal Progress</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {data.goals.length > 0 ? data.goals.map(g => {
              const pct = g.targetAmount > 0 ? Math.min((g.savedAmount / g.targetAmount) * 100, 100) : 0
              return (
                <div key={g.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center font-medium"><Target className="mr-2 h-4 w-4 text-indigo-500" />{g.name}</div>
                    <span className="text-muted-foreground">฿{g.savedAmount.toLocaleString()} / ฿{g.targetAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                  </div>
                </div>
              )
            }) : (
              <p className="text-muted-foreground text-center py-8">No goals yet. Set your first one!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
