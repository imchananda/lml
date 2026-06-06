"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CalorieForm } from "@/components/health/CalorieForm"
import { CalorieBar } from "@/components/health/CalorieBar"
import { Plus, Trash2, Edit2, Loader2, Activity, Calendar as CalendarIcon, Coffee, Sun, Moon, IceCream } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

type MealLog = {
  id: string
  date: string
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"
  foodName: string
  calories: number
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  note?: string | null
}

const mealTypeConfig = {
  BREAKFAST: { label: "มื้อเช้า", icon: Coffee, color: "text-amber-500", bg: "bg-amber-500/10" },
  LUNCH: { label: "มื้อกลางวัน", icon: Sun, color: "text-orange-500", bg: "bg-orange-500/10" },
  DINNER: { label: "มื้อเย็น", icon: Moon, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  SNACK: { label: "ของว่าง/อื่นๆ", icon: IceCream, color: "text-pink-500", bg: "bg-pink-500/10" }
}

export default function CaloriesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [logs, setLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [openAdd, setOpenAdd] = useState(false)
  const [editLog, setEditLog] = useState<MealLog | null>(null)
  
  // TDEE and Target calculations
  const [summaryData, setSummaryData] = useState<any>(null)

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/health/summary")
      if (res.ok) {
        setSummaryData(await res.json())
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/health/calories?date=${selectedDate}`)
      if (res.ok) {
        setLogs(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchLogs()
    fetchSummary()
  }, [fetchLogs, fetchSummary])

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบประวัติการทานอาหารรายการนี้ใช่หรือไม่?")) return
    try {
      const res = await fetch(`/api/health/calories?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("ลบรายการเรียบร้อยแล้ว!")
      fetchLogs()
      fetchSummary()
    } catch {
      toast.error("ลบข้อมูลไม่สำเร็จ")
    }
  }

  // Grouped logs by meal type
  const logsByMeal = {
    BREAKFAST: logs.filter((l) => l.mealType === "BREAKFAST"),
    LUNCH: logs.filter((l) => l.mealType === "LUNCH"),
    DINNER: logs.filter((l) => l.mealType === "DINNER"),
    SNACK: logs.filter((l) => l.mealType === "SNACK")
  }

  // Calculations for selected date logs
  const totalConsumed = logs.reduce((sum, item) => sum + item.calories, 0)
  const totalProtein = logs.reduce((sum, item) => sum + (item.proteinG || 0), 0)
  const totalCarbs = logs.reduce((sum, item) => sum + (item.carbsG || 0), 0)
  const totalFat = logs.reduce((sum, item) => sum + (item.fatG || 0), 0)

  // Use summary Target Calorie, otherwise default to 2000
  const targetCalorie = summaryData?.calories?.target || 2000
  const burnedCalorie = summaryData?.calories?.burned || 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient-health inline-block w-fit">
            Calorie Tracking 🍽️
          </h2>
          <p className="text-muted-foreground">บันทึกอาหาร คำนวณแคลอรี และควบคุมสัดส่วนสารอาหารของคุณ</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/20 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 dark:border-white/5">
            <CalendarIcon className="h-4 w-4 text-amber-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm border-none focus:outline-none focus:ring-0 text-foreground font-semibold"
            />
          </div>

          <Button onClick={() => { setEditLog(null); setOpenAdd(true); }} className="bg-amber-500 hover:bg-amber-600 text-white shadow-md">
            <Plus className="mr-1 h-4 w-4" /> บันทึกอาหาร
          </Button>
        </div>
      </div>

      {/* Calorie Bar & Macronutrients Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Calorie Progress Bar */}
        <Card className="glass-card shadow-lg border-white/10 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" />
              สรุปพลังงานแคลอรีสำหรับวันที่ {new Date(selectedDate).toLocaleDateString("th-TH", { month: "short", day: "numeric" })}
            </CardTitle>
            <CardDescription>โควตาแคลอรีที่บริโภคเข้าไป เทียบกับเป้าหมาย TDEE</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <CalorieBar
              consumed={totalConsumed}
              target={targetCalorie}
              burned={selectedDate === new Date().toISOString().split('T')[0] ? burnedCalorie : 0} // burn only applies to today
            />
          </CardContent>
        </Card>

        {/* Macros card */}
        <Card className="glass-card shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">สารอาหารรวมวันนี้</CardTitle>
            <CardDescription>สัดส่วนคาร์บ โปรตีน ไขมัน (กรัม)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">โปรตีน (P)</span>
                <span className="text-lg font-black text-red-500">{totalProtein.toFixed(1)}g</span>
                <span className="text-[10px] text-muted-foreground block">{Math.round(totalProtein * 4)} kcal</span>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">คาร์บ (C)</span>
                <span className="text-lg font-black text-blue-500">{totalCarbs.toFixed(1)}g</span>
                <span className="text-[10px] text-muted-foreground block">{Math.round(totalCarbs * 4)} kcal</span>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">ไขมัน (F)</span>
                <span className="text-lg font-black text-yellow-500">{totalFat.toFixed(1)}g</span>
                <span className="text-[10px] text-muted-foreground block">{Math.round(totalFat * 9)} kcal</span>
              </div>
            </div>
            
            {/* Total macros calories */}
            <div className="text-xs text-muted-foreground text-center">
              พลังงานจากสารอาหารหลักรวม: {Math.round(totalProtein * 4 + totalCarbs * 4 + totalFat * 9)} kcal
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meals sections */}
      <div className="space-y-6">
        <h3 className="text-xl font-extrabold text-gradient-health">มื้ออาหารของวัน</h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="glass-card border-dashed border-white/20 p-12 text-center text-muted-foreground text-sm">
            ไม่มีประวัติการทานอาหารสำหรับวันที่เลือก กดปุ่ม "บันทึกอาหาร" เพื่อเริ่มป้อนข้อมูล
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(mealTypeConfig).map(([key, config]) => {
              const mealItems = logsByMeal[key as keyof typeof logsByMeal]
              const Icon = config.icon
              const mealTotalCalories = mealItems.reduce((s, it) => s + it.calories, 0)
              
              return (
                <Card key={key} className="glass-card shadow-lg border-white/10">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base font-extrabold">{config.label}</CardTitle>
                    </div>
                    <span className="text-sm font-bold text-amber-500">{mealTotalCalories} kcal</span>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {mealItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 italic text-center">ไม่มีข้อมูลบันทึกในมื้อนี้</p>
                    ) : (
                      <div className="space-y-2 divide-y divide-white/5">
                        {mealItems.map((item) => (
                          <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-sm gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold block text-foreground truncate">{item.foodName}</span>
                              {item.note && (
                                <span className="text-[11px] text-muted-foreground block truncate">💡 {item.note}</span>
                              )}
                              {(item.proteinG || item.carbsG || item.fatG) && (
                                <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
                                  P: {item.proteinG || 0}g | C: {item.carbsG || 0}g | F: {item.fatG || 0}g
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-amber-500 whitespace-nowrap">{item.calories} kcal</span>
                              <div className="flex items-center">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-amber-500" onClick={() => { setEditLog(item); setOpenAdd(true); }}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(item.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Forms Dialogs */}
      <Dialog open={openAdd} onOpenChange={(v) => { setOpenAdd(v); if(!v) setEditLog(null); }}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>{editLog ? "แก้ไขข้อมูลมื้ออาหาร" : "บันทึกมื้ออาหารใหม่"}</DialogTitle>
            <DialogDescription>บันทึกชื่ออาหาร แคลอรี และรายละเอียดทางสารอาหาร</DialogDescription>
          </DialogHeader>
          <CalorieForm
            initialData={editLog}
            onSuccess={() => {
              setOpenAdd(false);
              setEditLog(null);
              fetchLogs();
              fetchSummary();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
