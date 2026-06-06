// @ts-nocheck
import { getCurrentUserId } from '@/lib/auth-helper'
import { getUserLifeContext } from '@/lib/ai-context'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'

const SYSTEM_PROMPT = `คุณคือ "LiveMyLife Advisor" ผู้ช่วยส่วนตัวอัจฉริยะที่ดูแลการใช้ชีวิตแบบองค์รวมรอบด้าน ได้แก่ การเงิน, สุขภาพ, การเรียน และงานที่ต้องทำในแต่ละวัน

กฎที่ต้องปฏิบัติตามเสมอ:
- ตอบเป็นภาษาไทยเท่านั้น
- ตอบสั้น กระชับ ตรงประเด็น (ไม่เกิน 3-5 ประโยคต่อคำตอบ)
- มีความเห็นอกเห็นใจ ให้กำลังใจ และแนะนำแนวทางที่นำไปปฏิบัติได้จริง (actionable advices)
- อ้างอิงตัวเลขและข้อมูลจริงจาก Life Context ด้านล่างนี้เท่านั้น ห้ามแต่งตัวเลขหรือข้อมูลขึ้นมาเองเด็ดขาด
- สำหรับหัวข้อการเงิน: ห้ามแนะนำหลักทรัพย์หรือกองทุนที่เจาะจง ให้แนะนำเฉพาะสินทรัพย์ประเภทกว้างๆ (เช่น กองทุน SSF/RMF, หุ้นกู้, เงินฝากประจำ)
- ถ้าไม่มีข้อมูลเพียงพอใน Context ให้บอกตรงๆ ว่าไม่มีข้อมูลหรือแนะนำให้ผู้ใช้บันทึกข้อมูลส่วนนั้นเพิ่มเติม`

