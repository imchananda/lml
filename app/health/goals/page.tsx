"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, Calendar as CalendarIcon, Loader2, RefreshCw, Trophy, AlertCircle, Trash2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { HealthGoalCard } from "@/components/health/HealthGoalCard"

const goalTypes = [
  { value: "WEIGHT_LOSS", label: "ลดน้ำหนัก (Weight Loss)", unit: "kg" },
  { value: "WEIGHT_GAIN", label: "เพิ่มน้ำหนัก (Weight Gain)", unit: "kg" },
  { value: "MAINTAIN", label: "รักษาน้ำหนัก (Maintain Weight)", unit: "kg" },
  { value: "BODY_FAT_REDUCTION", label: "ลดเปอร์เซ็นต์ไขมัน (Reduce Body Fat)", unit: "%" },
  { value: "MUSCLE_GAIN", label: "เพิ่มมวลกล้ามเนื้อ (Gain Muscle)", unit: "kg" }
]

export default function HealthGoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form values
  const [goalType, setGoalType] = useState<string>("WEIGHT_LOSS")
  const [startValue, setStartValue] = useState<string>("")
  const [targetValue, setTargetValue] = useState<string>("")
  const [currentValue, setCurrentValue] = useState<string>("")
  const [deadline, setDeadline] = useState<string>("")

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/health/goals")
      if (res.ok) {
        setGoals(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const onSubmitGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!startValue || !targetValue || !currentValue) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน")
      return
    }

    setSaving(true)
    try {
      const selectedType = goalTypes.find(t => t.value === goalType)
      const res = await fetch("/api/health/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: goalType,
          startValue: Number(startValue),
          targetValue: Number(targetValue),
          currentValue: Number(currentValue),
          unit: selectedType?.unit || "kg",
          deadline: deadline || null,
          status: "IN_PROGRESS"
        })
      })

      if (!res.ok) throw new Error()
      toast.success("บันทึกเป้าหมายสุขภาพสำเร็จ! 🎯")
      // Clear form
      setStartValue("")
      setTargetValue("")
      setCurrentValue("")
      setDeadline("")
      fetchGoals()
    } catch {
      toast.error("บันทึกข้อมูลไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const goal = goals.find(g => g.id === id)
      const res = await fetch("/api/health/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          type: goal.type,
          startValue: goal.startValue,
          targetValue: goal.targetValue,
          currentValue: goal.currentValue,
          unit: goal.unit,
          deadline: goal.deadline,
          status: newStatus
        })
      })

      if (!res.ok) throw new Error()
      toast.success(`อัปเดตสถานะเป็น ${newStatus === "COMPLETED" ? "สำเร็จแล้ว!" : "ยกเลิกแล้ว"}`)
      fetchGoals()
    } catch {
      toast.error("อัปเดตสถานะไม่สำเร็จ")
    }
  }

  const activeGoal = goals.find(g => g.status === "IN_PROGRESS")
  const pastGoals = goals.filter(g => g.status !== "IN_PROGRESS")

  const activeGoalUI = activeGoal ? {
    id: activeGoal.id,
    type: activeGoal.type,
    start: activeGoal.startValue,
    target: activeGoal.targetValue,
    current: activeGoal.currentValue,
    // Calculate progressPct manually here just in case summary is different
    progressPct: (() => {
      const diffTotal = Math.abs(activeGoal.startValue - activeGoal.targetValue)
      const diffCurrent = Math.abs(activeGoal.currentValue - activeGoal.targetValue)
      if (diffTotal === 0) return 100
      let pct = Math.min(100, Math.round(((diffTotal - diffCurrent) / diffTotal) * 100))
      return pct < 0 ? 0 : pct
    })(),
    deadline: activeGoal.deadline,
    status: activeGoal.status
  } : null

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight text-gradient-health inline-block w-fit">
          Health Goals 🎯
        </h2>
        <p className="text-muted-foreground">ตั้งและจัดการเป้าหมายลดน้ำหนัก เพิ่มกล้ามเนื้อ หรือลดไขมันในร่างกาย</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: Setup goal */}
        <div className="md:col-span-1 space-y-6">
          <Card className="glass-card shadow-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">ตั้งเป้าหมายสุขภาพใหม่</CardTitle>
              <CardDescription>
                การตั้งเป้าหมายใหม่จะทำให้เป้าหมายน้ำหนักเดิมเปลี่ยนสถานะเป็น ยกเลิก (Cancelled) อัตโนมัติ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmitGoal} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goalType">ประเภทเป้าหมาย</Label>
                  <Select value={goalType} onValueChange={(val) => setGoalType(val || "")}>
                    <SelectTrigger id="goalType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {goalTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="startValue" className="text-xs">ค่าเริ่มต้น</Label>
                    <Input
                      id="startValue"
                      type="number"
                      step="any"
                      required
                      value={startValue}
                      onChange={(e) => setStartValue(e.target.value)}
                      placeholder="e.g. 80"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="currentValue" className="text-xs">ค่าปัจจุบัน</Label>
                    <Input
                      id="currentValue"
                      type="number"
                      step="any"
                      required
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value)}
                      placeholder="e.g. 78"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="targetValue" className="text-xs">เป้าหมาย</Label>
                    <Input
                      id="targetValue"
                      type="number"
                      step="any"
                      required
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="e.g. 70"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">เป้าเดดไลน์ (Deadline)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  ตั้งเป้าหมายสุขภาพ
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Current and past goals */}
        <div className="md:col-span-2 space-y-6">
          {/* Current Goal card */}
          <Card className="glass-card shadow-lg border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>เป้าหมายปัจจุบันที่กำลังดำเนินการ</span>
                {activeGoalUI && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 text-xs py-1 h-8 rounded-lg"
                      onClick={() => handleUpdateStatus(activeGoalUI.id, "COMPLETED")}
                    >
                      สำเร็จแล้ว
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs py-1 h-8 rounded-lg"
                      onClick={() => handleUpdateStatus(activeGoalUI.id, "CANCELLED")}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                )}
              </CardTitle>
              <CardDescription>เป้าหมายการเปลี่ยนแปลงสุขภาพที่ต้องโฟกัสในขณะนี้</CardDescription>
            </CardHeader>
            <CardContent>
              {activeGoalUI ? (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <HealthGoalCard goal={activeGoalUI} />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-white/20 rounded-2xl">
                  <Target className="h-10 w-10 text-amber-500/30 mx-auto mb-2" />
                  ยังไม่มีเป้าหมายที่กำลังดำเนินการ กรอกข้อมูลทางด้านซ้ายเพื่อตั้งเป้าหมายใหม่
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Goals card */}
          <Card className="glass-card shadow-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">ประวัติเป้าหมายที่ผ่านมา</CardTitle>
              <CardDescription>รายการเป้าหมายสุขภาพที่บรรลุผลหรือสิ้นสุดลงแล้ว</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : pastGoals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  ไม่มีประวัติเป้าหมายที่ผ่านมา
                </div>
              ) : (
                <div className="space-y-3">
                  {pastGoals.map((g) => {
                    const labelObj = goalTypes.find(typeObj => typeObj.value === g.type)
                    const isSuccess = g.status === "COMPLETED"
                    
                    return (
                      <div key={g.id} className="flex justify-between items-center p-4 rounded-xl bg-black/10 dark:bg-white/5 border border-white/5 text-sm">
                        <div>
                          <p className="font-semibold text-foreground">{labelObj?.label || g.type}</p>
                          <span className="text-xs text-muted-foreground">
                            ค่าเริ่มต้น: {g.startValue} {g.unit} → เป้าหมาย: {g.targetValue} {g.unit} (ผลล่าสุด: {g.currentValue} {g.unit})
                          </span>
                        </div>
                        <div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            isSuccess 
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {isSuccess ? "สำเร็จ" : "ยกเลิก"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
