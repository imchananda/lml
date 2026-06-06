"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Heart, Plus, Loader2, Scale, Activity, Dumbbell, 
  Settings, TrendingUp, Sparkles, User, Info 
} from "lucide-react"
import { BMIGauge } from "@/components/health/BMIGauge"
import { CalorieBar } from "@/components/health/CalorieBar"
import { WeightChart } from "@/components/health/WeightChart"
import { HealthGoalCard } from "@/components/health/HealthGoalCard"
import { BodyMetricForm } from "@/components/health/BodyMetricForm"
import { CalorieForm } from "@/components/health/CalorieForm"
import { WorkoutForm } from "@/components/health/WorkoutForm"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function HealthDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  
  // Dialog Open States
  const [openWeight, setOpenWeight] = useState(false)
  const [openFood, setOpenFood] = useState(false)
  const [openWorkout, setOpenWorkout] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)
  const [openCalorieHelp, setOpenCalorieHelp] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/health/summary")
      if (res.ok) {
        setData(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProfileLoading(true)
    const fd = new FormData(e.currentTarget)
    
    try {
      const res = await fetch("/api/health/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm: Number(fd.get("heightCm")),
          gender: fd.get("gender"),
          activityLevel: fd.get("activityLevel")
        })
      })

      if (!res.ok) throw new Error()
      toast.success("อัปเดตข้อมูลสรีระร่างกายเรียบร้อยแล้ว!")
      setOpenProfile(false)
      fetchSummary()
    } catch {
      toast.error("อัปเดตข้อมูลไม่สำเร็จ")
    } finally {
      setProfileLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient-health inline-block w-fit">
            Health & Fitness 💪
          </h2>
          <p className="text-muted-foreground">ติดตามสุขภาพ น้ำหนัก แคลอรี และการออกกำลังกายของคุณ</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Health Profile Button */}
          <Dialog open={openProfile} onOpenChange={setOpenProfile}>
            <DialogTrigger render={<Button variant="outline" className="border-white/10 bg-black/20" />}>
              <Settings className="mr-2 h-4 w-4 text-amber-500" /> ข้อมูลสรีระ
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>ข้อมูลสรีระร่างกาย</DialogTitle>
                <DialogDescription>ตั้งค่าส่วนสูงและระดับกิจกรรมเพื่อใช้คำนวณ BMI, BMR และ TDEE</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleProfileSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="heightCm">ส่วนสูง (เซนติเมตร)</Label>
                  <Input id="heightCm" name="heightCm" type="number" required defaultValue={data?.height || 170} placeholder="e.g. 175" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">เพศกำเนิด</Label>
                  <Select name="gender" defaultValue={data?.gender || "MALE"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">ชาย (Male)</SelectItem>
                      <SelectItem value="FEMALE">หญิง (Female)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activityLevel">ระดับกิจกรรมประจำวัน</Label>
                  <Select name="activityLevel" defaultValue={data?.activityLevel || "MODERATE"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEDENTARY">นั่งทำงานเป็นหลัก ไม่ค่อยออกกำลังกาย</SelectItem>
                      <SelectItem value="LIGHT">ออกกำลังกายเบาๆ 1-3 วัน/สัปดาห์</SelectItem>
                      <SelectItem value="MODERATE">ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์</SelectItem>
                      <SelectItem value="ACTIVE">ออกกำลังกายหนัก 6-7 วัน/สัปดาห์</SelectItem>
                      <SelectItem value="VERY_ACTIVE">ออกกำลังกายหนักมาก ทำงานที่ใช้แรงมาก</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={profileLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12 rounded-xl mt-4">
                  {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  บันทึกข้อมูลสรีระ
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Quick Logs Buttons */}
          <Dialog open={openWeight} onOpenChange={setOpenWeight}>
            <DialogTrigger render={<Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-md" />}>
              <Plus className="mr-1 h-4 w-4" /> ชั่งน้ำหนัก
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>ชั่งน้ำหนักวันนี้</DialogTitle>
                <DialogDescription>บันทึกน้ำหนักตัวและองค์ประกอบร่างกายสำหรับวันนี้</DialogDescription>
              </DialogHeader>
              <BodyMetricForm onSuccess={() => { setOpenWeight(false); fetchSummary(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Aggregated Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* 1. BMI Card */}
        <Card className="glass-card shadow-lg border-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-500 animate-pulse" />
              ดัชนีมวลกาย (BMI)
            </CardTitle>
            <CardDescription>การจำแนกสถานะน้ำหนักตามเกณฑ์</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BMIGauge bmi={data?.bmi?.score || 22.0} />
            <div className="text-center pt-2">
              <span className="text-xs text-muted-foreground">สถานะน้ำหนักปัจจุบัน:</span>
              <p className="text-lg font-black" style={{ color: data?.bmi?.color }}>
                {data?.bmi?.category || "น้ำหนักปกติ"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Today's Calorie Budget */}
        <Card className="glass-card shadow-lg border-amber-500/10">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-amber-500" />
                  งบแคลอรีวันนี้ (Calories)
                </CardTitle>
                <CardDescription>โควตาอาหารเทียบกับ TDEE</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                {/* Info Button */}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-amber-500 hover:bg-amber-500/10"
                  onClick={() => setOpenCalorieHelp(true)}
                >
                  <Info className="h-4 w-4" />
                </Button>

                {/* Add Food Button */}
                <Dialog open={openFood} onOpenChange={setOpenFood}>
                  <DialogTrigger render={<Button size="icon" variant="ghost" className="h-8 w-8 text-amber-500 hover:bg-amber-500/10" />}>
                    <Plus className="h-4 w-4" />
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
                    <DialogHeader>
                      <DialogTitle>บันทึกมื้ออาหาร</DialogTitle>
                      <DialogDescription>กรอกข้อมูลอาหารและพลังงานแคลอรีที่ทาน</DialogDescription>
                    </DialogHeader>
                    <CalorieForm onSuccess={() => { setOpenFood(false); fetchSummary(); }} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CalorieBar 
              consumed={data?.calories?.consumed || 0} 
              target={data?.calories?.target || 2000} 
              burned={data?.calories?.burned || 0} 
            />
          </CardContent>
        </Card>

        {/* 3. Goal Progress */}
        <Card className="glass-card shadow-lg border-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              ความก้าวหน้าเป้าหมาย
            </CardTitle>
            <CardDescription>เป้าหมายน้ำหนักที่กำลังดำเนินการ</CardDescription>
          </CardHeader>
          <CardContent>
            <HealthGoalCard goal={data?.goal} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Weight Chart & Exercise Aggregates */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Weight History Chart (Span 2 cols) */}
        <Card className="glass-card shadow-lg md:col-span-2 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              กราฟแนวน้ำหนัก (Weight History)
            </CardTitle>
            <CardDescription>แนวโน้มน้ำหนักตัวย้อนหลัง 30 วันที่ผ่านมา</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {data?.weight?.history?.length > 0 ? (
              <WeightChart data={data.weight.history} goalWeight={data?.goal?.target} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground text-sm">
                ไม่มีประวัติน้ำหนัก ชั่งน้ำหนักวันนี้เพื่อสร้างจุดแรกบนกราฟ!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exercises/Workouts Card */}
        <Card className="glass-card shadow-lg border-white/10 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-amber-500 animate-bounce" style={{ animationDuration: "3s" }} />
                  การออกกำลังกาย (Workouts)
                </CardTitle>
                <CardDescription>เปรียบเทียบความฟิตในรอบสัปดาห์</CardDescription>
              </div>
              <Dialog open={openWorkout} onOpenChange={setOpenWorkout}>
                <DialogTrigger render={<Button size="icon" variant="ghost" className="h-8 w-8 text-amber-500 hover:bg-amber-500/10" />}>
                  <Plus className="h-4 w-4" />
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
                  <DialogHeader>
                    <DialogTitle>บันทึกการออกกำลังกาย</DialogTitle>
                    <DialogDescription>กรอกข้อมูลประเภทกีฬา ระยะเวลา และแคลอรีที่เผาผลาญ</DialogDescription>
                  </DialogHeader>
                  <WorkoutForm onSuccess={() => { setOpenWorkout(false); fetchSummary(); }} />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/10 dark:bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-muted-foreground block uppercase font-semibold">ออกกำลังกายสะสม</span>
                <span className="text-2xl font-black text-amber-500">{data?.workouts?.weeklyCount || 0}</span>
                <span className="text-xs text-muted-foreground block">ครั้ง / 7 วันหลัง</span>
              </div>
              <div className="bg-black/10 dark:bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-muted-foreground block uppercase font-semibold">เวลาสะสม</span>
                <span className="text-2xl font-black text-amber-500">{data?.workouts?.weeklyDuration || 0}</span>
                <span className="text-xs text-muted-foreground block">นาที / 7 วันหลัง</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="text-xs text-muted-foreground">เผาผลาญแคลอรีสัปดาห์นี้สะสม</span>
              <p className="text-xl font-bold text-emerald-500">
                {data?.workouts?.weeklyBurned || 0} kcal
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Body Measurements Summary */}
      <Card className="glass-card shadow-lg border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">สัดส่วนสถิติล่าสุด (Body Measurements)</CardTitle>
          <CardDescription>ขนาดรอบตัวและดัชนีสุขภาพสัดส่วน</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.measurements ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 text-center">
              <div className="p-3 bg-secondary/30 rounded-xl">
                <span className="text-xs text-muted-foreground block">รอบอก</span>
                <span className="text-lg font-extrabold">{data.measurements.chest || "—"} ซม.</span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-xl">
                <span className="text-xs text-muted-foreground block">รอบเอว</span>
                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{data.measurements.waist || "—"} ซม.</span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-xl">
                <span className="text-xs text-muted-foreground block">รอบสะโพก</span>
                <span className="text-lg font-extrabold">{data.measurements.hip || "—"} ซม.</span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-xl">
                <span className="text-xs text-muted-foreground block">รอบก้น</span>
                <span className="text-lg font-extrabold">{data.measurements.arms || "—"} ซม.</span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-xl">
                <span className="text-xs text-muted-foreground block">ต้นขา</span>
                <span className="text-lg font-extrabold">{data.measurements.thighs || "—"} ซม.</span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-xl">
                <span className="text-xs text-muted-foreground block">น่อง</span>
                <span className="text-lg font-extrabold">{data.measurements.calves || "—"} ซม.</span>
              </div>
              
              {/* Ratio card (Span full mobile, 2 cols on tablet) */}
              <div className="col-span-full sm:col-span-2 md:col-span-6 mt-4 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-center bg-black/10 dark:bg-white/5 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">อัตราส่วนรอบเอวต่อสะโพก (Waist-to-Hip Ratio)</p>
                    <p className="text-xs text-muted-foreground">เป็นตัวชี้วัดการสะสมไขมันบริเวณหน้าท้องและช่องท้อง</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">ค่าดัชนี:</span>
                  <span className="text-lg font-black">{data.measurements.ratio?.toFixed(2) || "—"}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full ml-2" style={{ backgroundColor: data.measurements.color + "20", color: data.measurements.color }}>
                    ความเสี่ยง {data.measurements.risk}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8 text-sm">
              ยังไม่มีการบันทึกสัดส่วนร่างกาย ไปที่หน้า บันทึกสรีระ เพื่อวัดรอบตัวแรกของคุณ!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calorie Help Dialog */}
      <Dialog open={openCalorieHelp} onOpenChange={setOpenCalorieHelp}>
        <DialogContent className="sm:max-w-[450px] glass-card border-white/10 text-left max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" />
              การคำนวณงบแคลอรี
            </DialogTitle>
            <DialogDescription>
              รายละเอียดและที่มาของโควตาแคลอรีในแต่ละวันของคุณ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4 text-sm text-foreground/95">
            <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">อัตราการเผาผลาญพื้นฐาน (BMR):</span>
                <span className="font-bold">{data?.calories?.bmr || 0} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">การเผาผลาญทั้งหมดต่อวัน (TDEE):</span>
                <span className="font-bold">{data?.calories?.tdee || 0} kcal</span>
              </div>
              {data?.goal && (
                <div className="flex justify-between border-t border-white/10 pt-2 text-amber-500">
                  <span className="text-xs">เป้าหมาย ({data.goal.type === "WEIGHT_LOSS" ? "ลดน้ำหนัก" : data.goal.type === "WEIGHT_GAIN" ? "เพิ่มน้ำหนัก" : "รักษาน้ำหนัก"}):</span>
                  <span className="font-bold">
                    {data.goal.type === "WEIGHT_LOSS" ? "-500" : data.goal.type === "WEIGHT_GAIN" ? "+500" : "0"} kcal
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-2 text-base font-extrabold text-amber-500">
                <span>งบแคลอรีวันนี้ (Target):</span>
                <span>{data?.calories?.target || 0} kcal</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-muted-foreground leading-relaxed">
              <p>
                <strong>1. BMR (Basal Metabolic Rate):</strong> พลังงานขั้นต่ำที่ร่างกายต้องการในการทำงานของอวัยวะต่างๆ คำนวณจากน้ำหนัก ({data?.weight?.current || 0} กก.), ส่วนสูง ({data?.height || 0} ซม.), อายุ ({data?.age || 0} ปี) และเพศ ({data?.gender === "MALE" ? "ชาย" : "หญิง"}) ตามหลัก Mifflin-St Jeor
              </p>
              <p>
                <strong>2. TDEE (Total Daily Energy Expenditure):</strong> พลังงานทั้งหมดที่เผาผลาญต่อวันตามระดับกิจกรรม ({
                  data?.activityLevel === "SEDENTARY" ? "นั่งทำงานเป็นหลัก" : 
                  data?.activityLevel === "LIGHT" ? "ออกกำลังกายเบาๆ" : 
                  data?.activityLevel === "MODERATE" ? "ออกกำลังกายปานกลาง" : 
                  data?.activityLevel === "ACTIVE" ? "ออกกำลังกายหนัก" : "ออกกำลังกายหนักมาก"
                }) โดยนำ BMR ไปคูณตัวคูณพลังงาน (เช่น นั่งทำงาน = BMR × 1.2)
              </p>
              <p>
                <strong>3. การปรับงบตามเป้าหมาย:</strong> 
                <br />• หากมีเป้าหมาย<strong>ลดน้ำหนัก</strong> ระบบจะปรับลดงบลง <strong>500 kcal</strong> จาก TDEE เพื่อให้ร่างกายนำไขมันส่วนเกินมาเผาผลาญ (Calorie Deficit)
                <br />• หากมีเป้าหมาย<strong>เพิ่มน้ำหนัก</strong> ระบบจะปรับเพิ่มงบขึ้น <strong>500 kcal</strong> จาก TDEE เพื่อส่งเสริมการสร้างกล้ามเนื้อ (Calorie Surplus)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
