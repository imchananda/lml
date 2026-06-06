"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { WeightChart } from "@/components/health/WeightChart"
import { MeasurementRadar } from "@/components/health/MeasurementRadar"
import { Loader2, TrendingUp, Activity, Ruler, BarChart2 } from "lucide-react"
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from "recharts"

export default function HealthProgressPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const weightHistory = data?.weight?.history || []
  const calorieHistory = data?.calories?.history || []
  const measurements = data?.measurements || null

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight text-gradient-health inline-block w-fit">
          Health Progress Charts 📊
        </h2>
        <p className="text-muted-foreground">วิเคราะห์ความคืบหน้าของร่างกาย น้ำหนักตัว และการบริโภคพลังงานในรอบสัปดาห์/เดือน</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Weight history */}
        <Card className="glass-card shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              ความเปลี่ยนแปลงของน้ำหนักตัว
            </CardTitle>
            <CardDescription>กราฟเปรียบเทียบน้ำหนักตัวจริงเทียบกับเป้าหมาย</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {weightHistory.length > 0 ? (
              <WeightChart data={weightHistory} goalWeight={data?.goal?.target} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground text-sm">
                ไม่มีข้อมูลน้ำหนักตัว ไปหน้าบันทึกร่างกายเพื่อเริ่มต้นบันทึกครั้งแรก
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calorie history */}
        <Card className="glass-card shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" />
              ประวัติแคลอรีสะสม 7 วัน
            </CardTitle>
            <CardDescription>เปรียบเทียบแคลอรีที่บริโภคจริงกับเป้าหมายรายวัน</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {calorieHistory.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calorieHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(15,15,20,0.9)",
                        color: "#fff"
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar name="แคลอรีที่บริโภค (kcal)" dataKey="calories" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar name="เป้าหมายโควตา (kcal)" dataKey="target" fill="#6b7280" opacity={0.5} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground text-sm">
                ไม่มีข้อมูลบันทึกแคลอรีสำหรับช่วงเวลาที่แสดง
              </div>
            )}
          </CardContent>
        </Card>

        {/* Body Measurements Radar */}
        <Card className="glass-card shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ruler className="h-5 w-5 text-amber-500" />
              สัดส่วนร่างกายล่าสุด
            </CardTitle>
            <CardDescription>การแสดงผลลัพธ์โครงสร้างร่างกายปัจจุบันในรูปแบบ Radar Chart</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {measurements ? (
              <MeasurementRadar measurements={measurements} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground text-sm">
                ไม่มีข้อมูลประวัติสัดส่วนร่างกาย ไปวัดรอบตัวและกรอกประวัติเพื่อแสดงผล
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dynamic Tips/Summary Card */}
        <Card className="glass-card shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-amber-500" />
              วิเคราะห์ดัชนีร่างกายปัจจุบัน
            </CardTitle>
            <CardDescription>วิเคราะห์ผลจากข้อมูลสรีระร่างกายล่าสุดของคุณ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-black/10 dark:bg-white/5 border border-white/5">
              <span className="text-xs text-muted-foreground block">ค่าดัชนีมวลกาย (BMI)</span>
              <p className="text-lg font-black text-amber-500 mt-1">
                {data?.bmi?.score?.toFixed(1) || "—"} ({data?.bmi?.category || "ไม่มีข้อมูล"})
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                ระดับกิจกรรมประจำวันของคุณคือ <span className="font-semibold text-foreground">{data?.activityLevel === "SEDENTARY" ? "ไม่ค่อยขยับร่างกาย" : data?.activityLevel === "LIGHT" ? "กิจกรรมระดับเบา" : data?.activityLevel === "MODERATE" ? "กิจกรรมปานกลาง" : "กระฉับกระเฉงมาก"}</span>
              </p>
            </div>

            {measurements && (
              <div className="p-4 rounded-xl bg-black/10 dark:bg-white/5 border border-white/5">
                <span className="text-xs text-muted-foreground block">อัตราส่วนรอบเอวต่อสะโพก (WHR)</span>
                <p className="text-lg font-black text-amber-500 mt-1">
                  {measurements.ratio?.toFixed(2) || "—"} (ความเสี่ยง {measurements.risk})
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  ค่า WHR ที่ดีช่วยบอกความสมดุลของการสลายไขมันรอบช่วงเอวและช่วงล่างของร่างกายได้อย่างดี
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
