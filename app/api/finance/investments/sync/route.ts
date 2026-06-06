import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'
import yahooFinance from 'yahoo-finance2'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // ดึงเฉพาะรายการลงทุนที่มี Ticker ระบุไว้
    const investments = await prisma.investment.findMany({
      where: { 
        userId,
        ticker: { not: null, notIn: [''] }
      }
    })

    if (investments.length === 0) {
      return NextResponse.json({ message: 'No investments with tickers found', updated: 0 })
    }

    let updatedCount = 0

    // อัปเดตราคาทีละตัว (ใช้ Promise.all ได้ถ้ามีเยอะ แต่เพื่อป้องกัน Rate Limit ให้ทยอยดึง)
    for (const inv of investments) {
      try {
        if (!inv.ticker) continue
        
        // ดึงราคาจาก Yahoo Finance
        const quote = await yahooFinance.quote(inv.ticker) as any
        const currentPrice = quote.regularMarketPrice

        if (currentPrice && currentPrice > 0) {
          // อัปเดตราคาล่าสุดลงฐานข้อมูล
          await prisma.investment.update({
            where: { id: inv.id },
            data: { currentPrice }
          })
          updatedCount++
        }
      } catch (err: any) {
        console.warn(`Failed to fetch quote for ${inv.ticker}: ${err.message}`)
        // ข้ามตัวที่ error (เช่น Ticker ผิด) ไปทำตัวต่อไป
      }
    }

    return NextResponse.json({ success: true, updated: updatedCount })
  } catch (error: any) {
    console.error('Market sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
