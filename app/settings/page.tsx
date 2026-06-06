"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Settings, UserCircle, Plus, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, Edit2, Bell } from "lucide-react"
import { toast } from "sonner"
import { RecurringForm } from "@/components/forms/RecurringForm"
import { NotificationSettings } from "@/components/settings/NotificationSettings"

type SettingsData = {
  name?: string | null
  image?: string | null
  birthDate?: string | null
  monthlyIncome: number
  currency: string
}

type RecurringItem = {
  id: string
  name: string
  amount: number
  type: string
  frequency: string
  dayOfMonth: number | null
  category?: { id: string; name: string; color: string } | null
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [recurring, setRecurring] = useState<RecurringItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'recurring' | 'notifications'>('profile')
  const [openIncome, setOpenIncome] = useState(false)
  const [openExpense, setOpenExpense] = useState(false)
  const [editRecurring, setEditRecurring] = useState<RecurringItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [tempImage, setTempImage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [resSet, resRec] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/finance/recurring')
      ])
      if (resSet.ok) setData(await resSet.json())
      if (resRec.ok) setRecurring(await resRec.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const saveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          image: fd.get('image'),
          birthDate: fd.get('birthDate') || null,
          monthlyIncome: data?.monthlyIncome || 0,
          currency: fd.get('currency')
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว')
      // Trigger a local storage or custom event to refresh TopBar immediately
      window.dispatchEvent(new Event("profile-updated"))
    } catch { toast.error('บันทึกไม่สำเร็จ') }
    setSaving(false)
  }

  const deleteRecurring = async (id: string) => {
    if (!confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return
    try {
      await fetch(`/api/finance/recurring?id=${id}`, { method: "DELETE" })
      toast.success("ลบรายการแล้ว")
      fetchData()
    } catch { toast.error("ลบไม่สำเร็จ") }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>

  const incomes = recurring.filter(r => r.type === 'INCOME')
  const expenses = recurring.filter(r => r.type === 'EXPENSE')
  const totalMonthlyIncome = incomes.filter(i => i.frequency === 'MONTHLY').reduce((acc, curr) => acc + curr.amount, 0)
  const totalMonthlyExpense = expenses.filter(i => i.frequency === 'MONTHLY').reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gradient inline-block w-fit flex items-center gap-2">
          <Settings className="h-8 w-8 text-emerald-500" /> ตั้งค่าระบบ (Settings)
        </h2>
        <p className="text-muted-foreground">จัดการข้อมูลส่วนตัว รายได้พื้นฐาน และรายการประจำ</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:bg-muted/50'}`}
          >
            <UserCircle className="h-4 w-4" /> ข้อมูลพื้นฐาน (Profile)
          </button>
          <button 
            onClick={() => setActiveTab('recurring')}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'recurring' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:bg-muted/50'}`}
          >
            <RefreshCw className="h-4 w-4" /> รายการประจำ (Recurring)
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:bg-muted/50'}`}
          >
            <Bell className="h-4 w-4" /> แจ้งเตือน (Notifications)
          </button>
        </nav>

        <div className="space-y-6">
          {activeTab === 'profile' && (
            <Card className="glass-card shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle>ตั้งค่าทั่วไป (General)</CardTitle>
            </CardHeader>
            <CardContent>
              {data && (
                <form onSubmit={saveSettings} className="space-y-4">
                  <input type="hidden" name="image" value={tempImage !== null ? tempImage : (data.image || "")} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>ชื่อ-นามสกุล (Name)</Label>
                      <Input name="name" defaultValue={data.name || ""} placeholder="ชื่อของคุณ" />
                    </div>
                    
                    {/* Visual Profile Upload Component */}
                    <div className="grid gap-2 md:col-span-2 flex flex-col md:flex-row items-center gap-6 pb-4 border-b border-white/5">
                      <div className="relative group h-20 w-20 overflow-hidden rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 p-[2px] shadow-lg">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-black overflow-hidden">
                          {(tempImage || data.image) ? (
                            <img src={tempImage || data.image || ""} alt="Avatar Preview" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-2xl font-bold text-emerald-500">
                              {data.name ? (data.name.slice(0, 2).toUpperCase()) : "JD"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-center md:text-left">
                        <Label className="text-sm font-semibold">รูปประจำตัว (Profile Picture)</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <label className="inline-flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 px-4 py-2 text-xs font-semibold cursor-pointer border border-white/10 transition-colors">
                            {uploading ? (
                              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> กำลังอัปโหลด...</>
                            ) : (
                              <>เลือกรูปภาพ...</>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                setUploading(true)
                                const formData = new FormData()
                                formData.append("file", file)
                                try {
                                  const res = await fetch("/api/upload", {
                                    method: "POST",
                                    body: formData
                                  })
                                  if (!res.ok) {
                                    const err = await res.json()
                                    throw new Error(err.error || "Failed to upload")
                                  }
                                  const uploadResult = await res.json()
                                  setTempImage(uploadResult.url)
                                  toast.success("อัปโหลดรูปภาพสำเร็จแล้ว! (อย่าลืมกดบันทึกการตั้งค่า)")
                                } catch (err: any) {
                                  toast.error(err.message)
                                } finally {
                                  setUploading(false)
                                }
                              }}
                            />
                          </label>
                          {(tempImage || data.image) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8"
                              onClick={() => {
                                setTempImage("")
                                setData({ ...data, image: "" })
                                toast.success("ลบรูปภาพแล้ว (อย่าลืมกดบันทึกการตั้งค่า)")
                              }}
                            >
                              ลบรูปภาพ
                            </Button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">รองรับไฟล์ภาพ JPEG, PNG (ขนาดไม่เกิน 5MB)</p>
                      </div>
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label>วันเกิด (Birth Date)</Label>
                      <div className="flex gap-4 items-center">
                        <Input name="birthDate" type="date" className="flex-1" defaultValue={data.birthDate ? new Date(data.birthDate).toISOString().split('T')[0] : ""} />
                        {data.birthDate && (
                          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap">
                            อายุ {Math.floor((new Date().getTime() - new Date(data.birthDate).getTime()) / 31557600000)} ปี
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 pt-2">
                    <Label>สกุลเงินหลัก (Currency)</Label>
                    <Select name="currency" defaultValue={data.currency || "THB"}>
                      <SelectTrigger className="w-[200px]"><SelectValue placeholder="เลือกสกุลเงิน" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="THB">THB - Thai Baht (฿)</SelectItem>
                        <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} บันทึกการตั้งค่า
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
          )}
          {activeTab === 'recurring' && (
            <>
              <Card className="glass-card shadow-lg shadow-emerald-500/5 border-t-4 border-t-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2"><ArrowUpRight className="text-emerald-500 h-5 w-5"/> รายได้ประจำ (Recurring Income)</CardTitle>
                <CardDescription>เงินเดือน, รายได้เสริม, ค่าเช่า ที่ได้รับเป็นประจำ</CardDescription>
              </div>
              <Dialog open={openIncome} onOpenChange={setOpenIncome}>
                <DialogTrigger render={<Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" />}>
                  <Plus className="mr-1 h-4 w-4" /> เพิ่มรายได้
                </DialogTrigger>
                <DialogContent className="glass-card">
                  <DialogHeader><DialogTitle>เพิ่มรายได้ประจำ</DialogTitle></DialogHeader>
                  <RecurringForm defaultType="INCOME" onSuccess={() => { setOpenIncome(false); fetchData(); toast.success("เพิ่มรายได้แล้ว") }} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">
                รวมรายได้/เดือน: ฿{totalMonthlyIncome.toLocaleString()}
              </div>
              
              {incomes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">ยังไม่มีข้อมูลรายได้ประจำ</p>
              ) : (
                <div className="space-y-3">
                  {incomes.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          {item.frequency === 'MONTHLY' ? 'ทุกเดือน' : item.frequency} 
                          {item.dayOfMonth && ` (วันที่ ${item.dayOfMonth})`}
                          {item.category && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: item.category.color + '20', color: item.category.color }}>
                              {item.category.name}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600">฿{item.amount.toLocaleString()}</span>
                        <button onClick={() => setEditRecurring(item)} className="p-1 rounded text-muted-foreground hover:text-blue-500 transition-colors"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => deleteRecurring(item.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card className="glass-card shadow-lg shadow-red-500/5 border-t-4 border-t-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2"><ArrowDownRight className="text-red-500 h-5 w-5"/> รายจ่ายประจำ (Fixed Expenses)</CardTitle>
                <CardDescription>ค่าเช่าบ้าน, ค่ารถ, ค่าบริการ Subscription ต่างๆ</CardDescription>
              </div>
              <Dialog open={openExpense} onOpenChange={setOpenExpense}>
                <DialogTrigger render={<Button size="sm" variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10" />}>
                  <Plus className="mr-1 h-4 w-4" /> เพิ่มรายจ่าย
                </DialogTrigger>
                <DialogContent className="glass-card">
                  <DialogHeader><DialogTitle>เพิ่มรายจ่ายประจำ</DialogTitle></DialogHeader>
                  <RecurringForm defaultType="EXPENSE" onSuccess={() => { setOpenExpense(false); fetchData(); toast.success("เพิ่มรายจ่ายแล้ว") }} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-500 mb-4">
                รวมภาระ/เดือน: ฿{totalMonthlyExpense.toLocaleString()}
              </div>

              {expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">ยังไม่มีข้อมูลรายจ่ายประจำ</p>
              ) : (
                <div className="space-y-3">
                  {expenses.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          {item.frequency === 'MONTHLY' ? 'ทุกเดือน' : item.frequency} 
                          {item.dayOfMonth && ` (วันที่ ${item.dayOfMonth})`}
                          {item.category && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: item.category.color + '20', color: item.category.color }}>
                              {item.category.name}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-500">฿{item.amount.toLocaleString()}</span>
                        <button onClick={() => setEditRecurring(item)} className="p-1 rounded text-muted-foreground hover:text-blue-500 transition-colors"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => deleteRecurring(item.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={!!editRecurring} onOpenChange={(val) => !val && setEditRecurring(null)}>
            <DialogContent className="glass-card">
              <DialogHeader><DialogTitle>แก้ไขรายการประจำ</DialogTitle></DialogHeader>
              {editRecurring && (
                <RecurringForm 
                  initialData={editRecurring} 
                  onSuccess={() => { setEditRecurring(null); fetchData(); toast.success("อัปเดตรายการแล้ว") }} 
                />
              )}
            </DialogContent>
          </Dialog>
            </>
          )}
          {activeTab === 'notifications' && (
            <NotificationSettings />
          )}
        </div>
      </div>
    </div>
  )
}
