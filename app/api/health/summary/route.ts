import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { calculateBMI, calculateBMR, calculateTDEE, calculateAge, calculateWaistToHipRatio } from "@/lib/calculators/health"

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const todayStart = new Date()
    todayStart.setHours(0,0,0,0)
    const todayEnd = new Date()
    todayEnd.setHours(23,59,59,999)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0,0,0,0)

    // 1. Fetch User Info & Profile
    const [user, profile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { birthDate: true }
      }),
      prisma.healthProfile.findUnique({
        where: { userId }
      })
    ])

    const height = profile?.heightCm || 170.0
    const gender = profile?.gender || "MALE"
    const activityLevel = profile?.activityLevel || "MODERATE"
    const age = calculateAge(user?.birthDate || null)

    // 2. Fetch Latest Weight & Composition
    const latestMetric = await prisma.bodyMetric.findFirst({
      where: { userId },
      orderBy: { date: "desc" }
    })

    const currentWeight = latestMetric?.weightKg || 70.0 // fallback default
    const bodyFatPct = latestMetric?.bodyFatPct || null
    const muscleMassKg = latestMetric?.muscleMassKg || null

    // 3. Calculate BMI, BMR, TDEE
    const bmiData = calculateBMI(currentWeight, height)
    const bmr = calculateBMR(currentWeight, height, age, gender)
    const tdee = calculateTDEE(bmr, activityLevel)

    // 4. Fetch Active Weight Goal
    const activeGoal = await prisma.healthGoal.findFirst({
      where: { 
        userId, 
        status: "IN_PROGRESS",
        type: { in: ["WEIGHT_LOSS", "WEIGHT_GAIN", "MAINTAIN"] }
      }
    })

    // 5. Today's Calories Consumed
    const todayCaloriesAgg = await prisma.calorieLog.aggregate({
      _sum: { calories: true, proteinG: true, carbsG: true, fatG: true },
      where: { userId, date: { gte: todayStart, lte: todayEnd } }
    })

    const caloriesConsumed = todayCaloriesAgg._sum.calories || 0
    const proteinConsumed = todayCaloriesAgg._sum.proteinG || 0
    const carbsConsumed = todayCaloriesAgg._sum.carbsG || 0
    const fatConsumed = todayCaloriesAgg._sum.fatG || 0

    // Calorie Target based on weight goal
    let calorieTarget = Math.round(tdee)
    if (activeGoal) {
      if (activeGoal.type === "WEIGHT_LOSS") {
        calorieTarget = Math.round(tdee - 500) // 500 kcal deficit
      } else if (activeGoal.type === "WEIGHT_GAIN") {
        calorieTarget = Math.round(tdee + 500) // 500 kcal surplus
      }
    }

    // 6. Weekly Calories Consumed Trend (Last 7 Days)
    const calorieHistory = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dStart = new Date(d)
      dStart.setHours(0,0,0,0)
      const dEnd = new Date(d)
      dEnd.setHours(23,59,59,999)

      const agg = await prisma.calorieLog.aggregate({
        _sum: { calories: true },
        where: { userId, date: { gte: dStart, lte: dEnd } }
      })

      calorieHistory.push({
        date: d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric" }),
        calories: agg._sum.calories || 0,
        target: calorieTarget
      })
    }

    // 7. Today's Workout Burned
    const todayWorkoutsAgg = await prisma.workoutLog.aggregate({
      _sum: { caloriesBurned: true, durationMinutes: true },
      where: { userId, date: { gte: todayStart, lte: todayEnd } }
    })

    const workoutCaloriesBurned = todayWorkoutsAgg._sum.caloriesBurned || 0
    const workoutDurationToday = todayWorkoutsAgg._sum.durationMinutes || 0

    // 8. Weekly Workout Summary (Last 7 Days)
    const weeklyWorkouts = await prisma.workoutLog.findMany({
      where: { 
        userId, 
        date: { gte: sevenDaysAgo } 
      }
    })

    const weeklyWorkoutsCount = weeklyWorkouts.length
    const weeklyWorkoutsDuration = weeklyWorkouts.reduce((sum, w) => sum + w.durationMinutes, 0)
    const weeklyWorkoutsBurned = weeklyWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0)

    // 9. Latest Body Measurements
    const latestMeasurement = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { date: "desc" }
    })

    const ratioData = calculateWaistToHipRatio(
      latestMeasurement?.waistCm || null,
      latestMeasurement?.hipCm || null,
      gender
    )

    // Weight progress calculations
    let weightProgressPct = 0
    if (activeGoal) {
      const diffTotal = Math.abs(activeGoal.startValue - activeGoal.targetValue)
      const diffCurrent = Math.abs(activeGoal.currentValue - activeGoal.targetValue)
      if (diffTotal > 0) {
        weightProgressPct = Math.min(100, Math.round(((diffTotal - diffCurrent) / diffTotal) * 100))
        if (weightProgressPct < 0) weightProgressPct = 0
      }
    }

    return NextResponse.json({
      height,
      gender,
      activityLevel,
      age,
      weight: {
        current: currentWeight,
        bodyFat: bodyFatPct,
        muscleMass: muscleMassKg,
        history: await prisma.bodyMetric.findMany({
          where: { userId },
          orderBy: { date: "asc" },
          take: 30
        })
      },
      bmi: {
        score: bmiData.score,
        category: bmiData.category,
        color: bmiData.color
      },
      calories: {
        consumed: caloriesConsumed,
        target: calorieTarget,
        burned: workoutCaloriesBurned,
        net: caloriesConsumed - workoutCaloriesBurned,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        macros: {
          protein: proteinConsumed,
          carbs: carbsConsumed,
          fat: fatConsumed
        },
        history: calorieHistory
      },
      workouts: {
        todayCount: await prisma.workoutLog.count({ where: { userId, date: { gte: todayStart, lte: todayEnd } } }),
        todayDuration: workoutDurationToday,
        weeklyCount: weeklyWorkoutsCount,
        weeklyDuration: weeklyWorkoutsDuration,
        weeklyBurned: weeklyWorkoutsBurned
      },
      measurements: latestMeasurement ? {
        waist: latestMeasurement.waistCm,
        hip: latestMeasurement.hipCm,
        chest: latestMeasurement.chestCm,
        arms: latestMeasurement.leftArmCm,
        thighs: latestMeasurement.leftThighCm,
        calves: latestMeasurement.leftCalfCm,
        ratio: ratioData.ratio,
        risk: ratioData.risk,
        color: ratioData.color,
        date: latestMeasurement.date
      } : null,
      goal: activeGoal ? {
        id: activeGoal.id,
        type: activeGoal.type,
        start: activeGoal.startValue,
        target: activeGoal.targetValue,
        current: activeGoal.currentValue,
        progressPct: weightProgressPct,
        deadline: activeGoal.deadline
      } : null
    })
  } catch (error) {
    console.error("Health summary error:", error)
    return NextResponse.json({ error: "Failed to load health summary" }, { status: 500 })
  }
}
