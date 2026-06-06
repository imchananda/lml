import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const scoreSchema = z.object({
  id: z.string().optional(),
  testName: z.string().min(1),
  score: z.number().min(0),
  maxScore: z.number().positive(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  note: z.string().nullable().optional(),
  subjectId: z.string().min(1)
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const scores = await prisma.studyScore.findMany({
      where: { userId },
      include: { subject: true },
      orderBy: { date: "desc" }
    })
    return NextResponse.json(scores)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch study scores" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = scoreSchema.parse(body)

    // Verify subject ownership
    const subject = await prisma.studySubject.findFirst({
      where: { id: parsed.subjectId, exam: { userId } }
    })
    if (!subject) return NextResponse.json({ error: "Subject not found or unauthorized" }, { status: 404 })

    let result
    if (parsed.id) {
      result = await prisma.studyScore.update({
        where: { id: parsed.id, userId },
        data: {
          testName: parsed.testName,
          score: parsed.score,
          maxScore: parsed.maxScore,
          date: parsed.date,
          note: parsed.note,
          subjectId: parsed.subjectId
        }
      })
    } else {
      result = await prisma.studyScore.create({
        data: {
          userId,
          testName: parsed.testName,
          score: parsed.score,
          maxScore: parsed.maxScore,
          date: parsed.date,
          note: parsed.note,
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
    return NextResponse.json({ error: "Failed to save study score" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.studyScore.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete study score" }, { status: 500 })
  }
}
