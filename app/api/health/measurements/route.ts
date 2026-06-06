import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const measurementSchema = z.object({
  id: z.string().optional(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  waistCm: z.number().min(0).nullable().optional(),
  hipCm: z.number().min(0).nullable().optional(),
  chestCm: z.number().min(0).nullable().optional(),
  leftArmCm: z.number().min(0).nullable().optional(),
  rightArmCm: z.number().min(0).nullable().optional(),
  leftThighCm: z.number().min(0).nullable().optional(),
  rightThighCm: z.number().min(0).nullable().optional(),
  leftCalfCm: z.number().min(0).nullable().optional(),
  rightCalfCm: z.number().min(0).nullable().optional(),
  buttCm: z.number().min(0).nullable().optional(),
  neckCm: z.number().min(0).nullable().optional(),
  note: z.string().nullable().optional()
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const measurements = await prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { date: "desc" }
    })
    return NextResponse.json(measurements)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch measurements" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = measurementSchema.parse(body)

    let result
    if (parsed.id) {
      result = await prisma.bodyMeasurement.update({
        where: { id: parsed.id, userId },
        data: {
          date: parsed.date,
          waistCm: parsed.waistCm,
          hipCm: parsed.hipCm,
          chestCm: parsed.chestCm,
          leftArmCm: parsed.leftArmCm,
          rightArmCm: parsed.rightArmCm,
          leftThighCm: parsed.leftThighCm,
          rightThighCm: parsed.rightThighCm,
          leftCalfCm: parsed.leftCalfCm,
          rightCalfCm: parsed.rightCalfCm,
          buttCm: parsed.buttCm,
          neckCm: parsed.neckCm,
          note: parsed.note
        }
      })
    } else {
      // Create or update by date
      const dayStart = new Date(parsed.date)
      dayStart.setHours(0,0,0,0)
      const dayEnd = new Date(parsed.date)
      dayEnd.setHours(23,59,59,999)

      const existing = await prisma.bodyMeasurement.findFirst({
        where: {
          userId,
          date: { gte: dayStart, lte: dayEnd }
        }
      })

      if (existing) {
        result = await prisma.bodyMeasurement.update({
          where: { id: existing.id },
          data: {
            waistCm: parsed.waistCm ?? existing.waistCm,
            hipCm: parsed.hipCm ?? existing.hipCm,
            chestCm: parsed.chestCm ?? existing.chestCm,
            leftArmCm: parsed.leftArmCm ?? existing.leftArmCm,
            rightArmCm: parsed.rightArmCm ?? existing.rightArmCm,
            leftThighCm: parsed.leftThighCm ?? existing.leftThighCm,
            rightThighCm: parsed.rightThighCm ?? existing.rightThighCm,
            leftCalfCm: parsed.leftCalfCm ?? existing.leftCalfCm,
            rightCalfCm: parsed.rightCalfCm ?? existing.rightCalfCm,
            buttCm: parsed.buttCm ?? existing.buttCm,
            neckCm: parsed.neckCm ?? existing.neckCm,
            note: parsed.note ?? existing.note
          }
        })
      } else {
        result = await prisma.bodyMeasurement.create({
          data: {
            userId,
            date: parsed.date,
            waistCm: parsed.waistCm,
            hipCm: parsed.hipCm,
            chestCm: parsed.chestCm,
            leftArmCm: parsed.leftArmCm,
            rightArmCm: parsed.rightArmCm,
            leftThighCm: parsed.leftThighCm,
            rightThighCm: parsed.rightThighCm,
            leftCalfCm: parsed.leftCalfCm,
            rightCalfCm: parsed.rightCalfCm,
            buttCm: parsed.buttCm,
            neckCm: parsed.neckCm,
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
    return NextResponse.json({ error: "Failed to save body measurements" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.bodyMeasurement.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete measurements" }, { status: 500 })
  }
}
