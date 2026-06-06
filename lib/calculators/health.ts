/**
 * Health Calculators (BMI, BMR, TDEE, and body ratios)
 */

export function calculateAge(birthDate: Date | string | null): number {
  if (!birthDate) return 30 // fallback default age
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function calculateBMI(weightKg: number, heightCm: number): {
  score: number
  category: string
  color: string
} {
  const heightM = heightCm / 100
  const score = weightKg / (heightM * heightM)
  
  let category = "ปกติ"
  let color = "#10b981" // emerald-500
  
  if (score < 18.5) {
    category = "ผอมเกินไป (Underweight)"
    color = "#3b82f6" // blue-500
  } else if (score < 23.0) {
    category = "น้ำหนักปกติ (Normal weight)"
    color = "#10b981" // emerald-500
  } else if (score < 25.0) {
    category = "น้ำหนักเกิน (Overweight)"
    color = "#f59e0b" // amber-500
  } else if (score < 30.0) {
    category = "อ้วนระดับ 1 (Obese Class 1)"
    color = "#f97316" // orange-500
  } else {
    category = "อ้วนระดับ 2 (Obese Class 2)"
    color = "#ef4444" // red-500
  }
  
  return { score, category, color }
}

export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: "MALE" | "FEMALE"): number {
  // Mifflin-St Jeor Equation
  if (gender === "MALE") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  }
}

export function calculateTDEE(bmr: number, activityLevel: "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE"): number {
  const multipliers = {
    SEDENTARY: 1.2,
    LIGHT: 1.375,
    MODERATE: 1.55,
    ACTIVE: 1.725,
    VERY_ACTIVE: 1.9,
  }
  return bmr * (multipliers[activityLevel] || 1.2)
}

export function calculateWaistToHipRatio(waistCm: number | null, hipCm: number | null, gender: "MALE" | "FEMALE"): {
  ratio: number | null
  risk: string
  color: string
} {
  if (!waistCm || !hipCm || hipCm === 0) {
    return { ratio: null, risk: "ไม่พบข้อมูลสัดส่วน", color: "#64748b" }
  }
  
  const ratio = waistCm / hipCm
  let risk = "ต่ำ (Low)"
  let color = "#10b981" // emerald-500
  
  if (gender === "MALE") {
    if (ratio >= 1.0) {
      risk = "สูง (High)"
      color = "#ef4444" // red-500
    } else if (ratio >= 0.90) {
      risk = "ปานกลาง (Moderate)"
      color = "#f59e0b" // amber-500
    }
  } else {
    if (ratio >= 0.85) {
      risk = "สูง (High)"
      color = "#ef4444" // red-500
    } else if (ratio >= 0.80) {
      risk = "ปานกลาง (Moderate)"
      color = "#f59e0b" // amber-500
    }
  }
  
  return { ratio, risk, color }
}

export function estimateWeeksToGoal(currentWeight: number, targetWeight: number, dailyDeficitKcal = 500): {
  weeks: number
  dailyDeficit: number
  weeklyLossKg: number
} {
  const weightDiff = Math.abs(currentWeight - targetWeight)
  if (weightDiff === 0) return { weeks: 0, dailyDeficit: 0, weeklyLossKg: 0 }
  
  // 7700 kcal deficit roughly equals 1 kg of fat loss
  // Deficit of 500 kcal/day is 3500 kcal/week = ~0.45 kg loss/week
  const weeklyLossKg = (dailyDeficitKcal * 7) / 7700
  const weeks = weightDiff / weeklyLossKg
  
  return {
    weeks,
    dailyDeficit: dailyDeficitKcal,
    weeklyLossKg
  }
}
