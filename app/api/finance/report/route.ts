// @ts-nocheck
import { getCurrentUserId } from '@/lib/auth-helper'
import { getUserLifeContext } from '@/lib/ai-context'
import { prisma } from '@/lib/prisma'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const genAI = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })

  try {
    const context = await getUserLifeContext(userId)
    
    const prompt = `สร้างบทสรุปคำแนะนำสำหรับการรายงานผลการใช้ชีวิต (LiveMyLife Report) ประจำปี ${context.period.year}

ข้อมูลผู้ใช้ในระบบ LiveMyLife:
${JSON.stringify(context, null, 2)}

สร้างคำแนะนำเชิงกลยุทธ์ 3-5 ข้อ ในรูปแบบ JSON:
{
  "title": "สรุปผลลัพธ์และทิศทางชีวิตโดยรวม (1 ประโยค)",
  "overallScore": "A" | "B" | "C" | "D",
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "area": "การเงิน" | "สุขภาพ" | "การเรียน" | "ภารกิจ",
      "action": "คำแนะนำสั้นๆ ที่เป็นรูปธรรมและทำตามได้ทันที (1-2 ประโยค)"
    }
  ],
  "outlook": "มุมมองและแนวโน้มการพัฒนาตนเองในอีก 6-12 เดือนข้างหน้า (1-2 ประโยค)"
}

ตอบเป็นภาษาไทยเสมอ สั้น กระชับ ตรงประเด็น`

    const { text } = await generateText({
      model: genAI('gemini-2.5-flash'),
      prompt,
      maxTokens: 1024,
    })

    let advisorNote: any
    try {
      const match = text.match(/\{[\s\S]*\}/)
      advisorNote = match ? JSON.parse(match[0]) : { title: text, recommendations: [], outlook: '' }
    } catch {
      advisorNote = { title: text, recommendations: [], outlook: '' }
    }

    return NextResponse.json({ advisorNote, context })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

