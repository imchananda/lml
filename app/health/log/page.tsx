"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BodyMetricForm } from "@/components/health/BodyMetricForm"
import { MeasurementForm } from "@/components/health/MeasurementForm"
import { Plus, Trash2, Edit2, Loader2, Scale, Ruler, Calendar as CalendarIcon, Info } from "lucide-react"
import { toast } from "sonner"

export default function HealthLogPage() {
  const [activeTab, setActiveTab] = useState<"metrics" | "measurements">("metrics")
  
  // Data State
  const [metrics, setMetrics] = useState<any[]>([])
  const [measurements, setMeasurements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog States
  const [openMetricForm, setOpenMetricForm] = useState(false)
  const [openMeasurementForm, setOpenMeasurementForm] = useState(false)
  
  // Editing states
  const [editMetric, setEditMetric] = useState<any | null>(null)
  const [editMeasurement, setEditMeasurement] = useState<any | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/health/metrics")
      if (res.ok) setMetrics(await res.json())
    } catch (e) {
      console.error(e)
    }
  }, [])

  const fetchMeasurements = useCallback(async () => {
    try {
      const res = await fetch("/api/health/measurements")
      if (res.ok) setMeasurements(await res.json())
    } catch (e) {
      console.error(e)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchMetrics(), fetchMeasurements()])
    setLoading(false)
  }, [fetchMetrics, fetchMeasurements])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDeleteMetric = async (id: string) => {
    if (!confirm("ต้องการลบข้อมูลน้ำหนักตัวรายการนี้ใช่หรือไม่?")) return
    try {
      const res = await fetch(`/api/health/metrics?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("ลบข้อมูลเรียบร้อยแล้ว!")
      fetchMetrics()
    } catch {
      toast.error("ลบข้อมูลไม่สำเร็จ")
    }
  }

  const handleDeleteMeasurement = async (id: string) => {
    if (!confirm("ต้องการลบข้อมูลสัดส่วนรายการนี้ใช่หรือไม่?")) return
    try {
      const res = await fetch(`/api/health/measurements?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("ลบข้อมูลสัดส่วนเรียบร้อยแล้ว!")
      fetchMeasurements()
    } catch {
      toast.error("ลบข้อมูลไม่สำเร็จ")
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient-health inline-block w-fit">
            Body Log & Measurements ⚖️📏
          </h2>
          <p className="text-muted-foreground">บันทึกและติดตามการเปลี่ยนแปลงของน้ำหนัก เปอร์เซ็นต์ไขมัน และสัดส่วนร่างกาย</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "metrics" ? (
            <Button onClick={() => { setEditMetric(null); setOpenMetricForm(true); }} className="bg-amber-500 hover:bg-amber-600 text-white shadow-md">
              <Plus className="mr-1 h-4 w-4" /> บันทึกน้ำหนัก
            </Button>
          ) : (
            <Button onClick={() => { setEditMeasurement(null); setOpenMeasurementForm(true); }} className="bg-amber-500 hover:bg-amber-600 text-white shadow-md">
              <Plus className="mr-1 h-4 w-4" /> วัดสัดส่วนร่างกาย
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-white/10 dark:border-white/5 gap-6">
        <button
          onClick={() => setActiveTab("metrics")}
          className={`pb-4 text-base font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "metrics" 
              ? "text-amber-500 dark:text-amber-400 font-extrabold" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scale className="h-4 w-4" />
          ประวัติน้ำหนัก & ไขมัน
          {activeTab === "metrics" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("measurements")}
          className={`pb-4 text-base font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "measurements" 
              ? "text-amber-500 dark:text-amber-400 font-extrabold" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Ruler className="h-4 w-4" />
          ประวัติสัดส่วนรอบตัว
          {activeTab === "measurements" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500 rounded-full" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[30vh]">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : activeTab === "metrics" ? (
        /* Tab 1: Metrics (Weight & Body Fat) */
        <Card className="glass-card shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-500" />
              ประวัติน้ำหนักตัว
            </CardTitle>
            <CardDescription>แสดงรายการบันทึกน้ำหนักตัวและดัชนีร่างกายย้อนหลัง</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {metrics.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                ยังไม่มีข้อมูลบันทึกน้ำหนักตัว กดปุ่ม "บันทึกน้ำหนัก" เพื่อเริ่มบันทึกครั้งแรก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/10 dark:border-white/5">
                      <TableHead>วันที่ชั่งน้ำหนัก</TableHead>
                      <TableHead className="text-right">น้ำหนัก (kg)</TableHead>
                      <TableHead className="text-right">ไขมัน (%)</TableHead>
                      <TableHead className="text-right">กล้ามเนื้อ (kg)</TableHead>
                      <TableHead>บันทึกเพิ่มเติม</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((item) => (
                      <TableRow key={item.id} className="hover:bg-white/5 border-white/10 dark:border-white/5">
                        <TableCell className="font-medium flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {new Date(item.date).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </TableCell>
                        <TableCell className="text-right text-base font-extrabold text-amber-500">
                          {item.weightKg.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.bodyFatPct !== null ? `${item.bodyFatPct.toFixed(1)} %` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.muscleMassKg !== null ? `${item.muscleMassKg.toFixed(1)} กก.` : "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                          {item.note || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-amber-500" onClick={() => { setEditMetric(item); setOpenMetricForm(true); }}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteMetric(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Tab 2: Measurements */
        <Card className="glass-card shadow-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ruler className="h-5 w-5 text-amber-500" />
              ประวัติสัดส่วนร่างกาย
            </CardTitle>
            <CardDescription>แสดงรายการสัดส่วนขนาดรอบตัวย้อนหลัง</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {measurements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                ยังไม่มีข้อมูลการวัดสัดส่วนตัว กดปุ่ม "วัดสัดส่วนร่างกาย" เพื่อบันทึกข้อมูลครั้งแรก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/10 dark:border-white/5">
                      <TableHead>วันที่บันทึก</TableHead>
                      <TableHead className="text-right">รอบอก</TableHead>
                      <TableHead className="text-right">เอว</TableHead>
                      <TableHead className="text-right">สะโพก</TableHead>
                      <TableHead className="text-right">ก้น</TableHead>
                      <TableHead className="text-right">ต้นแขน (ซ/ข)</TableHead>
                      <TableHead className="text-right">ต้นขา (ซ/ข)</TableHead>
                      <TableHead className="text-right">น่อง (ซ/ข)</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {measurements.map((item) => (
                      <TableRow key={item.id} className="hover:bg-white/5 border-white/10 dark:border-white/5">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {new Date(item.date).toLocaleDateString("th-TH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{item.chestCm ? `${item.chestCm} ซม.` : "—"}</TableCell>
                        <TableCell className="text-right font-extrabold text-amber-500">{item.waistCm ? `${item.waistCm} ซม.` : "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{item.hipCm ? `${item.hipCm} ซม.` : "—"}</TableCell>
                        <TableCell className="text-right">{item.buttCm ? `${item.buttCm} ซม.` : "—"}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {item.leftArmCm || "—"} / {item.rightArmCm || "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {item.leftThighCm || "—"} / {item.rightThighCm || "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {item.leftCalfCm || "—"} / {item.rightCalfCm || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-amber-500" onClick={() => { setEditMeasurement(item); setOpenMeasurementForm(true); }}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteMeasurement(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Forms Dialogs */}
      <Dialog open={openMetricForm} onOpenChange={setOpenMetricForm}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>{editMetric ? "แก้ไขข้อมูลน้ำหนักตัว" : "บันทึกน้ำหนักตัววันนี้"}</DialogTitle>
            <DialogDescription>บันทึกองค์ประกอบของร่างกายและระดับน้ำหนักตัวของคุณ</DialogDescription>
          </DialogHeader>
          <BodyMetricForm 
            initialData={editMetric} 
            onSuccess={() => {
              setOpenMetricForm(false);
              setEditMetric(null);
              fetchMetrics();
            }} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={openMeasurementForm} onOpenChange={setOpenMeasurementForm}>
        <DialogContent className="sm:max-w-[425px] glass-card border-white/10 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMeasurement ? "แก้ไขสัดส่วนร่างกาย" : "บันทึกการวัดสัดส่วนรอบตัว"}</DialogTitle>
            <DialogDescription>บันทึกข้อมูลรอบตัวของคุณในหน่วยเซนติเมตร</DialogDescription>
          </DialogHeader>
          <MeasurementForm 
            initialData={editMeasurement} 
            onSuccess={() => {
              setOpenMeasurementForm(false);
              setEditMeasurement(null);
              fetchMeasurements();
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
