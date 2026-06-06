import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  icon: z.string().nullable().optional(),
  color: z.string().default("#a78bfa")
})

const defaultCategories = [
  { name: "💰 Finance", color: "#10b981" },
  { name: "💪 Health", color: "#f59e0b" },
  { name: "📚 Study", color: "#0ea5e9" },
  { name: "💼 Work", color: "#8b5cf6" },
  { name: "🏠 Personal", color: "#ec4899" }
]

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    let categories = await prisma.todoCategory.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    })

    // If no categories exist, auto-seed defaults for this user
    if (categories.length === 0) {
      await prisma.todoCategory.createMany({
        data: defaultCategories.map(cat => ({
          userId,
          name: cat.name,
          color: cat.color
        }))
      })

      categories = await prisma.todoCategory.findMany({
        where: { userId },
        orderBy: { name: "asc" }
      })
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch todo categories" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = categorySchema.parse(body)

    let result
    if (parsed.id) {
      result = await prisma.todoCategory.update({
        where: { id: parsed.id, userId },
        data: {
          name: parsed.name,
          icon: parsed.icon,
          color: parsed.color
        }
      })
    } else {
      result = await prisma.todoCategory.create({
        data: {
          userId,
          name: parsed.name,
          icon: parsed.icon,
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
    return NextResponse.json({ error: "Failed to save todo category" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.todoCategory.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete todo category" }, { status: 500 })
  }
}
