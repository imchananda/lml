"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RotateCcw, Save, Bell, BellOff } from "lucide-react"
import { toast } from "sonner"

type NotifSetting = {
  key: string
  label: string
  description: string
  module: string
  type: string
  icon: string
  severity: string
  enabled: boolean
  threshold: number | null
  dayInterval: number | null
  thresholdLabel: string | null
  thresholdUnit: string | null
  thresholdMin: number | null
  thresholdMax: number | null
  thresholdStep: number | null
  dayIntervalLabel: string | null
  dayIntervalMin: number | null
  dayIntervalMax: number | null
}

const MODULE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  finance: {
    label: "💰 การเงิน (Finance)",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
  },
  health: {
    label: "💪 สุขภาพ (Health)",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
  },
  study: {
    label: "📚 การเรียน (Study)",
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
  },
  todo: {
    label: "✅ งาน (Todo)",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
  },
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotifSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/settings")
      if (res.ok) {
        setSettings(await res.json())
      }
    } catch {
      toast.error("ไม่สามารถโหลดค่าตั้งแจ้งเตือนได้")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = (key: string, field: string, value: any) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, [field]: value } : s))
    )
    setDirty(true)
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const payload = settings.map((s) => ({
        key: s.key,
        enabled: s.enabled,
        threshold: s.threshold,
        dayInterval: s.dayInterval,
      }))
      const res = await fetch("/api/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      })
      if (!res.ok) throw new Error()
      toast.success("บันทึกการตั้งค่าแจ้งเตือนเรียบร้อยแล้ว")
      setDirty(false)
      // Refresh notifications in TopBar
      window.dispatchEvent(new Event("profile-updated"))
    } catch {
      toast.error("บันทึกไม่สำเร็จ")
    }
    setSaving(false)
  }

  const resetDefaults = async () => {
    if (!confirm("คืนค่าแจ้งเตือนทั้งหมดกลับสู่ค่าเริ่มต้น?")) return
    setSaving(true)
    try {
      const res = await fetch("/api/notifications/settings", { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("คืนค่าเริ่มต้นเรียบร้อยแล้ว")
      setDirty(false)
      await fetchSettings()
      window.dispatchEvent(new Event("profile-updated"))
    } catch {
      toast.error("คืนค่าไม่สำเร็จ")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  // Group settings by module
  const byModule: Record<string, NotifSetting[]> = {}
  settings.forEach((s) => {
    if (!byModule[s.module]) byModule[s.module] = []
    byModule[s.module].push(s)
  })

  const moduleOrder = ["finance", "health", "study", "todo"]

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          ตั้งค่าเปิด/ปิดแจ้งเตือน ปรับเกณฑ์ และความถี่ตามต้องการ
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetDefaults}
            disabled={saving}
            className="text-xs border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to Default
          </Button>
          <Button
            size="sm"
            onClick={saveAll}
            disabled={saving || !dirty}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md text-xs"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            บันทึกการตั้งค่า
          </Button>
        </div>
      </div>

      {/* Module Groups */}
      {moduleOrder.map((mod) => {
        const items = byModule[mod]
        if (!items || items.length === 0) return null
        const meta = MODULE_META[mod]

        // Split alert vs reminder
        const alerts = items.filter((i) => i.type === "alert")
        const reminders = items.filter((i) => i.type === "reminder")

        return (
          <Card
            key={mod}
            className={`glass-card shadow-lg shadow-black/5 border-l-4 ${meta.border}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className={`text-base ${meta.color}`}>
                {meta.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Alerts */}
              {alerts.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 pb-1">
                    ⚠️ แจ้งเตือนตามเกณฑ์ (Alert)
                  </p>
                  {alerts.map((s) => (
                    <NotifRow
                      key={s.key}
                      setting={s}
                      onUpdate={updateSetting}
                      moduleBg={meta.bg}
                    />
                  ))}
                </div>
              )}

              {/* Reminders */}
              {reminders.length > 0 && (
                <div className="space-y-1 pt-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 pb-1">
                    🔔 เตือนให้ทำ (Reminder)
                  </p>
                  {reminders.map((s) => (
                    <NotifRow
                      key={s.key}
                      setting={s}
                      onUpdate={updateSetting}
                      moduleBg={meta.bg}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Sticky save bar when dirty */}
      {dirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 bg-indigo-600/95 backdrop-blur-xl text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-400/20">
            <Bell className="h-4 w-4" />
            <span className="text-sm font-medium">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>
            <Button
              size="sm"
              onClick={saveAll}
              disabled={saving}
              className="bg-white text-indigo-700 hover:bg-white/90 text-xs h-8 px-4 font-bold shadow-sm"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "บันทึก"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Notification Row Component ─────────────────────────────
function NotifRow({
  setting,
  onUpdate,
  moduleBg,
}: {
  setting: NotifSetting
  onUpdate: (key: string, field: string, value: any) => void
  moduleBg: string
}) {
  const s = setting

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
        s.enabled
          ? `${moduleBg} border border-white/5`
          : "bg-muted/30 border border-transparent opacity-60"
      }`}
    >
      {/* Toggle + Label */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <button
          onClick={() => onUpdate(s.key, "enabled", !s.enabled)}
          className={`mt-0.5 flex-shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
            s.enabled
              ? "bg-indigo-500"
              : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              s.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{s.icon}</span>
            <span className="text-sm font-semibold truncate">{s.label}</span>
            {!s.enabled && (
              <BellOff className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {s.description}
          </p>
        </div>
      </div>

      {/* Controls (threshold / dayInterval) */}
      {s.enabled && (s.thresholdLabel || s.dayIntervalLabel) && (
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 pl-12 sm:pl-0">
          {/* Threshold input */}
          {s.thresholdLabel && (
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] text-muted-foreground whitespace-nowrap">
                {s.thresholdLabel}
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={s.threshold ?? ""}
                  onChange={(e) =>
                    onUpdate(
                      s.key,
                      "threshold",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  min={s.thresholdMin ?? undefined}
                  max={s.thresholdMax ?? undefined}
                  step={s.thresholdStep ?? undefined}
                  className="w-16 h-7 text-xs text-center px-1.5"
                />
                {s.thresholdUnit && (
                  <span className="text-[10px] text-muted-foreground">
                    {s.thresholdUnit}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Day interval input */}
          {s.dayIntervalLabel && (
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] text-muted-foreground whitespace-nowrap">
                {s.dayIntervalLabel}
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={s.dayInterval ?? ""}
                  onChange={(e) =>
                    onUpdate(
                      s.key,
                      "dayInterval",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  min={s.dayIntervalMin ?? undefined}
                  max={s.dayIntervalMax ?? undefined}
                  className="w-14 h-7 text-xs text-center px-1.5"
                />
                <span className="text-[10px] text-muted-foreground">วัน</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
