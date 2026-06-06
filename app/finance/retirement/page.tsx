"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  ReferenceLine, Legend, BarChart, Bar
} from "recharts"
import {
  Loader2, Umbrella, TrendingUp, AlertTriangle,
  CheckCircle2, Target, Zap, Info, ChevronRight
} from "lucide-react"

type RetirementData = {
  currentAge: number
  totalSavings: number
  totalInvestments: number
}

// ─── Helper: Corpus calculation ───────────────────────────────
function calcCorpus(
  currentNestEgg: number,
  monthlyContrib: number,
  monthlyExpense: number,
  returnRate: number,
  inflationRate: number,
  retireAge: number,
  lifeExpectancy: number,
  currentAge: number,
) {
  const yearsToRetire = Math.max(retireAge - currentAge, 0)
  const yearsInRetirement = Math.max(lifeExpectancy - retireAge, 0)
  const realReturnRate = (returnRate - inflationRate) / 100
  const monthlyRealReturn = realReturnRate / 12
  const annualExpense = monthlyExpense * 12

  let targetCorpus = 0
  if (realReturnRate === 0) {
    targetCorpus = annualExpense * yearsInRetirement
  } else {
    targetCorpus = annualExpense * ((1 - Math.pow(1 + realReturnRate, -yearsInRetirement)) / realReturnRate)
  }

  let projectedCorpus = currentNestEgg
  const trajectoryData: { age: number; projected: number }[] = []

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    trajectoryData.push({ age, projected: Math.max(0, projectedCorpus) })
    if (age < retireAge) {
      for (let m = 0; m < 12; m++) {
        projectedCorpus = projectedCorpus * (1 + returnRate / 100 / 12) + monthlyContrib
      }
    } else {
      for (let m = 0; m < 12; m++) {
        projectedCorpus = projectedCorpus * (1 + monthlyRealReturn) - monthlyExpense
      }
    }
  }

  const corpusAtRetirement = trajectoryData[yearsToRetire]?.projected || 0

  const r = returnRate / 100 / 12
  const n = yearsToRetire * 12
  let requiredMonthly = 0
  if (n > 0 && r > 0) {
    const fvNestEgg = currentNestEgg * Math.pow(1 + r, n)
    const shortfall = targetCorpus - fvNestEgg
    requiredMonthly = shortfall > 0 ? (shortfall * r) / (Math.pow(1 + r, n) - 1) : 0
  } else if (n > 0) {
    requiredMonthly = Math.max((targetCorpus - currentNestEgg) / n, 0)
  }

  return { targetCorpus, corpusAtRetirement, trajectoryData, requiredMonthly, yearsToRetire, yearsInRetirement }
}

