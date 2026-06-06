import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const subjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  examId: z.string().min(1),
  weight: z.number().min(0).max(100).nullable().optional(),
  targetScore: z.number().min(0).nullable().optional(),
  color: z.string().default("#3b82f6"),
  sortOrder: z.number().int().default(0)
})

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const examId = searchParams.get("examId")

    let whereClause: any = { exam: { userId } }
    if (examId) {
      whereClause.examId = examId
    }

    const subjects = await prisma.studySubject.findMany({
      where: whereClause,
      orderBy: { sortOrder: "asc" }
    })
    return NextResponse.json(subjects)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = subjectSchema.parse(body)

    // Verify the exam belongs to the user
    const exam = await prisma.studyExam.findFirst({
      where: { id: parsed.examId, userId }
    })
    if (!exam) return NextResponse.json({ error: "Exam not found or unauthorized" }, { status: 404 })

    let result
    if (parsed.id) {
      result = await prisma.studySubject.update({
        where: { id: parsed.id },
        data: {
          name: parsed.name,
          weight: parsed.weight,
          targetScore: parsed.targetScore,
          color: parsed.color,
          sortOrder: parsed.sortOrder
        }
      })
    } else {
      result = await prisma.studySubject.create({
        data: {
          examId: parsed.examId,
          name: parsed.name,
          weight: parsed.weight,
          targetScore: parsed.targetScore,
          color: parsed.color,
          sortOrder: parsed.sortOrder
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to save subject" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    // Verify ownership
    const subject = await prisma.studySubject.findFirst({
      where: { id, exam: { userId } }
    })
    if (!subject) return NextResponse.json({ error: "Subject not found or unauthorized" }, { status: 404 })

    await prisma.studySubject.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 })
  }
}