export async function POST(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  try {
    const { messages } = await req.json()
    const coreMessages = messages.map((msg: any) => {
      const textContent = msg.parts
        ? msg.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('')
        : (msg.content || '');
      return {
        role: msg.role,
        content: textContent,
      };
    })
    const context = await getUserLifeContext(userId)

    const contextBlock = `
=== ข้อมูลผู้ใช้ LiveMyLife (รอบปัจจุบัน) ===

💰 [1. ด้านการเงิน]
- รายรับเดือนนี้: ฿${context.financial.cashflow.monthlyIncome.toLocaleString()}
- รายจ่ายเดือนนี้: ฿${context.financial.cashflow.monthlyExpense.toLocaleString()}
- อัตราออม: ${context.financial.cashflow.savingsRate}%
- รายจ่ายเทียบกับเดือนก่อน: ${context.financial.cashflow.expenseChangeVsLastMonthPct > 0 ? '+' : ''}${context.financial.cashflow.expenseChangeVsLastMonthPct}%
- หมวดจ่ายสูงสุด: ${context.financial.cashflow.topExpenseCategories.map(c => `${c.name} (${c.pct}%)`).join(', ')}
- Net Worth รวม: ฿${context.financial.netWorth.toLocaleString()}
- พอร์ตลงทุน: ฿${context.financial.portfolio.totalValue.toLocaleString()} (P&L ${context.financial.portfolio.plPercent > 0 ? '+' : ''}${context.financial.portfolio.plPercent}%)
- หนี้สินรวม: ฿${context.financial.debt.total.toLocaleString()} (DSR ${context.financial.debt.dsr}%)
- เงินออมรวม: ฿${context.financial.savings.total.toLocaleString()}
${context.financial.tax ? `- ภาษีโดยประมาณปีนี้: ฿${context.financial.tax.estimatedTax.toLocaleString()} (Marginal Rate ${context.financial.tax.marginalRate}%)
- งบลดหย่อนที่ยังเหลือ: ฿${context.financial.tax.unusedRetirementBudget.toLocaleString()}` : ''}
- เป้าหมายการเงินวิกฤต: ${context.financial.goals.criticalGoals.map(g => `${g.name} (${g.pct}%)`).join(', ') || 'ไม่มี'}

💪 [2. ด้านสุขภาพ]
- น้ำหนักปัจจุบัน: ${context.health.weight.current ? `${context.health.weight.current} kg` : 'ยังไม่ได้บันทึก'}
- ค่า BMI: ${context.health.bmi ? `${context.health.bmi.score} (${context.health.bmi.category})` : 'ไม่มีข้อมูล'}
- ค่า TDEE (ความต้องการพลังงานต่อวัน): ${context.health.tdee ? `${context.health.tdee} kcal` : 'ไม่มีข้อมูล'}
- วันนี้: กินไปแล้ว ${context.health.calories.consumedToday} kcal, เผาผลาญจากการออกกำลังกาย ${context.health.calories.burnedToday} kcal (Net ${context.health.calories.netToday} kcal)
- สัดส่วนล่าสุด (เอว/สะโพก/อก): ${context.health.measurements ? `เอว ${context.health.measurements.waist || '-'} cm, สะโพก ${context.health.measurements.hip || '-'} cm, อก ${context.health.measurements.chest || '-'} cm` : 'ไม่มีข้อมูล'}
- เป้าหมายสุขภาพ: ${context.health.goal ? `${context.health.goal.type} (เป้าหมาย ${context.health.goal.target} kg, ปัจจุบัน ${context.health.goal.current} kg)` : 'ไม่มี'}
- การออกกำลังกายล่าสุด: ${context.health.recentWorkouts.map(w => `${w.name} (${w.type}, ${w.duration} นาที, เผาผลาญ ${w.burned} kcal)`).join(', ') || 'ไม่มีข้อมูล'}

📚 [3. ด้านการเรียน (เตรียมสอบเข้า ป.โท วิศวกรรมซอฟต์แวร์ จุฬาฯ)]
- เป้าหมายการสอบ: ${context.study.exam ? `${context.study.exam.name} ณ ${context.study.exam.university} (เหลือเวลาอีก ${context.study.exam.daysToExam} วัน)` : 'ไม่มีการบันทึกสอบ'}
- ความก้าวหน้าการอ่านหนังสือ: อ่านจบแล้ว ${context.study.reading.completedBooks}/${context.study.reading.totalBooks} เล่ม (${context.study.reading.progressPct}% ของหน้าทั้งหมด)
- หนังสือที่กำลังอ่าน: ${context.study.reading.currentlyReading.join(', ') || 'ไม่มี'}
- จำนวนชั่วโมงอ่านหนังสือสัปดาห์นี้: ${context.study.weeklyStudyHours} ชม. (อ่านสะสมต่อเนื่อง ${context.study.streak} วัน 🔥)
- คะแนนสอบจำลองเฉลี่ย: ${context.study.scores.averagePct}% (คะแนนล่าสุด: ${context.study.scores.recent.map(s => `${s.testName} ${s.percentage}%`).join(', ') || 'ไม่มี'})
- ตารางตารางเรียน/ทบทวนล่าสุด: ${context.study.upcomingSchedules.map(s => `${s.title} (${s.time})`).join(', ') || 'ไม่มีข้อมูล'}

✅ [4. ด้านงานที่ต้องทำ (Todo)]
- สถานะงานวันนี้: เสร็จสิ้น ${context.todo.today.completed}/${context.todo.today.total} งาน (${context.todo.today.completionPct}% เสร็จสมบูรณ์)
- งานด่วน (High Priority) ค้างอยู่: ${context.todo.pendingHighPriority.map(t => `${t.title} (${t.dueTime || 'ไม่ระบุเวลา'}, หมวด ${t.category})`).join(', ') || 'ไม่มี'}
- งานค้างชำระ/เกินกำหนด (Overdue): ${context.todo.overdue.map(t => `${t.title} (กำหนด ${new Date(t.date).toLocaleDateString('th-TH')}, หมวด ${t.category})`).join(', ') || 'ไม่มี'}

=== จบข้อมูล ===`

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 503 })

    const genAI = createGoogleGenerativeAI({ apiKey })

    const result = streamText({
      model: genAI('gemini-2.5-flash'),
      system: SYSTEM_PROMPT + '\n\n' + contextBlock,
      messages: coreMessages,
      maxTokens: 512,
    })

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error('AI Chat error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

