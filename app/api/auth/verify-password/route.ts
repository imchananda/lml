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
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { appLockPin: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // If user has no PIN set, prompt them to set one first
    if (!user.appLockPin) {
      return NextResponse.json({ 
        verified: false, 
        noPassword: true,
        message: "ยังไม่ได้ตั้งรหัสผ่าน กรุณาตั้งรหัสผ่านก่อน" 
      })
    }

    // Compare PIN
    const isValid = password === user.appLockPin
    return NextResponse.json({ verified: isValid })
  } catch (error) {
    console.error("Verify password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
