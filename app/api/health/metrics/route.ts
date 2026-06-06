import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const metricSchema = z.object({
  id: z.string().optional(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  weightKg: z.number().positive(),
  bodyFatPct: z.number().min(0).max(100).nullable().optional(),
  muscleMassKg: z.number().min(0).max(200).nullable().optional(),
  note: z.string().nullable().optional()
})

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined

    const metrics = await prisma.bodyMetric.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: limit
    })

    return NextResponse.json(metrics)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch body metrics" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = metricSchema.parse(body)

    let result
    if (parsed.id) {
      // Update
      result = await prisma.bodyMetric.update({
        where: { id: parsed.id, userId },
        data: {
          date: parsed.date,
          weightKg: parsed.weightKg,
          bodyFatPct: parsed.bodyFatPct,
          muscleMassKg: parsed.muscleMassKg,
          note: parsed.note
        }
      })
    } else {
      // Create new
      // Check if a metric already exists for this exact date (day)
      const dayStart = new Date(parsed.date)
      dayStart.setHours(0,0,0,0)
      const dayEnd = new Date(parsed.date)
      dayEnd.setHours(23,59,59,999)

      const existing = await prisma.bodyMetric.findFirst({
        where: {
          userId,
          date: { gte: dayStart, lte: dayEnd }
        }
      })

      if (existing) {
        // Upsert by updating existing day record
        result = await prisma.bodyMetric.update({
          where: { id: existing.id },
          data: {
            weightKg: parsed.weightKg,
            bodyFatPct: parsed.bodyFatPct ?? existing.bodyFatPct,
            muscleMassKg: parsed.muscleMassKg ?? existing.muscleMassKg,
            note: parsed.note ?? existing.note
          }
        })
      } else {
        result = await prisma.bodyMetric.create({
          data: {
            userId,
            date: parsed.date,
            weightKg: parsed.weightKg,
            bodyFatPct: parsed.bodyFatPct,
            muscleMassKg: parsed.muscleMassKg,
            note: parsed.note
          }
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to save body metric" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.bodyMetric.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete body metric" }, { status: 500 })
  }
}
