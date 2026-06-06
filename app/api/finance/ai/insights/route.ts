// @ts-nocheck
import { getCurrentUserId } from '@/lib/auth-helper'
import { prisma } from '@/lib/prisma'
import { getUserFinancialContext } from '@/lib/ai-context'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

const CACHE_TTL_DAYS = 7

const SYSTEM_PROMPT = `คุณคือ "Advisor" ผู้ช่วยทางการเงินส่วนตัวสำหรับคนไทย ที่มีความเชี่ยวชาญด้านการวางแผนการเงินระดับมืออาชีพ (CFP)
กฎที่ต้องปฏิบัติตามเคร่งครัด:
- ตอบเป็นภาษาไทยเสมอ สั้น กระชับ ตรงประเด็น
- มีความเห็นอกเห็นใจ (Empathy) และสร้างกำลังใจ
- อ้างอิงตัวเลขจาก Financial Context ที่ให้มาเท่านั้น ห้ามแต่งตัวเลข
- ห้ามแนะนำหลักทรัพย์หรือกองทุนที่เจาะจง
- ตอบกลับเป็น JSON ตามโครงสร้างที่กำหนด`

function buildInsightPrompt(type: string, context: any): string {
  const ctxJson = JSON.stringify(context, null, 2)

  const prompts: Record<string, string> = {
    MONTHLY_CASHFLOW: `วิเคราะห์ Cashflow เดือน ${context.period.month}/${context.period.year} จาก Context นี้:
${ctxJson}

ตอบกลับเป็น JSON ดังนี้:
{
  "summary": "สรุป 1-2 ประโยค",
  "severity": "good" | "warning" | "critical",
  "items": [
    { "icon": "emoji", "text": "ข้อสังเกต/คำแนะนำ (1 ประโยค)" }
  ]
}
items ไม่เกิน 3 ข้อ เน้นสิ่งที่ต้องปรับปรุงที่สุด`,

    PORTFOLIO_HEALTH: `วิเคราะห์สุขภาพพอร์ตการลงทุนจาก Context นี้:
${ctxJson}

ตอบกลับเป็น JSON ดังนี้:
{
  "summary": "สรุป 1-2 ประโยค",
  "severity": "good" | "warning" | "critical",
  "items": [
    { "icon": "emoji", "text": "ข้อสังเกต/คำแนะนำ (1 ประโยค)" }
  ]
}
items ไม่เกิน 3 ข้อ`,

    TAX_ALERT: `วิเคราะห์สถานะภาษีจาก Context นี้:
${ctxJson}

ตอบกลับเป็น JSON ดังนี้:
{
  "summary": "สรุปสถานะภาษีปีนี้ 1-2 ประโยค",
  "severity": "good" | "warning" | "critical",
  "items": [
    { "icon": "emoji", "text": "คำแนะนำด้านภาษี (1 ประโยค)" }
  ]
}
items ไม่เกิน 3 ข้อ เน้นการประหยัดภาษี`,

    DEBT_ALERT: `วิเคราะห์สถานะหนี้สินจาก Context นี้:
${ctxJson}

ตอบกลับเป็น JSON ดังนี้:
{
  "summary": "สรุปสถานะหนี้ 1-2 ประโยค",
  "severity": "good" | "warning" | "critical",
  "items": [
    { "icon": "emoji", "text": "คำแนะนำด้านการจัดการหนี้ (1 ประโยค)" }
  ]
}
items ไม่เกิน 3 ข้อ`,
  }

  return prompts[type] ?? prompts['MONTHLY_CASHFLOW']
}

export async function GET(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type  = searchParams.get('type') ?? 'MONTHLY_CASHFLOW'
  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  try {
    // 1. ตรวจ Cache ก่อน (ถ้า model ยังไม่ regenerate ให้ข้ามไป)
    try {
      const cached = await (prisma.aiInsight as any).findUnique({
        where: { userId_type_month_year: { userId, type, month, year } },
      })
      if (cached && new Date(cached.expiresAt) > now) {
        return NextResponse.json({ ...JSON.parse(cached.content), cached: true })
      }
    } catch {
      // Prisma Client ยังไม่มี aiInsight model → ข้ามไปเรียก AI โดยตรง
    }

    // 2. ดึงข้อมูลสรุปแบบ Privacy-safe
    const context = await getUserFinancialContext(userId)

    // 3. เรียก Gemini AI
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const genAI = createGoogleGenerativeAI({ apiKey })

    let text = ''
    try {
      const result = await generateText({
        model: genAI('gemini-2.5-flash'),
        system: SYSTEM_PROMPT,
        prompt: buildInsightPrompt(type, context),
        maxTokens: 512,
      })
      text = result.text
    } catch (aiErr: any) {
      console.error('Gemini error:', aiErr?.message)
      // Fallback: return generic warning if model output is empty
      const fallback = { summary: 'ไม่สามารถวิเคราะห์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง', severity: 'warning', items: [] }
      return NextResponse.json({ ...fallback, cached: false })
    }

    // 4. Parse JSON จาก AI
    let parsed: any
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text, severity: 'warning', items: [] }
    } catch {
      parsed = { summary: text, severity: 'warning', items: [] }
    }

    // 5. บันทึก Cache (optional — ข้ามได้ถ้า model ยังไม่ regenerate)
    try {
      const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)
      await (prisma.aiInsight as any).upsert({
        where: { userId_type_month_year: { userId, type, month, year } },
        create: { userId, type, month, year, content: JSON.stringify(parsed), expiresAt },
        update: { content: JSON.stringify(parsed), expiresAt },
      })
    } catch {
      // Cache write failed (model not ready) — result still returned to client
    }

    return NextResponse.json({ ...parsed, cached: false })
  } catch (error: any) {
    console.error('AI Insight error:', error)
    return NextResponse.json({ error: error.message ?? 'AI error' }, { status: 500 })
  }
}

// Force-refresh cache
export async function DELETE(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type  = searchParams.get('type') ?? 'MONTHLY_CASHFLOW'
  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  await (prisma.aiInsight as any).deleteMany({
    where: { userId, type, month, year },
  })

  return NextResponse.json({ ok: true })
}