export default function RetirementPage() {
  const [data, setData] = useState<RetirementData | null>(null)
  const [loading, setLoading] = useState(true)

  // ─── Calculator State ───────────────────────────────────────
  const [retireAge, setRetireAge] = useState(60)
  const [lifeExpectancy, setLifeExpectancy] = useState(85)
  const [monthlyExpense, setMonthlyExpense] = useState(30000)
  const [monthlyContribution, setMonthlyContribution] = useState(5000)
  const [returnRate, setReturnRate] = useState(7)
  const [inflationRate, setInflationRate] = useState(3)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/retirement')
      if (res.ok) setData(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Safe defaults when data not yet loaded ──────────────────
  const currentAge = data?.currentAge ?? 30
  const currentNestEgg = (data?.totalSavings ?? 0) + (data?.totalInvestments ?? 0)

  // ─── Main Scenario ──────────────────────────────────────────
  const main = calcCorpus(currentNestEgg, monthlyContribution, monthlyExpense, returnRate, inflationRate, retireAge, lifeExpectancy, currentAge)
  const isOnTrack = main.corpusAtRetirement >= main.targetCorpus
  const progressPct = main.targetCorpus > 0 ? Math.min((main.corpusAtRetirement / main.targetCorpus) * 100, 100) : 0
  const gap = Math.max(main.requiredMonthly - monthlyContribution, 0)

  // ─── 4% Safe Withdrawal Rate shortcut ──────────────────────
  const corpus4pct = (monthlyExpense * 12) / 0.04

  // ─── Passive Income Crossover point ────────────────────────
  // Passive income = corpus × realReturnRate / 12 per month
  const crossoverAge = main.trajectoryData.findIndex(d => {
    const passiveIncome = d.projected * ((returnRate - inflationRate) / 100 / 12)
    return passiveIncome >= monthlyExpense
  })
  const crossoverPoint = crossoverAge >= 0 ? main.trajectoryData[crossoverAge]?.age : null

  // ─── 3 Scenario Comparison ──────────────────────────────────
  const scenarios = useMemo(() => [
    {
      label: "Conservative (5%)",
      color: "#64748b",
      result: calcCorpus(currentNestEgg, monthlyContribution, monthlyExpense, 5, inflationRate, retireAge, lifeExpectancy, currentAge),
    },
    {
      label: "Moderate (7%)",
      color: "#6366f1",
      result: calcCorpus(currentNestEgg, monthlyContribution, monthlyExpense, 7, inflationRate, retireAge, lifeExpectancy, currentAge),
    },
    {
      label: "Optimistic (10%)",
      color: "#10b981",
      result: calcCorpus(currentNestEgg, monthlyContribution, monthlyExpense, 10, inflationRate, retireAge, lifeExpectancy, currentAge),
    },
  ], [currentNestEgg, monthlyContribution, monthlyExpense, inflationRate, retireAge, lifeExpectancy, currentAge])

  const scenarioBarData = scenarios.map(s => ({
    name: s.label,
    "เงินก้อนที่จะมี": Math.round(s.result.corpusAtRetirement),
    "เป้าหมาย": Math.round(main.targetCorpus),
    fill: s.color,
  }))

  // ─── Guards (after all hooks) ────────────────────────────────
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
  if (!data) return null

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto pb-16">

      {/* ─── Header ─── */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gradient inline-flex items-center gap-2">
          <Umbrella className="h-8 w-8 text-indigo-500" /> วางแผนเกษียณ (Retirement Planner)
        </h2>
        <p className="text-muted-foreground mt-1">คำนวณเป้าหมายอิสรภาพทางการเงิน พยากรณ์เงินทุน และเปรียบเทียบสถานการณ์</p>
      </div>

      {/* ─── Progress Toward Target ─── */}
      <Card className="glass-card shadow-lg border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-violet-500/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-sm text-muted-foreground">ความคืบหน้าสู่เป้าหมายเกษียณ</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                มีอยู่แล้ว ฿{currentNestEgg.toLocaleString()} จากเป้า ฿{Math.round(main.targetCorpus).toLocaleString()}
              </p>
            </div>
            <div className={`text-3xl font-black ${isOnTrack ? 'text-emerald-500' : 'text-amber-500'}`}>
              {progressPct.toFixed(1)}%
              <span className="ml-2 text-sm font-medium">{isOnTrack ? '✅ On Track' : '⚠️ Off Track'}</span>
            </div>
          </div>
          <div className="w-full h-4 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isOnTrack ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Main Grid ─── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Input Panel */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="glass-card shadow-lg border-indigo-500/20">
            <CardHeader className="pb-4">
              <CardTitle>ตัวแปรการคำนวณ</CardTitle>
              <CardDescription>ปรับค่าเพื่อจำลองสถานการณ์</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>อายุเกษียณ</Label>
                  <span className="font-bold text-indigo-600">{retireAge} ปี</span>
                </div>
                <input type="range" className="w-full accent-indigo-500" min={currentAge + 1} max={80} step={1} value={retireAge} onChange={e => setRetireAge(Number(e.target.value))} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{currentAge + 1}</span><span>80</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>อายุขัยที่วางแผน</Label>
                  <span className="font-bold text-indigo-600">{lifeExpectancy} ปี</span>
                </div>
                <input type="range" className="w-full accent-indigo-500" min={retireAge + 1} max={120} step={1} value={lifeExpectancy} onChange={e => setLifeExpectancy(Number(e.target.value))} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{retireAge + 1}</span><span>120</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>ค่าใช้จ่าย/เดือน หลังเกษียณ (฿)</Label>
                <p className="text-xs text-muted-foreground">มูลค่าเงินปัจจุบัน (ระบบปรับเงินเฟ้อให้อัตโนมัติ)</p>
                <Input type="number" value={monthlyExpense} onChange={e => setMonthlyExpense(Number(e.target.value))} />
              </div>

              <div className="space-y-1.5">
                <Label>ออม/ลงทุนเพิ่มต่อเดือน (฿)</Label>
                <Input type="number" value={monthlyContribution} onChange={e => setMonthlyContribution(Number(e.target.value))} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div className="space-y-1.5">
                  <Label className="text-xs">ผลตอบแทน/ปี (%)</Label>
                  <Input type="number" value={returnRate} onChange={e => setReturnRate(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">เงินเฟ้อ/ปี (%)</Label>
                  <Input type="number" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value))} />
                </div>
              </div>

              {/* 4% Rule Shortcut */}
              <div className="p-3 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <Zap className="h-3.5 w-3.5" /> กฎ 4% (Safe Withdrawal Rate)
                </div>
                <p className="text-xs text-muted-foreground">ถอนใช้ไม่เกิน 4%/ปี เงินจะไม่หมดใน 30+ ปี</p>
                <p className="font-bold text-sm">เป้าหมาย: ฿{Math.round(corpus4pct).toLocaleString()}</p>
                <Button variant="outline" size="sm" className="w-full h-7 text-xs border-indigo-500/30 text-indigo-600" onClick={() => {}}>
                  ใช้ค่านี้เป็นเป้าหมาย <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results + Chart Panel */}
        <div className="space-y-6 lg:col-span-2">

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="glass-card shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Target className="h-20 w-20 text-blue-500" /></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">เป้าหมายเงินก้อน ณ อายุ {retireAge} ปี</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400">฿{Math.round(main.targetCorpus).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">ใช้เดือนละ ฿{monthlyExpense.toLocaleString()} ไปอีก {main.yearsInRetirement} ปี (ปรับเงินเฟ้อแล้ว)</p>
              </CardContent>
            </Card>

            <Card className={`glass-card shadow-lg relative overflow-hidden ${isOnTrack ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
              <div className="absolute top-0 right-0 p-4 opacity-5">
                {isOnTrack ? <CheckCircle2 className="h-20 w-20 text-emerald-500" /> : <AlertTriangle className="h-20 w-20 text-amber-500" />}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">พยากรณ์ ณ อายุ {retireAge} ปี (ตามแผนปัจจุบัน)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-black ${isOnTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  ฿{Math.round(main.corpusAtRetirement).toLocaleString()}
                </div>
                {isOnTrack ? (
                  <p className="text-xs text-emerald-600 font-medium mt-1">🎉 แผนปัจจุบันเข้าเป้าแล้ว! เหลือเกิน ฿{Math.round(main.corpusAtRetirement - main.targetCorpus).toLocaleString()}</p>
                ) : (
                  <p className="text-xs text-amber-600 font-medium mt-1">⚠️ ยังขาดอีก ฿{Math.round(main.targetCorpus - main.corpusAtRetirement).toLocaleString()}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Passive Income Crossover Badge */}
          {crossoverPoint && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
              <Zap className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-400">
                  จุดอิสรภาพทางการเงิน (Passive Income Crossover) — อายุ {crossoverPoint} ปี
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ผลตอบแทนพอร์ตของคุณจะแซงค่าใช้จ่ายรายเดือน (฿{monthlyExpense.toLocaleString()}) ที่อายุนี้ เงินจะ "งอก" เองโดยไม่ต้องทำงาน
                </p>
              </div>
            </div>
          )}

          {/* Action Plan Banner */}
          {!isOnTrack && gap > 0 && (
            <div className="flex items-start gap-4 p-5 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <TrendingUp className="h-7 w-7 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 dark:text-amber-400">แผนปรับปรุง (Action Plan)</h4>
                <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mt-1">
                  ควรเพิ่มเงินออม/ลงทุนอีก{" "}
                  <strong className="text-amber-600 dark:text-amber-400 text-base">฿{Math.round(gap).toLocaleString()}/เดือน</strong>
                  {" "}(รวมเป็น ฿{Math.round(main.requiredMonthly).toLocaleString()}/เดือน) หรือลดค่าใช้จ่ายหลังเกษียณ หรือยืดอายุเกษียณออกไป
                </p>
              </div>
            </div>
          )}

          {/* Trajectory Chart */}
          <Card className="glass-card shadow-lg">
            <CardHeader>
              <CardTitle>พยากรณ์การเติบโตความมั่งคั่ง (Wealth Trajectory)</CardTitle>
              <CardDescription>
                สะสม (สีเขียว) → เกษียณ → ร่อยหรอ | เส้นประน้ำเงิน = เป้าหมาย | เส้นประม่วง = จุดเกษียณ
                {crossoverPoint && ` | ⚡ อิสรภาพทางการเงิน อายุ ${crossoverPoint} ปี`}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={main.trajectoryData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isOnTrack ? '#10b981' : '#f59e0b'} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={isOnTrack ? '#10b981' : '#f59e0b'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} tickMargin={8} minTickGap={15} label={{ value: 'อายุ (ปี)', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1_000_000 ? `฿${(v / 1_000_000).toFixed(1)}M` : `฿${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip
                    formatter={(value: any) => [`฿${Math.round(value as number).toLocaleString()}`, 'ยอดเงินสะสม']}
                    labelFormatter={label => `อายุ ${label} ปี`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,15,20,0.9)', color: '#fff' }}
                  />
                  <ReferenceLine x={retireAge} stroke="#6366f1" strokeDasharray="4 3" strokeWidth={1.5} label={{ position: 'top', value: '🎯 เกษียณ', fill: '#6366f1', fontSize: 11 }} />
                  {crossoverPoint && (
                    <ReferenceLine x={crossoverPoint} stroke="#a855f7" strokeDasharray="4 3" strokeWidth={1.5} label={{ position: 'insideTopRight', value: '⚡', fill: '#a855f7', fontSize: 14 }} />
                  )}
                  <ReferenceLine y={main.targetCorpus} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="projected" stroke={isOnTrack ? '#10b981' : '#f59e0b'} strokeWidth={2.5} fillOpacity={1} fill="url(#colorProjected)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── 3 Scenario Comparison ─────────────────────────────── */}
      <Card className="glass-card shadow-lg border-slate-500/20 bg-gradient-to-br from-slate-500/5 to-indigo-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-slate-500" />
            เปรียบเทียบ 3 สถานการณ์ (Scenario Analysis)
          </CardTitle>
          <CardDescription>
            ผลลัพธ์ที่แตกต่างตามสมมติฐานผลตอบแทน (Conservative / Moderate / Optimistic) เทียบกับเป้าหมาย ฿{Math.round(main.targetCorpus).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bar Chart */}
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarioBarData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1_000_000 ? `฿${(v / 1_000_000).toFixed(1)}M` : `฿${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  formatter={(v: any, name: any) => [`฿${Number(v).toLocaleString()}`, name]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,15,20,0.9)', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="เงินก้อนที่จะมี" radius={[6, 6, 0, 0]}
                  fill="#6366f1"
                  label={{ position: 'top', fontSize: 10, formatter: (v: any) => v >= 1_000_000 ? `฿${(v / 1_000_000).toFixed(1)}M` : `฿${(v / 1000).toFixed(0)}k` }}
                />
                <Bar dataKey="เป้าหมาย" radius={[6, 6, 0, 0]} fill="#3b82f620" stroke="#3b82f6" strokeWidth={1.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {scenarios.map(s => {
              const ok = s.result.corpusAtRetirement >= main.targetCorpus
              return (
                <div key={s.label} className={`p-4 rounded-xl border ${ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                  <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
                  <p className="text-xl font-black mt-1">฿{Math.round(s.result.corpusAtRetirement).toLocaleString()}</p>
                  <p className={`text-xs mt-1 font-medium ${ok ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {ok
                      ? `✅ เกิน ฿${Math.round(s.result.corpusAtRetirement - main.targetCorpus).toLocaleString()}`
                      : `❌ ขาด ฿${Math.round(main.targetCorpus - s.result.corpusAtRetirement).toLocaleString()}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ออม {s.result.requiredMonthly > monthlyContribution
                      ? `เพิ่ม ฿${Math.round(Math.max(s.result.requiredMonthly - monthlyContribution, 0)).toLocaleString()}/เดือน`
                      : 'ตามแผนปัจจุบัน ✓'}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
