import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const calorieLogSchema = z.object({
  id: z.string().optional(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  foodName: z.string().min(1),
  calories: z.number().int().min(0),
  proteinG: z.number().min(0).nullable().optional(),
  carbsG: z.number().min(0).nullable().optional(),
  fatG: z.number().min(0).nullable().optional(),
  note: z.string().nullable().optional(),
  saveToDb: z.boolean().optional()
})

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get("date") // optional: filter by date "YYYY-MM-DD"
    
    let whereClause: any = { userId }
    
    if (dateStr) {
      const dayStart = new Date(dateStr)
      dayStart.setHours(0,0,0,0)
      const dayEnd = new Date(dateStr)
      dayEnd.setHours(23,59,59,999)
      
      whereClause.date = {
        gte: dayStart,
        lte: dayEnd
      }
    }

    const logs = await prisma.calorieLog.findMany({
      where: whereClause,
      orderBy: { date: "desc" }
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch calorie logs" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = calorieLogSchema.parse(body)

    const result = await prisma.calorieLog.create({
      data: {
        userId,
        date: parsed.date,
        mealType: parsed.mealType,
        foodName: parsed.foodName,
        calories: parsed.calories,
        proteinG: parsed.proteinG,
        carbsG: parsed.carbsG,
        fatG: parsed.fatG,
        note: parsed.note
      }
    })

    // Automatically save to food database (FoodItem) if it doesn't exist yet
    const existingFood = await prisma.foodItem.findFirst({
      where: {
        OR: [
          { userId: null },
          { userId }
        ],
        name: {
          equals: parsed.foodName,
          mode: "insensitive"
        }
      }
    })

    if (parsed.saveToDb && !existingFood) {
      await prisma.foodItem.create({
        data: {
          userId,
          name: parsed.foodName,
          calories: parsed.calories,
          proteinG: parsed.proteinG,
          carbsG: parsed.carbsG,
          fatG: parsed.fatG,
          isCustom: true
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to log calories" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = calorieLogSchema.parse(body)
    
    if (!parsed.id) {
      return NextResponse.json({ error: "Missing ID for update" }, { status: 400 })
    }

    const result = await prisma.calorieLog.update({
      where: { id: parsed.id, userId },
      data: {
        date: parsed.date,
        mealType: parsed.mealType,
        foodName: parsed.foodName,
        calories: parsed.calories,
        proteinG: parsed.proteinG,
        carbsG: parsed.carbsG,
        fatG: parsed.fatG,
        note: parsed.note
      }
    })

    // Automatically save to food database (FoodItem) if it doesn't exist yet
    const existingFood = await prisma.foodItem.findFirst({
      where: {
        OR: [
          { userId: null },
          { userId }
        ],
        name: {
          equals: parsed.foodName,
          mode: "insensitive"
        }
      }
    })

    if (parsed.saveToDb && !existingFood) {
      await prisma.foodItem.create({
        data: {
          userId,
          name: parsed.foodName,
          calories: parsed.calories,
          proteinG: parsed.proteinG,
          carbsG: parsed.carbsG,
          fatG: parsed.fatG,
          isCustom: true
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to update calorie log" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.calorieLog.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete calorie log" }, { status: 500 })
  }
}
