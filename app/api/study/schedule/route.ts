import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const scheduleSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  date: z.string().or(z.date()).nullable().optional().transform((val) => val ? new Date(val) : null),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  type: z.enum(["STUDY", "EXAM", "REVIEW", "BREAK"]).default("STUDY"),
  isRecurring: z.boolean().default(false),
  color: z.string().default("#3b82f6")
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const schedules = await prisma.studySchedule.findMany({
      where: { userId },
      orderBy: [
        { dayOfWeek: "asc" },
        { date: "asc" },
        { startTime: "asc" }
      ]
    })
    return NextResponse.json(schedules)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch study schedules" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = scheduleSchema.parse(body)

    let result
    if (parsed.id) {
      result = await prisma.studySchedule.update({
        where: { id: parsed.id, userId },
        data: {
          title: parsed.title,
          date: parsed.date,
          dayOfWeek: parsed.dayOfWeek,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          type: parsed.type,
          isRecurring: parsed.isRecurring,
          color: parsed.color
        }
      })
    } else {
      result = await prisma.studySchedule.create({
        data: {
          userId,
          title: parsed.title,
          date: parsed.date,
          dayOfWeek: parsed.dayOfWeek,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          type: parsed.type,
          isRecurring: parsed.isRecurring,
          color: parsed.color
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to save study schedule" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.studySchedule.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete study schedule" }, { status: 500 })
  }
}
