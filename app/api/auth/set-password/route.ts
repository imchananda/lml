import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { password } = await req.json()
    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Set password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
