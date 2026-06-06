import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { z } from "zod"

const profileSchema = z.object({
  heightCm: z.number().min(50).max(300),
  gender: z.enum(["MALE", "FEMALE"]),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"])
})

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    let profile = await prisma.healthProfile.findUnique({
      where: { userId }
    })

    // If it doesn't exist, create a default profile
    if (!profile) {
      profile = await prisma.healthProfile.create({
        data: {
          userId,
          heightCm: 170.0,
          gender: "MALE",
          activityLevel: "MODERATE"
        }
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch health profile" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = profileSchema.parse(body)

    const updated = await prisma.healthProfile.upsert({
      where: { userId },
      update: {
        heightCm: parsed.heightCm,
        gender: parsed.gender,
        activityLevel: parsed.activityLevel
      },
      create: {
        userId,
        heightCm: parsed.heightCm,
        gender: parsed.gender,
        activityLevel: parsed.activityLevel
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: "Failed to update health profile" }, { status: 500 })
  }
}
