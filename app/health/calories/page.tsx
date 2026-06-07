"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalorieForm } from "@/components/health/CalorieForm"
import { CalorieBar } from "@/components/health/CalorieBar"
import { Plus, Trash2, Edit2, Loader2, Activity, Calendar as CalendarIcon, Coffee, Sun, Moon, IceCream, Search } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

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
  const [activeTab, setActiveTab] = useState<string>("logs")
  
  // TDEE and Target calculations
  const [summaryData, setSummaryData] = useState<any>(null)

  // Food Database States
  const [foodSearchQuery, setFoodSearchQuery] = useState("")
  const [dbFoods, setDbFoods] = useState<any[]>([])
  const [loadingDb, setLoadingDb] = useState(false)
  const [openFoodDialog, setOpenFoodDialog] = useState(false)
  const [editFood, setEditFood] = useState<any>(null)

  // Form states for Custom FoodItem
  const [foodFormName, setFoodFormName] = useState("")
  const [foodFormCalories, setFoodFormCalories] = useState("")
  const [foodFormProtein, setFoodFormProtein] = useState("")
  const [foodFormCarbs, setFoodFormCarbs] = useState("")
  const [foodFormFat, setFoodFormFat] = useState("")
  const [submittingFood, setSubmittingFood] = useState(false)

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

  const fetchDbFoods = useCallback(async (query: string = "") => {
    setLoadingDb(true)
    try {
      const res = await fetch(`/api/health/food?query=${encodeURIComponent(query)}`)
      if (res.ok) {
        setDbFoods(await res.json())
      }
    } catch (e) {
      console.error(e)
      toast.error("ไม่สามารถดึงข้อมูลคลังอาหารได้")
    } finally {
      setLoadingDb(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    fetchSummary()
  }, [fetchLogs, fetchSummary])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDbFoods(foodSearchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [foodSearchQuery, fetchDbFoods])

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

  const handleEditFoodClick = (food: any) => {
    setEditFood(food)
    setFoodFormName(food.name)
    setFoodFormCalories(String(food.calories))
    setFoodFormProtein(food.proteinG !== null && food.proteinG !== undefined ? String(food.proteinG) : "")
    setFoodFormCarbs(food.carbsG !== null && food.carbsG !== undefined ? String(food.carbsG) : "")
    setFoodFormFat(food.fatG !== null && food.fatG !== undefined ? String(food.fatG) : "")
    setOpenFoodDialog(true)
  }

  const handleCreateFoodClick = () => {
    setEditFood(null)
    setFoodFormName("")
    setFoodFormCalories("")
    setFoodFormProtein("")
    setFoodFormCarbs("")
    setFoodFormFat("")
    setOpenFoodDialog(true)
  }

  const handleFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foodFormName || !foodFormCalories) {
      toast.error("กรุณาระบุชื่ออาหารและแคลอรี")
      return
    }

    setSubmittingFood(true)
    try {
      const payload = {
        id: editFood?.id,
        name: foodFormName,
        calories: Number(foodFormCalories),
        proteinG: foodFormProtein ? Number(foodFormProtein) : null,
        carbsG: foodFormCarbs ? Number(foodFormCarbs) : null,
        fatG: foodFormFat ? Number(foodFormFat) : null
      }

      const method = editFood ? "PATCH" : "POST"
      const res = await fetch("/api/health/food", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "บันทึกข้อมูลไม่สำเร็จ")
      }

      toast.success(editFood ? "อัปเดตเมนูอาหารสำเร็จ!" : "เพิ่มเมนูอาหารลงคลังสำเร็จ!")
      setOpenFoodDialog(false)
      fetchDbFoods(foodSearchQuery)
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    } finally {
      setSubmittingFood(false)
    }
  }

  const handleDeleteFood = async (id: string) => {
    if (!confirm("ต้องการลบเมนูอาหารนี้ออกจากคลังอาหารใช่หรือไม่?")) return
    try {
      const res = await fetch(`/api/health/food?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "ลบข้อมูลไม่สำเร็จ")
      }
      toast.success("ลบเมนูอาหารออกจากคลังเรียบร้อยแล้ว!")
      fetchDbFoods(foodSearchQuery)
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการลบข้อมูล")
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
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <h2 className="text-3xl font-black tracking-tight text-gradient-health inline-block w-fit">
            Calorie Tracking 🍽️
          </h2>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              บันทึกอาหาร คำนวณแคลอรี และควบคุมสัดส่วนสารอาหารของคุณ
            </p>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Small & Cute Segmented Toggle */}
              <TabsList className="bg-black/20 dark:bg-white/5 border border-white/10 p-[2px] rounded-full inline-flex w-fit h-8 items-center shrink-0">
                <TabsTrigger 
                  value="logs" 
                  className="rounded-full px-3 py-1 text-xs font-bold data-active:bg-amber-500 data-active:text-white dark:data-active:bg-amber-500 transition-all cursor-pointer h-full flex items-center gap-1.5"
                >
                  <Activity className="h-3.5 w-3.5" /> ประวัติการกิน
                </TabsTrigger>
                <TabsTrigger 
                  value="database" 
                  className="rounded-full px-3 py-1 text-xs font-bold data-active:bg-amber-500 data-active:text-white dark:data-active:bg-amber-500 transition-all cursor-pointer h-full flex items-center gap-1.5"
                >
                  <Coffee className="h-3.5 w-3.5" /> คลังอาหารของฉัน
                </TabsTrigger>
              </TabsList>

              {/* Dynamic Context Items */}
              {activeTab === "logs" ? (
                <>
                  <div className="flex items-center gap-2 bg-black/20 dark:bg-white/5 px-2.5 py-1 rounded-full border border-white/10 dark:border-white/5 h-8">
                    <CalendarIcon className="h-3.5 w-3.5 text-amber-500" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-xs border-none focus:outline-none focus:ring-0 text-foreground font-semibold w-[105px] h-6 py-0 px-1"
                    />
                  </div>
                  <Button onClick={() => { setEditLog(null); setOpenAdd(true); }} className="bg-amber-500 hover:bg-amber-600 text-white shadow-md rounded-full text-xs h-8 px-3.5 font-bold transition-all">
                    <Plus className="mr-0.5 h-3.5 w-3.5" /> บันทึกอาหาร
                  </Button>
                </>
              ) : (
                <>
                  <div className="relative flex items-center bg-black/20 dark:bg-white/5 border border-white/10 dark:border-white/5 rounded-full px-2.5 h-8 w-44 md:w-56">
                    <Search className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
                    <input
                      placeholder="ค้นหาในคลังอาหาร..."
                      className="bg-transparent text-xs border-none focus:outline-none focus:ring-0 text-foreground font-semibold placeholder:text-muted-foreground w-full py-0 h-6"
                      value={foodSearchQuery}
                      onChange={(e) => setFoodSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCreateFoodClick} className="bg-amber-500 hover:bg-amber-600 text-white shadow-md rounded-full text-xs h-8 px-3.5 font-bold transition-all">
                    <Plus className="mr-0.5 h-3.5 w-3.5" /> เพิ่มเมนูใหม่
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="logs" className="space-y-6 outline-none">

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
                  burned={selectedDate === new Date().toISOString().split('T')[0] ? burnedCalorie : 0}
                />
              </CardContent>
            </Card>

            {/* Macros card */}
            <Card className="glass-card shadow-lg border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">สารอาหารรวมวันนี้</CardTitle>
                <CardDescription>สัดส่วนคาร์บ โปรตีน ไขมัน เทียบกับเป้าหมาย</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {summaryData?.calories?.recommendedMacros ? (
                  <div className="space-y-3.5">
                    {/* Protein */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />โปรตีน (P)</span>
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">{totalProtein.toFixed(1)}g</strong> / {summaryData.calories.recommendedMacros.proteinG}g
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (totalProtein / summaryData.calories.recommendedMacros.proteinG) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{Math.round(totalProtein * 4)} kcal</span>
                        <span>เหลืออีก {Math.max(0, summaryData.calories.recommendedMacros.proteinG - totalProtein).toFixed(0)}g</span>
                      </div>
                    </div>

                    {/* Carbs */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />คาร์บ (C)</span>
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">{totalCarbs.toFixed(1)}g</strong> / {summaryData.calories.recommendedMacros.carbsG}g
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (totalCarbs / summaryData.calories.recommendedMacros.carbsG) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{Math.round(totalCarbs * 4)} kcal</span>
                        <span>เหลืออีก {Math.max(0, summaryData.calories.recommendedMacros.carbsG - totalCarbs).toFixed(0)}g</span>
                      </div>
                    </div>

                    {/* Fat */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" />ไขมัน (F)</span>
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">{totalFat.toFixed(1)}g</strong> / {summaryData.calories.recommendedMacros.fatG}g
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (totalFat / summaryData.calories.recommendedMacros.fatG) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{Math.round(totalFat * 9)} kcal</span>
                        <span>เหลืออีก {Math.max(0, summaryData.calories.recommendedMacros.fatG - totalFat).toFixed(0)}g</span>
                      </div>
                    </div>
                  </div>
                ) : (
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
                )}
                
                <div className="text-[11px] text-muted-foreground text-center border-t border-white/5 pt-2">
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
        </TabsContent>

        <TabsContent value="database" className="space-y-6 outline-none">

          {/* Cards Grid */}
          {loadingDb ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : dbFoods.length === 0 ? (
            <Card className="glass-card border-dashed border-white/20 p-12 text-center text-muted-foreground text-sm">
              ไม่พบเมนูอาหารในคลังตามที่ค้นหา
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dbFoods.map((food: any) => (
                <Card key={food.id || food.name} className="glass-card shadow-md border-white/10 hover-lift flex flex-col justify-between p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-base text-foreground break-words">{food.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        food.isCustom 
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                          : "bg-muted text-muted-foreground border-white/10"
                      }`}>
                        {food.isCustom ? "กำหนดเอง" : "ระบบ"}
                      </span>
                    </div>
                    
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-amber-500">{food.calories}</span>
                      <span className="text-xs text-muted-foreground">kcal</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-white/5 text-[11px] text-center">
                      <div className="bg-red-500/5 dark:bg-red-500/10 rounded px-1 py-0.5">
                        <span className="text-muted-foreground block text-[9px]">โปรตีน</span>
                        <span className="font-bold text-red-500">{food.proteinG ?? 0}g</span>
                      </div>
                      <div className="bg-blue-500/5 dark:bg-blue-500/10 rounded px-1 py-0.5">
                        <span className="text-muted-foreground block text-[9px]">คาร์บ</span>
                        <span className="font-bold text-blue-500">{food.carbsG ?? 0}g</span>
                      </div>
                      <div className="bg-yellow-500/5 dark:bg-yellow-500/10 rounded px-1 py-0.5">
                        <span className="text-muted-foreground block text-[9px]">ไขมัน</span>
                        <span className="font-bold text-yellow-500">{food.fatG ?? 0}g</span>
                      </div>
                    </div>
                  </div>

                  {food.isCustom && (
                    <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-white/5">
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-amber-500" onClick={() => handleEditFoodClick(food)}>
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> แก้ไข
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-red-500" onClick={() => handleDeleteFood(food.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> ลบ
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

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

      {/* Custom Food Database Form Dialog */}
      <Dialog open={openFoodDialog} onOpenChange={setOpenFoodDialog}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>{editFood ? "แก้ไขเมนูอาหารในคลัง" : "เพิ่มเมนูอาหารใหม่ลงคลัง"}</DialogTitle>
            <DialogDescription>
              ระบุชื่ออาหาร แคลอรี และสัดส่วนสารอาหารหลักเพื่อนำไปใช้ในบันทึกของคุณ
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFoodSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="foodFormName">ชื่ออาหาร *</Label>
              <Input
                id="foodFormName"
                value={foodFormName}
                onChange={(e) => setFoodFormName(e.target.value)}
                placeholder="เช่น ข้าวกะเพราหมูสับไข่ดาว"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foodFormCalories">พลังงาน (แคลอรี / kcal) *</Label>
              <Input
                id="foodFormCalories"
                type="number"
                value={foodFormCalories}
                onChange={(e) => setFoodFormCalories(e.target.value)}
                placeholder="e.g. 550"
                required
                min="0"
              />
            </div>

            <div className="border border-dashed border-white/20 p-4 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                สารอาหารหลัก (Macronutrients) - ไม่บังคับ
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="foodFormProtein" className="text-xs">โปรตีน (g)</Label>
                  <Input
                    id="foodFormProtein"
                    type="number"
                    step="any"
                    value={foodFormProtein}
                    onChange={(e) => setFoodFormProtein(e.target.value)}
                    placeholder="e.g. 25"
                    min="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="foodFormCarbs" className="text-xs">คาร์บ (g)</Label>
                  <Input
                    id="foodFormCarbs"
                    type="number"
                    step="any"
                    value={foodFormCarbs}
                    onChange={(e) => setFoodFormCarbs(e.target.value)}
                    placeholder="e.g. 50"
                    min="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="foodFormFat" className="text-xs">ไขมัน (g)</Label>
                  <Input
                    id="foodFormFat"
                    type="number"
                    step="any"
                    value={foodFormFat}
                    onChange={(e) => setFoodFormFat(e.target.value)}
                    placeholder="e.g. 15"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submittingFood}
              className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all"
            >
              {submittingFood && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editFood ? "บันทึกการแก้ไข" : "เพิ่มลงคลังอาหาร"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Tabs>
    </div>
  )
}
