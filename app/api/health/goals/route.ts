import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const healthGoalSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["WEIGHT_LOSS", "WEIGHT_GAIN", "MAINTAIN", "BODY_FAT_REDUCTION", "MUSCLE_GAIN"]),
  targetValue: z.number().positive(),
  startValue: z.number().positive(),
  currentValue: z.number().positive(),
  unit: z.string().default("kg"),
  deadline: z.string().or(z.date()).nullable().optional().transform((val) => val ? new Date(val) : null),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "PAUSED", "CANCELLED"]).default("IN_PROGRESS")
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const goals = await prisma.healthGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(goals)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch health goals" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = healthGoalSchema.parse(body)

    let result
    if (parsed.id) {
      result = await prisma.healthGoal.update({
        where: { id: parsed.id, userId },
        data: {
          type: parsed.type,
          targetValue: parsed.targetValue,
          startValue: parsed.startValue,
          currentValue: parsed.currentValue,
          unit: parsed.unit,
          deadline: parsed.deadline,
          status: parsed.status
        }
      })
    } else {
      // Deactivate other active goals of the same type (optional, but standard for single target weight)
      if (parsed.type === "WEIGHT_LOSS" || parsed.type === "WEIGHT_GAIN" || parsed.type === "MAINTAIN") {
        await prisma.healthGoal.updateMany({
          where: { 
            userId, 
            type: { in: ["WEIGHT_LOSS", "WEIGHT_GAIN", "MAINTAIN"] },
            status: "IN_PROGRESS"
          },
          data: { status: "CANCELLED" }
        })
      }

      result = await prisma.healthGoal.create({
        data: {
          userId,
          type: parsed.type,
          targetValue: parsed.targetValue,
          startValue: parsed.startValue,
          currentValue: parsed.currentValue,
          unit: parsed.unit,
          deadline: parsed.deadline,
          status: parsed.status
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to save health goal" }, { status: 500 })
  }
}
