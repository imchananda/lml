"use client"

import { useState, useEffect, useMemo } from "react"
import { calculateTax, TAX_BRACKETS } from "@/lib/calculators/tax"
import { TaxProfileData } from "@/types/tax"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calculator, Save, TrendingDown, Info, Shield, PiggyBank, Briefcase, Landmark, Home, Heart, GraduationCap, HeartPulse, Target, Sparkles } from "lucide-react"
import { TaxWaterfall } from "@/components/charts/TaxWaterfall"

const defaultProfile: TaxProfileData = {
  year: new Date().getFullYear(),
  estimatedIncome: 600000,
  bonus: 0,
  hasSpouse: false,
  childrenCount: 0,
  parentsCount: 0,
  providentFund: 0,
  lifeInsurance: 0,
  healthInsurance: 0,
  pensionInsurance: 0,
  ssf: 0,
  rmf: 0,
  thaiEsg: 0,
  socialSecurity: 9000,
  homeLoanInterest: 0,
  donations: 0,
  eduDonations: 0,
  otherDeductions: 0,
}

export default function TaxPlannerPage() {
  const [profile, setProfile] = useState<TaxProfileData>(defaultProfile)
  const [actualInvestments, setActualInvestments] = useState<{ssf: number, rmf: number, thaiEsg: number} | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())

  const fetchTaxData = (year: string) => {
    setIsLoading(true)
    fetch('/api/finance/tax?year=' + year)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          if (data.profile) {
            setProfile({ ...defaultProfile, ...data.profile })
          } else {
            setProfile({ ...defaultProfile, ...data })
          }
          if (data.actualInvestments) {
            setActualInvestments(data.actualInvestments)
          } else {
            setActualInvestments(null)
          }
        }
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchTaxData(selectedYear)
  }, [selectedYear])

  // Calculate current tax
  const taxResult = useMemo(() => calculateTax(profile), [profile])

  // Calculate "Base" tax (if we didn't buy any optional deductions)
  const baseProfile = useMemo(() => ({
    ...profile,
    ssf: 0, rmf: 0, thaiEsg: 0, lifeInsurance: 0, healthInsurance: 0, pensionInsurance: 0,
    donations: 0, eduDonations: 0
  }), [profile])
  const baseTaxResult = useMemo(() => calculateTax(baseProfile), [baseProfile])

  // Tax saved by current inputs
  const taxSaved = Math.max(0, baseTaxResult.taxAmount - taxResult.taxAmount)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch('/api/finance/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (field: keyof TaxProfileData, value: number | boolean) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleUseActual = (field: 'ssf' | 'rmf' | 'thaiEsg') => {
    if (actualInvestments) {
      handleChange(field, actualInvestments[field])
    }
  }

  if (isLoading && profile.estimatedIncome === defaultProfile.estimatedIncome) {
    return <div className="p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  }

  // Bracket visualization
  const currentBracketIndex = TAX_BRACKETS.findIndex(b => b.rate * 100 === taxResult.marginalTaxRate)
  const nextBracket = TAX_BRACKETS[currentBracketIndex + 1]
  const currentBracket = TAX_BRACKETS[currentBracketIndex]
  
  // Calculate progress within the current bracket
  let bracketProgress = 0;
  if (currentBracket && nextBracket) {
    const bracketSize = (currentBracket.max ?? Infinity) - currentBracket.min;
    const amountInBracket = taxResult.netIncome - currentBracket.min;
    bracketProgress = Math.min(100, Math.max(0, (amountInBracket / bracketSize) * 100));
  } else if (!nextBracket) {
    bracketProgress = 100; // Top bracket
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            Smart Tax Planner
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            จำลองและวางแผนลดหย่อนภาษี เพื่อสร้างความมั่งคั่งให้เต็มประสิทธิภาพ
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val || "")}>
            <SelectTrigger className="w-[120px] bg-background">
              <SelectValue placeholder="เลือกปีภาษี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={(new Date().getFullYear() - 1).toString()}>ปี {new Date().getFullYear() - 1}</SelectItem>
              <SelectItem value={(new Date().getFullYear()).toString()}>ปี {new Date().getFullYear()}</SelectItem>
              <SelectItem value={(new Date().getFullYear() + 1).toString()}>ปี {new Date().getFullYear() + 1}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={isSaving || isLoading} className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white shadow-lg transition-all hover:scale-105">
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Plan"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Simulator Inputs */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <Tabs defaultValue="income" className="w-full flex flex-col gap-6">
            <ScrollArea className="w-full pb-2">
              <TabsList className="inline-flex min-w-[500px] w-full md:grid md:grid-cols-4 bg-secondary/50 p-1.5 rounded-2xl shadow-inner">
                <TabsTrigger value="income" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all">รายได้ & พื้นฐาน</TabsTrigger>
                <TabsTrigger value="investments" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all">ออม & ลงทุน</TabsTrigger>
                <TabsTrigger value="insurance" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all">ประกันภัย</TabsTrigger>
                <TabsTrigger value="other" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all">ลดหย่อนอื่นๆ</TabsTrigger>
              </TabsList>
            </ScrollArea>
            
            <div className="mt-6 border rounded-2xl bg-card/50 backdrop-blur-sm p-1 shadow-sm">
              {/* INCOME TAB */}
              <TabsContent value="income" className="p-6 space-y-8 mt-0 focus-visible:outline-none">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Briefcase className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">รายได้ประเมินทั้งปี</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">เงินเดือนทั้งปี (รวมโบนัส)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">฿</span>
                        <Input 
                          type="number" 
                          className="pl-8 text-lg"
                          value={profile.estimatedIncome} 
                          onChange={(e) => handleChange('estimatedIncome', Number(e.target.value))} 
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">ประกันสังคม (สูงสุด 9,000)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">฿</span>
                        <Input 
                          type="number" 
                          className="pl-8 text-lg"
                          value={profile.socialSecurity} 
                          onChange={(e) => handleChange('socialSecurity', Number(e.target.value))} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pb-2 border-b pt-4">
                    <HeartPulse className="w-5 h-5 text-rose-500" />
                    <h3 className="text-lg font-semibold">ครอบครัว</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col space-y-4 justify-center bg-secondary/30 p-4 rounded-xl">
                      <Label className="text-sm font-medium">คู่สมรสไม่มีรายได้</Label>
                      <Switch 
                        checked={profile.hasSpouse} 
                        onCheckedChange={(v) => handleChange('hasSpouse', v)} 
                      />
                    </div>
                    <div className="space-y-3 bg-secondary/30 p-4 rounded-xl">
                      <Label className="text-sm font-medium">บุตร (คนละ 30,000)</Label>
                      <Input 
                        type="number" 
                        min="0"
                        value={profile.childrenCount} 
                        onChange={(e) => handleChange('childrenCount', Number(e.target.value))} 
                      />
                    </div>
                    <div className="space-y-3 bg-secondary/30 p-4 rounded-xl">
                      <Label className="text-sm font-medium">บิดามารดา (คนละ 30,000)</Label>
                      <Input 
                        type="number" 
                        min="0"
                        value={profile.parentsCount} 
                        onChange={(e) => handleChange('parentsCount', Number(e.target.value))} 
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* INVESTMENTS TAB */}
              <TabsContent value="investments" className="p-6 space-y-8 mt-0 focus-visible:outline-none">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <TrendingDown className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-semibold">ลดหย่อนกลุ่มเกษียณและกองทุน (สูงสุด 500,000)</h3>
                </div>
                
                <div className="space-y-8">
                  {/* PVD */}
                  <div className="space-y-4 bg-secondary/20 p-4 rounded-xl border border-secondary/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-base font-semibold">กองทุนสำรองเลี้ยงชีพ (Provident Fund)</Label>
                        <p className="text-xs text-muted-foreground mt-1">เพดาน: 15% ของรายได้</p>
                      </div>
                      <span className="text-lg font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(profile.providentFund)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider 
                        className="flex-1"
                        value={[profile.providentFund]} 
                        max={Math.min(500000, taxResult.totalIncome * 0.15)} 
                        step={100} 
                        onValueChange={(v: any) => handleChange('providentFund', v[0])} 
                      />
                      <Input 
                        type="number" 
                        className="w-28 text-right font-mono" 
                        value={profile.providentFund} 
                        onChange={(e) => handleChange('providentFund', Number(e.target.value))} 
                      />
                    </div>
                  </div>

                  {/* SSF */}
                  <div className="space-y-4 bg-secondary/20 p-4 rounded-xl border border-secondary/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-base font-semibold">กองทุน SSF</Label>
                        <p className="text-xs text-muted-foreground mt-1">เพดาน: 30% ของรายได้ ไม่เกิน 200,000</p>
                        {Math.min(200000, taxResult.totalIncome * 0.3) - profile.ssf > 0 && (
                          <div className="flex items-start gap-1.5 mt-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-2 rounded-lg border border-emerald-500/20 text-xs">
                            <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>ซื้อเพิ่มได้อีก <strong>{formatCurrency(Math.min(200000, taxResult.totalIncome * 0.3) - profile.ssf)}</strong> (ช่วยประหยัดภาษีเพิ่ม <strong>{formatCurrency((Math.min(200000, taxResult.totalIncome * 0.3) - profile.ssf) * (taxResult.marginalTaxRate / 100))}</strong>)</span>
                          </div>
                        )}
                      </div>
                      <span className="text-lg font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(profile.ssf)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider 
                        className="flex-1"
                        value={[profile.ssf]} 
                        max={Math.min(200000, taxResult.totalIncome * 0.3)} 
                        step={100} 
                        onValueChange={(v: any) => handleChange('ssf', v[0])} 
                      />
                      <Input 
                        type="number" 
                        className="w-28 text-right font-mono" 
                        value={profile.ssf} 
                        onChange={(e) => handleChange('ssf', Number(e.target.value))} 
                      />
                    </div>
                    {actualInvestments?.ssf ? (
                      <div className="flex items-center justify-between bg-emerald-500/10 px-3 py-2 rounded-md">
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">ตรวจพบการลงทุนจริง: {formatCurrency(actualInvestments.ssf)}</span>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUseActual('ssf')}>ใช้ค่านี้</Button>
                      </div>
                    ) : null}
                  </div>

                  {/* RMF */}
                  <div className="space-y-4 bg-secondary/20 p-4 rounded-xl border border-secondary/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-base font-semibold">กองทุน RMF</Label>
                        <p className="text-xs text-muted-foreground mt-1">เพดาน: 30% ของรายได้ ไม่เกิน 500,000</p>
                        {Math.min(500000, taxResult.totalIncome * 0.3) - profile.rmf > 0 && (
                          <div className="flex items-start gap-1.5 mt-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-2 rounded-lg border border-emerald-500/20 text-xs">
                            <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>ซื้อเพิ่มได้อีก <strong>{formatCurrency(Math.min(500000, taxResult.totalIncome * 0.3) - profile.rmf)}</strong> (ช่วยประหยัดภาษีเพิ่ม <strong>{formatCurrency((Math.min(500000, taxResult.totalIncome * 0.3) - profile.rmf) * (taxResult.marginalTaxRate / 100))}</strong>)</span>
                          </div>
                        )}
                      </div>
                      <span className="text-lg font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(profile.rmf)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider 
                        className="flex-1"
                        value={[profile.rmf]} 
                        max={Math.min(500000, taxResult.totalIncome * 0.3)} 
                        step={100} 
                        onValueChange={(v: any) => handleChange('rmf', v[0])} 
                      />
                      <Input 
                        type="number" 
                        className="w-28 text-right font-mono" 
                        value={profile.rmf} 
                        onChange={(e) => handleChange('rmf', Number(e.target.value))} 
                      />
                    </div>
                    {actualInvestments?.rmf ? (
                      <div className="flex items-center justify-between bg-emerald-500/10 px-3 py-2 rounded-md">
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">ตรวจพบการลงทุนจริง: {formatCurrency(actualInvestments.rmf)}</span>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUseActual('rmf')}>ใช้ค่านี้</Button>
                      </div>
                    ) : null}
                  </div>
                  
                  {/* Thai ESG */}
                  <div className="flex items-center gap-2 pb-2 border-b pt-4">
                    <Landmark className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-lg font-semibold">กองทุน Thai ESG (แยกเพดานต่างหาก)</h3>
                  </div>
                  <div className="space-y-4 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/20">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-base font-semibold">Thai ESG</Label>
                        <p className="text-xs text-muted-foreground mt-1">เพดาน: 30% ของรายได้ ไม่เกิน 300,000</p>
                      </div>
                      <span className="text-lg font-mono font-medium text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(profile.thaiEsg)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider 
                        className="flex-1"
                        value={[profile.thaiEsg]} 
                        max={Math.min(300000, taxResult.totalIncome * 0.3)} 
                        step={100} 
                        onValueChange={(v: any) => handleChange('thaiEsg', v[0])} 
                      />
                      <Input 
                        type="number" 
                        className="w-28 text-right font-mono" 
                        value={profile.thaiEsg} 
                        onChange={(e) => handleChange('thaiEsg', Number(e.target.value))} 
                      />
                    </div>
                    {actualInvestments?.thaiEsg ? (
                      <div className="flex items-center justify-between bg-indigo-500/10 px-3 py-2 rounded-md">
                        <span className="text-xs text-indigo-700 dark:text-indigo-400">ตรวจพบการลงทุนจริง: {formatCurrency(actualInvestments.thaiEsg)}</span>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUseActual('thaiEsg')}>ใช้ค่านี้</Button>
                      </div>
                    ) : null}
                  </div>

                </div>
              </TabsContent>

              {/* INSURANCE TAB */}
              <TabsContent value="insurance" className="p-6 space-y-8 mt-0 focus-visible:outline-none">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Shield className="w-5 h-5 text-violet-500" />
                  <h3 className="text-lg font-semibold">ประกันชีวิตและสุขภาพ (สูงสุด 100,000)</h3>
                </div>
                
                <div className="space-y-8">
                  {/* Life Insurance */}
                  <div className="space-y-4 bg-secondary/20 p-4 rounded-xl border border-secondary/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-base font-semibold">ประกันชีวิตทั่วไป</Label>
                        <p className="text-xs text-muted-foreground mt-1">สูงสุด 100,000 บาท</p>
                      </div>
                      <span className="text-lg font-mono font-medium text-violet-600 dark:text-violet-400">
                        {formatCurrency(profile.lifeInsurance)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider 
                        className="flex-1"
                        value={[profile.lifeInsurance]} 
                        max={100000} 
                        step={100} 
                        onValueChange={(v: any) => handleChange('lifeInsurance', v[0])} 
                      />
                      <Input 
                        type="number" 
                        className="w-28 text-right font-mono" 
                        value={profile.lifeInsurance} 
                        onChange={(e) => handleChange('lifeInsurance', Number(e.target.value))} 
                      />
                    </div>
                  </div>

                  {/* Health Insurance */}
                  <div className="space-y-4 bg-secondary/20 p-4 rounded-xl border border-secondary/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-base font-semibold">ประกันสุขภาพ</Label>
                        <p className="text-xs text-muted-foreground mt-1">สูงสุด 25,000 บาท</p>
                      </div>
                      <span className="text-lg font-mono font-medium text-violet-600 dark:text-violet-400">
                        {formatCurrency(profile.healthInsurance)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider 
                        className="flex-1"
                        value={[profile.healthInsurance]} 
                        max={25000} 
                        step={100} 
                        onValueChange={(v: any) => handleChange('healthInsurance', v[0])} 
                      />
                      <Input 
                        type="number" 
                        className="w-28 text-right font-mono" 
                        value={profile.healthInsurance} 
                        onChange={(e) => handleChange('healthInsurance', Number(e.target.value))} 
                      />
                    </div>
                  </div>

                  {/* Pension Insurance */}
                  <div className="flex items-center gap-2 pb-2 border-b pt-4">
                    <PiggyBank className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-semibold">ประกันชีวิตแบบบำนาญ</h3>
                  </div>
                  <div className="space-y-4 bg-orange-500/5 p-4 rounded-xl border border-orange-500/20">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-base font-semibold">ประกันบำนาญ</Label>
                        <p className="text-xs text-muted-foreground mt-1">เพดาน: 15% ของรายได้ ไม่เกิน 200,000</p>
                      </div>
                      <span className="text-lg font-mono font-medium text-orange-600 dark:text-orange-400">
                        {formatCurrency(profile.pensionInsurance)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider 
                        className="flex-1"
                        value={[profile.pensionInsurance]} 
                        max={Math.min(200000, taxResult.totalIncome * 0.15)} 
                        step={100} 
                        onValueChange={(v: any) => handleChange('pensionInsurance', v[0])} 
                      />
                      <Input 
                        type="number" 
                        className="w-28 text-right font-mono" 
                        value={profile.pensionInsurance} 
                        onChange={(e) => handleChange('pensionInsurance', Number(e.target.value))} 
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* OTHER DEDUCTIONS TAB */}
              <TabsContent value="other" className="p-6 space-y-8 mt-0 focus-visible:outline-none">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Home className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold">ลดหย่อนอสังหาฯ และเงินบริจาค</h3>
                </div>

                <div className="space-y-6">
                  {/* Home Loan Interest */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">ดอกเบี้ยกู้ยืมเพื่อที่อยู่อาศัย</Label>
                      <span className="text-xs text-muted-foreground">สูงสุด 100,000</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">฿</span>
                      <Input 
                        type="number" 
                        className="pl-8 text-lg bg-secondary/20"
                        value={profile.homeLoanInterest} 
                        onChange={(e) => handleChange('homeLoanInterest', Number(e.target.value))} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Education/Hospital Donations */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label className="text-sm font-medium flex items-center gap-2"><GraduationCap className="w-4 h-4 text-rose-500"/> บริจาค การศึกษา/พยาบาล/กีฬา</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">ลดหย่อนได้ 2 เท่า (ไม่เกิน 10% ของเงินได้สุทธิ)</p>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">฿</span>
                        <Input 
                          type="number" 
                          className="pl-8 bg-secondary/20"
                          value={profile.eduDonations} 
                          onChange={(e) => handleChange('eduDonations', Number(e.target.value))} 
                        />
                      </div>
                    </div>

                    {/* Normal Donations */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label className="text-sm font-medium flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500"/> บริจาคทั่วไป</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">ลดหย่อนได้ตามจ่ายจริง (ไม่เกิน 10% ของเงินได้สุทธิ)</p>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">฿</span>
                        <Input 
                          type="number" 
                          className="pl-8 bg-secondary/20"
                          value={profile.donations} 
                          onChange={(e) => handleChange('donations', Number(e.target.value))} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <Label className="text-sm font-medium">ลดหย่อนอื่นๆ (เช่น ช้อปดีมีคืน, ท่องเที่ยวเมืองรอง)</Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">฿</span>
                      <Input 
                        type="number" 
                        className="pl-8"
                        value={profile.otherDeductions} 
                        onChange={(e) => handleChange('otherDeductions', Number(e.target.value))} 
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Column: Dashboard Results */}
        <div className="lg:col-span-5 xl:col-span-4 relative">
          <div className="sticky top-6 space-y-6">
            
            {/* Main Result Card */}
            <Card className="border-none shadow-xl bg-gradient-to-br from-card to-card/50 overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calculator className="w-5 h-5 text-primary" />
                  สรุปภาษีของคุณ (ปี {selectedYear})
                </CardTitle>
                <CardDescription>อัปเดตตามแบบจำลองแบบ Real-time</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Highlighted Tax Box */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-sm font-medium text-red-600/80 dark:text-red-400/80 mb-2">ภาษีที่ต้องชำระ (ประมาณการ)</p>
                  <p className="text-3xl lg:text-4xl font-black text-red-600 dark:text-red-400 tracking-tight break-all">
                    {formatCurrency(taxResult.taxAmount)}
                  </p>
                </div>

                {/* Savings Box */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">ภาษีที่คุณประหยัดไปได้แล้ว!</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                    +{formatCurrency(taxSaved)}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">เงินได้สุทธิ</span>
                    <span className="font-semibold">{formatCurrency(taxResult.netIncome)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">รวมค่าลดหย่อนทั้งหมด</span>
                    <span className="font-semibold text-emerald-500">-{formatCurrency(taxResult.totalDeductions)}</span>
                  </div>
                </div>

                <TaxWaterfall 
                  totalIncome={taxResult.totalIncome}
                  totalDeductions={taxResult.totalDeductions}
                  netIncome={taxResult.netIncome}
                  taxAmount={taxResult.taxAmount}
                />

                {/* Marginal Tax Bracket Progress */}
                <div className="space-y-3 pt-4 border-t border-border/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-primary" />
                      ฐานภาษีสูงสุดของคุณ
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-xs">
                      {taxResult.marginalTaxRate}%
                    </span>
                  </div>
                  <Progress value={bracketProgress} className="h-2.5 bg-secondary" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(currentBracket?.min || 0)}</span>
                    <span>{nextBracket ? formatCurrency(currentBracket?.max || 0) : 'MAX'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Smart Advice Card */}
            <Card className="border border-blue-500/20 bg-blue-500/5 shadow-md">
              <CardContent className="p-5 flex gap-4">
                <div className="shrink-0 mt-1">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-400">คำแนะนำอัจฉริยะ</h4>
                  <p className="text-sm text-blue-600/80 dark:text-blue-300/80 leading-relaxed">
                    ฐานภาษีปัจจุบันของคุณคือ <strong className="text-blue-700 dark:text-blue-300">{taxResult.marginalTaxRate}%</strong> 
                    {' '}หมายความว่าทุกๆ 1,000 บาทที่คุณนำไปซื้อ RMF/SSF/Thai ESG หรือประกัน คุณจะได้เงินคืนถึง <strong>{taxResult.marginalTaxRate * 10} บาท</strong>
                    {bracketProgress > 80 && (
                      <span className="block mt-2 font-medium text-orange-600 dark:text-orange-400">
                        ⚠️ เงินได้สุทธิของคุณใกล้ทะลุฐานภาษีถัดไปแล้ว ลองพิจารณาเพิ่มค่าลดหย่อนเพื่อรักษาฐานภาษีนี้ไว้!
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  )
}
