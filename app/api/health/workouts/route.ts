import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const workoutLogSchema = z.object({
  id: z.string().optional(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  workoutType: z.enum(["CARDIO", "STRENGTH", "FLEXIBILITY", "SPORTS", "OTHER"]),
  name: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  caloriesBurned: z.number().int().min(0).nullable().optional(),
  sets: z.number().int().min(0).nullable().optional(),
  reps: z.number().int().min(0).nullable().optional(),
  weightKg: z.number().min(0).nullable().optional(),
  note: z.string().nullable().optional()
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const logs = await prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { date: "desc" }
    })
    return NextResponse.json(logs)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch workout logs" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = workoutLogSchema.parse(body)

    let result
    if (parsed.id) {
      result = await prisma.workoutLog.update({
        where: { id: parsed.id, userId },
        data: {
          date: parsed.date,
          workoutType: parsed.workoutType,
          name: parsed.name,
          durationMinutes: parsed.durationMinutes,
          caloriesBurned: parsed.caloriesBurned,
          sets: parsed.sets,
          reps: parsed.reps,
          weightKg: parsed.weightKg,
          note: parsed.note
        }
      })
    } else {
      result = await prisma.workoutLog.create({
        data: {
          userId,
          date: parsed.date,
          workoutType: parsed.workoutType,
          name: parsed.name,
          durationMinutes: parsed.durationMinutes,
          caloriesBurned: parsed.caloriesBurned,
          sets: parsed.sets,
          reps: parsed.reps,
          weightKg: parsed.weightKg,
          note: parsed.note
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to save workout log" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.workoutLog.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete workout log" }, { status: 500 })
  }
}
