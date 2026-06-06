import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  dueTime: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("PENDING"),
  categoryId: z.string().nullable().optional(),
  isRecurring: z.boolean().default(false),
  recurFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).nullable().optional()
})

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get("date") // optional filter e.g. "2026-06-06"
    const status = searchParams.get("status")

    let whereClause: any = { userId }

    if (dateStr) {
      const dayStart = new Date(dateStr)
      dayStart.setHours(0,0,0,0)
      const dayEnd = new Date(dateStr)
      dayEnd.setHours(23,59,59,999)

      whereClause = {
        userId,
        OR: [
          {
            date: {
              gte: dayStart,
              lte: dayEnd
            }
          },
          {
            isRecurring: true,
            date: {
              lte: dayEnd
            }
          }
        ]
      }
    }

    let tasks = await prisma.todoTask.findMany({
      where: whereClause,
      include: { category: true },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" }
      ]
    })

    if (dateStr) {
      const [year, month, day] = dateStr.split("-").map(Number)
      const targetMidnight = new Date(year, month - 1, day)

      // 1. Filter recurring tasks in memory
      tasks = tasks.filter(task => {
        if (!task.isRecurring) return true

        const taskDate = new Date(task.date)
        const taskMidnight = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate())

        if (taskMidnight > targetMidnight) return false

        if (task.recurFrequency === "DAILY") {
          return true
        } else if (task.recurFrequency === "WEEKLY") {
          return targetMidnight.getDay() === taskMidnight.getDay()
        } else if (task.recurFrequency === "MONTHLY") {
          return targetMidnight.getDate() === taskMidnight.getDate()
        }
        return false
      })

      // 2. Map dynamic completion status
      tasks = tasks.map(task => {
        if (task.isRecurring && task.status === "COMPLETED") {
          const completedDate = task.completedAt ? new Date(task.completedAt) : null
          if (completedDate) {
            const isSameDay =
              completedDate.getFullYear() === targetMidnight.getFullYear() &&
              completedDate.getMonth() === targetMidnight.getMonth() &&
              completedDate.getDate() === targetMidnight.getDate();

            if (!isSameDay) {
              return {
                ...task,
                status: "PENDING",
                completedAt: null
              }
            }
          } else {
            return {
              ...task,
              status: "PENDING"
            }
          }
        }
        return task
      })
    }

    if (status) {
      tasks = tasks.filter(t => t.status === status)
    }

    return NextResponse.json(tasks)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = taskSchema.parse(body)

    let result
    if (parsed.id) {
      const existing = await prisma.todoTask.findUnique({
        where: { id: parsed.id, userId }
      })

      if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 })

      let completedAt = existing.completedAt
      if (parsed.status === "COMPLETED") {
        if (existing.status !== "COMPLETED") {
          completedAt = new Date()
        } else if ((parsed.isRecurring || existing.isRecurring) && existing.completedAt) {
          const completedDate = new Date(existing.completedAt)
          const today = new Date()
          const isSameDay =
            completedDate.getFullYear() === today.getFullYear() &&
            completedDate.getMonth() === today.getMonth() &&
            completedDate.getDate() === today.getDate();

          if (!isSameDay) {
            completedAt = new Date()
          }
        }
      } else {
        completedAt = null
      }

      result = await prisma.todoTask.update({
        where: { id: parsed.id },
        data: {
          title: parsed.title,
          description: parsed.description,
          date: parsed.date,
          dueTime: parsed.dueTime,
          priority: parsed.priority,
          status: parsed.status,
          completedAt,
          categoryId: parsed.categoryId,
          isRecurring: parsed.isRecurring,
          recurFrequency: parsed.recurFrequency
        }
      })
    } else {
      const completedAt = parsed.status === "COMPLETED" ? new Date() : null

      // Get count for sortOrder
      const count = await prisma.todoTask.count({
        where: { userId }
      })

      result = await prisma.todoTask.create({
        data: {
          userId,
          title: parsed.title,
          description: parsed.description,
          date: parsed.date,
          dueTime: parsed.dueTime,
          priority: parsed.priority,
          status: parsed.status,
          completedAt,
          categoryId: parsed.categoryId,
          isRecurring: parsed.isRecurring,
          recurFrequency: parsed.recurFrequency,
          sortOrder: count
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to save task" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.todoTask.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
