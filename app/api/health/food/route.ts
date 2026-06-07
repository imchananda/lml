import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const foodItemSchema = z.object({
  name: z.string().min(1),
  calories: z.number().int().min(0),
  proteinG: z.number().min(0).nullable().optional(),
  carbsG: z.number().min(0).nullable().optional(),
  fatG: z.number().min(0).nullable().optional()
})

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("query") || ""
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    // Find items that are system default (userId is null) OR custom for the current user
    const foods = await prisma.foodItem.findMany({
      where: {
        OR: [
          { userId: null },
          { userId }
        ],
        name: {
          contains: query,
          mode: "insensitive"
        }
      },
      orderBy: { name: "asc" },
      ...(limit ? { take: limit } : {})
    })

    return NextResponse.json(foods)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to search food items" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = foodItemSchema.parse(body)

    // Check if item with this name already exists for the user
    const existing = await prisma.foodItem.findFirst({
      where: {
        userId,
        name: parsed.name
      }
    })

    if (existing) {
      return NextResponse.json({ error: "มีเมนูอาหารนี้ในประวัติของคุณอยู่แล้ว" }, { status: 400 })
    }

    const food = await prisma.foodItem.create({
      data: {
        userId,
        name: parsed.name,
        calories: parsed.calories,
        proteinG: parsed.proteinG,
        carbsG: parsed.carbsG,
        fatG: parsed.fatG,
        isCustom: true
      }
    })

    return NextResponse.json(food)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to save custom food item" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = foodItemSchema.extend({ id: z.string() }).parse(body)

    // Check if it exists and belongs to the user
    const existing = await prisma.foodItem.findUnique({
      where: { id: parsed.id }
    })

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบเมนูอาหารนี้" }, { status: 404 })
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขเมนูอาหารนี้" }, { status: 403 })
    }

    const updated = await prisma.foodItem.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        calories: parsed.calories,
        proteinG: parsed.proteinG,
        carbsG: parsed.carbsG,
        fatG: parsed.fatG
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to update food item" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    const existing = await prisma.foodItem.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบเมนูอาหารนี้" }, { status: 404 })
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ลบเมนูอาหารนี้" }, { status: 403 })
    }

    await prisma.foodItem.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete food item" }, { status: 500 })
  }
}
