import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const sessionSchema = z.object({
  id: z.string().optional(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  durationMinutes: z.number().int().positive(),
  pagesRead: z.number().int().nonnegative().nullable().optional(),
  note: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  bookId: z.string().nullable().optional() // optional to auto-update progress of a book if specified
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const sessions = await prisma.studySession.findMany({
      where: { userId },
      include: { subject: true },
      orderBy: { date: "desc" }
    })
    return NextResponse.json(sessions)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch study sessions" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = sessionSchema.parse(body)

    // Verify subject ownership if specified
    if (parsed.subjectId) {
      const subject = await prisma.studySubject.findFirst({
        where: { id: parsed.subjectId, exam: { userId } }
      })
      if (!subject) return NextResponse.json({ error: "Subject not found or unauthorized" }, { status: 404 })
    }

    let result
    if (parsed.id) {
      result = await prisma.studySession.update({
        where: { id: parsed.id, userId },
        data: {
          date: parsed.date,
          durationMinutes: parsed.durationMinutes,
          pagesRead: parsed.pagesRead,
          note: parsed.note,
          subjectId: parsed.subjectId
        }
      })
    } else {
      result = await prisma.studySession.create({
        data: {
          userId,
          date: parsed.date,
          durationMinutes: parsed.durationMinutes,
          pagesRead: parsed.pagesRead,
          note: parsed.note,
          subjectId: parsed.subjectId
        }
      })

      // If a book ID is provided and pagesRead is provided, increment pages read of that book
      if (parsed.bookId && parsed.pagesRead) {
        const book = await prisma.studyBook.findFirst({
          where: { id: parsed.bookId, userId }
        })
        if (book) {
          const newCurrentPage = Math.min(book.totalPages, book.currentPage + parsed.pagesRead)
          await prisma.studyBook.update({
            where: { id: book.id },
            data: {
              currentPage: newCurrentPage,
              status: newCurrentPage >= book.totalPages ? "COMPLETED" : "READING",
              finishDate: newCurrentPage >= book.totalPages ? new Date() : book.finishDate
            }
          })
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to save study session" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.studySession.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete study session" }, { status: 500 })
  }
}
