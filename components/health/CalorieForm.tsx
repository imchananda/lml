"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Search, Plus } from "lucide-react"
import { Switch } from "@/components/ui/switch"

type CalorieLog = {
  id?: string
  date?: string | Date
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK"
  foodName: string
  calories: number
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  note?: string | null
}

type FoodItem = {
  id?: string
  name: string
  calories: number
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  isCustom?: boolean
  userId?: string | null
}

export function CalorieForm({ 
  onSuccess, 
  initialData 
}: { 
  onSuccess?: () => void
  initialData?: CalorieLog | null 
}) {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<FoodItem[]>([])
  const [searching, setSearching] = useState(false)
  
  // Form States
  const [mealType, setMealType] = useState<CalorieLog["mealType"]>(initialData?.mealType || "BREAKFAST")
  const [foodName, setFoodName] = useState(initialData?.foodName || "")
  const [calories, setCalories] = useState<string>(initialData?.calories ? String(initialData.calories) : "")
  const [protein, setProtein] = useState<string>(initialData?.proteinG ? String(initialData.proteinG) : "")
  const [carbs, setCarbs] = useState<string>(initialData?.carbsG ? String(initialData.carbsG) : "")
  const [fat, setFat] = useState<string>(initialData?.fatG ? String(initialData.fatG) : "")
  const [note, setNote] = useState<string>(initialData?.note || "")
  const [saveToDb, setSaveToDb] = useState(true)

  // Sync state if initialData changes
  useEffect(() => {
    if (initialData) {
      setMealType(initialData.mealType)
      setFoodName(initialData.foodName)
      setCalories(String(initialData.calories))
      setProtein(initialData.proteinG ? String(initialData.proteinG) : "")
      setCarbs(initialData.carbsG ? String(initialData.carbsG) : "")
      setFat(initialData.fatG ? String(initialData.fatG) : "")
      setNote(initialData.note || "")
    } else {
      setMealType("BREAKFAST")
      setFoodName("")
      setCalories("")
      setProtein("")
      setCarbs("")
      setFat("")
      setNote("")
    }
  }, [initialData])

  const defaultDate = initialData?.date
    ? new Date(initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  // Search foods from database
  const searchFoods = useCallback(async (query: string) => {
    if (!query) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/health/food?query=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) {
        setSearchResults(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchFoods(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchFoods])

  const handleSelectFood = (food: FoodItem) => {
    setFoodName(food.name)
    setCalories(String(food.calories))
    setProtein(food.proteinG ? String(food.proteinG) : "")
    setCarbs(food.carbsG ? String(food.carbsG) : "")
    setFat(food.fatG ? String(food.fatG) : "")
    setSearchQuery("")
    setSearchResults([])
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!foodName || !calories) {
      toast.error("กรุณาระบุชื่ออาหารและแคลอรี")
      return
    }

    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {

      // 2. Log calories consumed
      const method = initialData?.id ? "PATCH" : "POST"
      const res = await fetch("/api/health/calories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          date: fd.get("date"),
          mealType,
          foodName,
          calories: Number(calories),
          proteinG: protein ? Number(protein) : null,
          carbsG: carbs ? Number(carbs) : null,
          fatG: fat ? Number(fat) : null,
          note: note || null,
          saveToDb: !initialData ? saveToDb : undefined
        })
      })

      if (!res.ok) throw new Error()
      toast.success(initialData?.id ? "อัปเดตบันทึกมื้ออาหารสำเร็จ!" : "บันทึกมื้ออาหารสำเร็จ! 🍽️")
      if (onSuccess) onSuccess()
    } catch {
      toast.error("บันทึกอาหารไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Search Bar (only for creating new log) */}
      {!initialData && (
        <div className="space-y-2 relative">
          <Label htmlFor="search">ค้นหาจากฐานข้อมูลอาหาร (Food Database)</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="พิมพ์ชื่ออาหาร เช่น ข้าวมันไก่, แกงเขียวหวาน..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover text-popover-foreground border border-white/10 dark:border-white/5 rounded-xl shadow-2xl max-h-60 overflow-y-auto p-1 divide-y divide-border/20">
              {searchResults.map((food, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded-lg text-sm flex justify-between items-center transition-colors gap-2"
                  onClick={() => handleSelectFood(food)}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-foreground truncate">{food.name}</span>
                    {(food.proteinG !== null || food.carbsG !== null || food.fatG !== null) && (
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        โปรตีน: {food.proteinG ?? 0}g | คาร์บ: {food.carbsG ?? 0}g | ไขมัน: {food.fatG ?? 0}g
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-amber-500 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {food.calories} kcal
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">วันที่กิน</Label>
            <Input id="date" name="date" type="date" required defaultValue={defaultDate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mealType">มื้ออาหาร</Label>
            <Select value={mealType} onValueChange={(val: any) => setMealType(val)}>
              <SelectTrigger id="mealType">
                <SelectValue placeholder="เลือกมื้ออาหาร" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BREAKFAST">มื้อเช้า (Breakfast)</SelectItem>
                <SelectItem value="LUNCH">มื้อกลางวัน (Lunch)</SelectItem>
                <SelectItem value="DINNER">มื้อเย็น (Dinner)</SelectItem>
                <SelectItem value="SNACK">ของว่าง (Snack)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="foodName">ชื่ออาหาร *</Label>
            <Input
              id="foodName"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="ระบุชื่ออาหาร"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calories">พลังงาน (แคลอรี / kcal) *</Label>
            <Input
              id="calories"
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="e.g. 350"
              required
              min="0"
            />
          </div>
        </div>

        <div className="border border-dashed border-white/20 p-4 rounded-xl space-y-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">สารอาหาร (Macronutrients) - ไม่บังคับ</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="protein" className="text-xs">โปรตีน (กรัม)</Label>
              <Input
                id="protein"
                type="number"
                step="any"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="e.g. 25"
                min="0"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="carbs" className="text-xs">คาร์บ (กรัม)</Label>
              <Input
                id="carbs"
                type="number"
                step="any"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="e.g. 45"
                min="0"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fat" className="text-xs">ไขมัน (กรัม)</Label>
              <Input
                id="fat"
                type="number"
                step="any"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="e.g. 10"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">บันทึกเพิ่มเติม</Label>
          <Input id="note" name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ทานที่ร้านป้าแดง..." />
        </div>

        {/* Save to Food database switch */}
        {!initialData && (
          <div className="flex items-center justify-between gap-3 bg-black/10 dark:bg-white/5 border border-white/10 dark:border-white/5 p-3.5 rounded-xl">
            <div className="space-y-0.5">
              <Label htmlFor="saveToDb" className="text-sm font-semibold text-foreground cursor-pointer">
                บันทึกลงคลังอาหารอัตโนมัติ
              </Label>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                บันทึกเมนูนี้พร้อมพลังงานและสารอาหารหลักลงคลังเพื่อเรียกใช้งานในวันถัดไป
              </p>
            </div>
            <Switch
              id="saveToDb"
              checked={saveToDb}
              onCheckedChange={setSaveToDb}
            />
          </div>
        )}


        <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white h-12 rounded-xl shadow-lg mt-4 transition-all">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "อัปเดตข้อมูลมื้ออาหาร" : "บันทึกข้อมูลมื้ออาหาร"}
        </Button>
      </form>
    </div>
  )
}
