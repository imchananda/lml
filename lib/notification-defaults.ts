// ══════════════════════════════════════════════════════════════
// Notification Defaults — Centralized config
// ใช้ร่วมกันระหว่าง: notifications API, settings API, Settings UI
// ══════════════════════════════════════════════════════════════

export type NotificationType = "alert" | "reminder"
export type NotificationModule = "finance" | "health" | "study" | "todo"
export type NotificationSeverity = "info" | "warning" | "error"

export interface NotificationConfig {
  key: string
  label: string
  description: string
  module: NotificationModule
  type: NotificationType
  icon: string
  // For alerts with adjustable thresholds
  threshold?: number
  thresholdLabel?: string
  thresholdUnit?: string
  thresholdMin?: number
  thresholdMax?: number
  thresholdStep?: number
  // For reminders with day intervals
  dayInterval?: number
  dayIntervalLabel?: string
  dayIntervalMin?: number
  dayIntervalMax?: number
  // Default severity
  severity: NotificationSeverity
}

export const NOTIFICATION_CONFIGS: Record<string, NotificationConfig> = {
  // ────────────────── 💰 FINANCE ALERTS ──────────────────
  fin_dsr: {
    key: "fin_dsr",
    label: "หนี้สินสูง (DSR Alert)",
    description: "แจ้งเตือนเมื่อสัดส่วนการชำระหนี้ต่อรายรับ (DSR) เกินเกณฑ์ที่กำหนด",
    module: "finance",
    type: "alert",
    icon: "💰",
    threshold: 35,
    thresholdLabel: "เกณฑ์ DSR สูงสุด",
    thresholdUnit: "%",
    thresholdMin: 10,
    thresholdMax: 80,
    thresholdStep: 5,
    severity: "error",
  },
  fin_savings: {
    key: "fin_savings",
    label: "อัตราการออมต่ำ",
    description: "แจ้งเตือนเมื่ออัตราการออมต่อเดือนต่ำกว่าเกณฑ์",
    module: "finance",
    type: "alert",
    icon: "💰",
    threshold: 10,
    thresholdLabel: "อัตราออมขั้นต่ำ",
    thresholdUnit: "%",
    thresholdMin: 5,
    thresholdMax: 50,
    thresholdStep: 5,
    severity: "warning",
  },

  // ────────────────── 💪 HEALTH ALERTS ──────────────────
  health_bmi: {
    key: "health_bmi",
    label: "ค่า BMI เกินเกณฑ์",
    description: "แจ้งเตือนเมื่อค่า BMI สูงเกินกว่าที่กำหนด",
    module: "health",
    type: "alert",
    icon: "💪",
    threshold: 25,
    thresholdLabel: "เกณฑ์ BMI สูงสุด",
    thresholdUnit: "",
    thresholdMin: 18,
    thresholdMax: 40,
    thresholdStep: 0.5,
    severity: "warning",
  },
  health_calories: {
    key: "health_calories",
    label: "แคลอรีเกิน TDEE",
    description: "แจ้งเตือนเมื่อรับแคลอรีวันนี้เกินค่า TDEE (คำนวณอัตโนมัติจากโปรไฟล์)",
    module: "health",
    type: "alert",
    icon: "💪",
    severity: "warning",
  },

  // ────────────────── 📚 STUDY ALERTS ──────────────────
  study_exam: {
    key: "study_exam",
    label: "นับถอยหลังวันสอบ",
    description: "แจ้งเตือนเมื่อเหลือเวลาเตรียมสอบน้อยกว่าที่กำหนด",
    module: "study",
    type: "alert",
    icon: "📚",
    threshold: 30,
    thresholdLabel: "แจ้งเตือนล่วงหน้า",
    thresholdUnit: "วัน",
    thresholdMin: 7,
    thresholdMax: 90,
    thresholdStep: 1,
    severity: "warning",
  },
  study_progress: {
    key: "study_progress",
    label: "ความก้าวหน้าอ่านต่ำ",
    description: "แจ้งเตือนเมื่อความก้าวหน้าการอ่านหนังสือต่ำกว่าเป้าหมาย",
    module: "study",
    type: "alert",
    icon: "📚",
    threshold: 20,
    thresholdLabel: "เกณฑ์ขั้นต่ำ",
    thresholdUnit: "%",
    thresholdMin: 5,
    thresholdMax: 50,
    thresholdStep: 5,
    severity: "info",
  },

  // ────────────────── ✅ TODO ALERTS ──────────────────
  todo_overdue: {
    key: "todo_overdue",
    label: "งานค้างเกินกำหนด",
    description: "แจ้งเตือนเมื่อมีงานที่ค้างเกินกำหนดที่ยังไม่เสร็จ",
    module: "todo",
    type: "alert",
    icon: "✅",
    severity: "error",
  },
  todo_high: {
    key: "todo_high",
    label: "งานด่วนยังไม่เสร็จ",
    description: "แจ้งเตือนเมื่อมีงานระดับความสำคัญสูงที่ยังไม่ได้ทำ",
    module: "todo",
    type: "alert",
    icon: "✅",
    severity: "warning",
  },

  // ════════════════════════════════════════════════════════
  // REMINDERS — เตือนให้ผู้ใช้ทำ
  // ════════════════════════════════════════════════════════

  // ────────────────── 💰 FINANCE REMINDERS ──────────────────
  remind_finance: {
    key: "remind_finance",
    label: "เตือนอัปเดตข้อมูลการเงิน",
    description: "แจ้งเตือนเมื่อไม่ได้บันทึกรายรับรายจ่ายเกินจำนวนวันที่กำหนด",
    module: "finance",
    type: "reminder",
    icon: "💰",
    dayInterval: 3,
    dayIntervalLabel: "เตือนถ้าไม่บันทึกเกิน",
    dayIntervalMin: 1,
    dayIntervalMax: 14,
    severity: "info",
  },
  remind_budget: {
    key: "remind_budget",
    label: "เตือนตั้งงบ Budget เดือนใหม่",
    description: "แจ้งเตือนเมื่อเดือนใหม่เริ่มแต่ยังไม่มีการตั้งงบประมาณ",
    module: "finance",
    type: "reminder",
    icon: "💰",
    severity: "info",
  },

  // ────────────────── 💪 HEALTH REMINDERS ──────────────────
  remind_food: {
    key: "remind_food",
    label: "เตือนบันทึกอาหารวันนี้",
    description: "แจ้งเตือนถ้าวันนี้ยังไม่ได้บันทึกอาหารที่กินเลย",
    module: "health",
    type: "reminder",
    icon: "💪",
    severity: "info",
  },
  remind_weight: {
    key: "remind_weight",
    label: "เตือนชั่งน้ำหนัก",
    description: "แจ้งเตือนเมื่อไม่ได้ชั่งน้ำหนักเกินจำนวนวันที่กำหนด",
    module: "health",
    type: "reminder",
    icon: "💪",
    dayInterval: 7,
    dayIntervalLabel: "เตือนถ้าไม่ชั่งเกิน",
    dayIntervalMin: 1,
    dayIntervalMax: 30,
    severity: "info",
  },
  remind_workout: {
    key: "remind_workout",
    label: "เตือนออกกำลังกาย",
    description: "แจ้งเตือนเมื่อไม่ได้ออกกำลังกายเกินจำนวนวันที่กำหนด",
    module: "health",
    type: "reminder",
    icon: "💪",
    dayInterval: 3,
    dayIntervalLabel: "เตือนถ้าไม่ออกกำลังเกิน",
    dayIntervalMin: 1,
    dayIntervalMax: 14,
    severity: "info",
  },

  // ────────────────── 📚 STUDY REMINDERS ──────────────────
  remind_study: {
    key: "remind_study",
    label: "เตือนอ่านหนังสือ",
    description: "แจ้งเตือนเมื่อไม่ได้อ่านหนังสือเกินจำนวนวันที่กำหนด",
    module: "study",
    type: "reminder",
    icon: "📚",
    dayInterval: 2,
    dayIntervalLabel: "เตือนถ้าไม่อ่านเกิน",
    dayIntervalMin: 1,
    dayIntervalMax: 14,
    severity: "info",
  },

  // ────────────────── ✅ TODO REMINDERS ──────────────────
  remind_todo: {
    key: "remind_todo",
    label: "เตือนทำ Todo วันนี้",
    description: "แจ้งเตือนเมื่อมี Todo วันนี้ที่ยังรอดำเนินการ",
    module: "todo",
    type: "reminder",
    icon: "✅",
    severity: "info",
  },
}

