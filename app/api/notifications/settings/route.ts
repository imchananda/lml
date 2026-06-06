import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { NOTIFICATION_CONFIGS, ALL_NOTIFICATION_KEYS } from "@/lib/notification-defaults"
import { z } from "zod"

// GET — ดึง notification settings ของ user (merge กับ defaults)
export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // ดึง user settings จาก DB
    const userSettings = await (prisma as any).notificationSetting.findMany({
      where: { userId },
    })

    // สร้าง map จาก user settings
    const settingsMap = new Map<string, { enabled: boolean; threshold: number | null; dayInterval: number | null }>()
    userSettings.forEach((s: any) => {
      settingsMap.set(s.key, {
        enabled: s.enabled,
        threshold: s.threshold,
        dayInterval: s.dayInterval,
      })
    })

    // Merge กับ defaults
    const result = ALL_NOTIFICATION_KEYS.map((key) => {
      const config = NOTIFICATION_CONFIGS[key]
      const userSetting = settingsMap.get(key)

      return {
        key: config.key,
        label: config.label,
        description: config.description,
        module: config.module,
        type: config.type,
        icon: config.icon,
        severity: config.severity,
        // User overrides or defaults
        enabled: userSetting?.enabled ?? true,
        threshold: userSetting?.threshold ?? config.threshold ?? null,
        dayInterval: userSetting?.dayInterval ?? config.dayInterval ?? null,
        // Config constraints for UI
        thresholdLabel: config.thresholdLabel || null,
        thresholdUnit: config.thresholdUnit || null,
        thresholdMin: config.thresholdMin ?? null,
        thresholdMax: config.thresholdMax ?? null,
        thresholdStep: config.thresholdStep ?? null,
        dayIntervalLabel: config.dayIntervalLabel || null,
        dayIntervalMin: config.dayIntervalMin ?? null,
        dayIntervalMax: config.dayIntervalMax ?? null,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH — อัปเดต settings (array of { key, enabled, threshold?, dayInterval? })
const patchSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string(),
      enabled: z.boolean(),
      threshold: z.number().nullable().optional(),
      dayInterval: z.number().int().nullable().optional(),
    })
  ),
})

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { settings } = patchSchema.parse(body)

    // Validate keys
    const validKeys = new Set(ALL_NOTIFICATION_KEYS)
    const invalidKeys = settings.filter((s) => !validKeys.has(s.key))
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Invalid notification keys: ${invalidKeys.map((s) => s.key).join(", ")}` },
        { status: 400 }
      )
    }

    // Upsert each setting
    await Promise.all(
      settings.map((s) =>
        (prisma as any).notificationSetting.upsert({
          where: { userId_key: { userId, key: s.key } },
          create: {
            userId,
            key: s.key,
            enabled: s.enabled,
            threshold: s.threshold ?? null,
            dayInterval: s.dayInterval ?? null,
          },
          update: {
            enabled: s.enabled,
            threshold: s.threshold ?? null,
            dayInterval: s.dayInterval ?? null,
          },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE — Reset to defaults (ลบ settings ทั้งหมดของ user)
export async function DELETE() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await (prisma as any).notificationSetting.deleteMany({
      where: { userId },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
