import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const settingsSchema = z.object({
  name: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  monthlyIncome: z.number().min(0),
  currency: z.string().min(2).max(5)
})

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const user: any = await (prisma.user.findUnique as any)({
      where: { id: userId },
      select: { name: true, image: true, birthDate: true, monthlyIncome: true, currency: true }
    })
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = await req.json()
    const data = settingsSchema.parse(body)

    const updated: any = await (prisma.user.update as any)({
      where: { id: userId },
      data: {
        name: data.name,
        image: data.image,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        monthlyIncome: data.monthlyIncome,
        currency: data.currency
      },
      select: { name: true, image: true, birthDate: true, monthlyIncome: true, currency: true }
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