// Helper: ดึงค่า default ของ key
export function getDefaultConfig(key: string): NotificationConfig | undefined {
  return NOTIFICATION_CONFIGS[key]
}

// Helper: ดึง effective threshold (user setting > default)
export function getEffectiveThreshold(key: string, userThreshold?: number | null): number | undefined {
  const config = NOTIFICATION_CONFIGS[key]
  if (!config) return undefined
  if (userThreshold !== null && userThreshold !== undefined) return userThreshold
  return config.threshold
}

// Helper: ดึง effective dayInterval (user setting > default)
export function getEffectiveDayInterval(key: string, userDayInterval?: number | null): number | undefined {
  const config = NOTIFICATION_CONFIGS[key]
  if (!config) return undefined
  if (userDayInterval !== null && userDayInterval !== undefined) return userDayInterval
  return config.dayInterval
}

// Helper: ดึง configs จัดกลุ่มตาม module
export function getConfigsByModule(): Record<NotificationModule, NotificationConfig[]> {
  const result: Record<NotificationModule, NotificationConfig[]> = {
    finance: [],
    health: [],
    study: [],
    todo: [],
  }
  Object.values(NOTIFICATION_CONFIGS).forEach((config) => {
    result[config.module].push(config)
  })
  return result
}

// All notification keys
export const ALL_NOTIFICATION_KEYS = Object.keys(NOTIFICATION_CONFIGS)
