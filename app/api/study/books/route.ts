import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const bookSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  author: z.string().nullable().optional(),
  totalPages: z.number().int().positive(),
  currentPage: z.number().int().nonnegative().default(0),
  totalChapters: z.number().int().positive().nullable().optional(),
  currentChapter: z.number().int().nonnegative().default(0),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  status: z.enum(["NOT_STARTED", "READING", "COMPLETED", "ON_HOLD"]).default("NOT_STARTED"),
  coverColor: z.string().default("#3b82f6"),
  notes: z.string().nullable().optional(),
  startDate: z.string().or(z.date()).nullable().optional().transform((val) => val ? new Date(val) : null),
  finishDate: z.string().or(z.date()).nullable().optional().transform((val) => val ? new Date(val) : null),
  subjectId: z.string().nullable().optional()
})

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const subjectId = searchParams.get("subjectId")

    let whereClause: any = { userId }
    if (status) whereClause.status = status
    if (subjectId) whereClause.subjectId = subjectId

    const books = await prisma.studyBook.findMany({
      where: whereClause,
      include: { subject: true },
      orderBy: [
        { priority: "desc" },
        { title: "asc" }
      ]
    })
    return NextResponse.json(books)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = bookSchema.parse(body)

    let result
    if (parsed.id) {
      // If status is completed and was not completed, or page is total, set finishDate
      let status = parsed.status
      let finishDate = parsed.finishDate
      if (parsed.currentPage >= parsed.totalPages) {
        status = "COMPLETED"
        if (!finishDate) finishDate = new Date()
      }

      result = await prisma.studyBook.update({
        where: { id: parsed.id, userId },
        data: {
          title: parsed.title,
          author: parsed.author,
          totalPages: parsed.totalPages,
          currentPage: parsed.currentPage,
          totalChapters: parsed.totalChapters,
          currentChapter: parsed.currentChapter,
          priority: parsed.priority,
          status,
          coverColor: parsed.coverColor,
          notes: parsed.notes,
          startDate: parsed.startDate,
          finishDate,
          subjectId: parsed.subjectId
        }
      })
    } else {
      let status = parsed.status
      let finishDate = parsed.finishDate
      if (parsed.currentPage >= parsed.totalPages) {
        status = "COMPLETED"
        if (!finishDate) finishDate = new Date()
      }

      result = await prisma.studyBook.create({
        data: {
          userId,
          title: parsed.title,
          author: parsed.author,
          totalPages: parsed.totalPages,
          currentPage: parsed.currentPage,
          totalChapters: parsed.totalChapters,
          currentChapter: parsed.currentChapter,
          priority: parsed.priority,
          status,
          coverColor: parsed.coverColor,
          notes: parsed.notes,
          startDate: parsed.startDate,
          finishDate,
          subjectId: parsed.subjectId
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to save book" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.studyBook.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete book" }, { status: 500 })
  }
}
