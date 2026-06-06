import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const examSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  examDate: z.string().or(z.date()).transform((val) => new Date(val)),
  university: z.string().nullable().optional(),
  program: z.string().nullable().optional(),
  isActive: z.boolean().default(true)
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const exams = await prisma.studyExam.findMany({
      where: { userId },
      orderBy: { examDate: "asc" }
    })
    return NextResponse.json(exams)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = examSchema.parse(body)

    let result
    if (parsed.id) {
      result = await prisma.studyExam.update({
        where: { id: parsed.id, userId },
        data: {
          name: parsed.name,
          examDate: parsed.examDate,
          university: parsed.university,
          program: parsed.program,
          isActive: parsed.isActive
        }
      })
    } else {
      // If setting this to active, set others to inactive
      if (parsed.isActive) {
        await prisma.studyExam.updateMany({
          where: { userId, isActive: true },
          data: { isActive: false }
        })
      }

      result = await prisma.studyExam.create({
        data: {
          userId,
          name: parsed.name,
          examDate: parsed.examDate,
          university: parsed.university,
          program: parsed.program,
          isActive: parsed.isActive
        }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to save exam" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 })

    await prisma.studyExam.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 })
  }
}
