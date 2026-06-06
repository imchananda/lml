import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year')) || new Date().getFullYear()

  // ดึงข้อมูล TaxProfile ของปีที่ระบุ ถ้าไม่มีให้สร้างใหม่ (upsert ไม่ได้เพราะยังไม่มี)
  let profile = await prisma.taxProfile.findUnique({
    where: {
      userId_year: {
        userId: session.user.id,
        year: year
      }
    }
  })

  // ถ้ายังไม่เคยมี ให้คืนค่าเริ่มต้น (หรือจะ create เลยก็ได้)
  if (!profile) {
    // ประมาณการรายได้จาก Transaction ที่เป็น INCOME ในปีนั้น (เป็นตัวอย่างเบื้องต้น)
    const incomeTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: 'INCOME',
        date: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      }
    })
    
    const estimatedIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0) || (session.user as any).monthlyIncome * 12 || 0;

    profile = await prisma.taxProfile.create({
      data: {
        userId: session.user.id,
        year: year,
        estimatedIncome: estimatedIncome,
        bonus: 0,
        socialSecurity: Math.min(estimatedIncome * 0.05, 9000), // เดาจากฐานรายได้
      }
    })
  }

  // ดึงข้อมูลการลงทุนจริงๆ ในปีนั้นมาแสดงเป็น Actual
  const investmentTxs = await prisma.investmentTransaction.findMany({
    where: {
      type: 'BUY',
      date: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      },
      investment: {
        userId: session.user.id
      }
    },
    include: {
      investment: true
    }
  })

  let actualSsf = 0;
  let actualRmf = 0;
  let actualThaiEsg = 0;

  investmentTxs.forEach(tx => {
    const val = tx.quantity * tx.price;
    const name = tx.investment.name.toUpperCase();
    const note = (tx.investment.notes || '').toUpperCase();
    
    if (name.includes('SSF') || note.includes('SSF')) actualSsf += val;
    else if (name.includes('RMF') || note.includes('RMF')) actualRmf += val;
    else if (name.includes('ESG') || note.includes('ESG') || name.includes('TESG')) actualThaiEsg += val;
  })

  return NextResponse.json({
    profile,
    actualInvestments: {
      ssf: actualSsf,
      rmf: actualRmf,
      thaiEsg: actualThaiEsg
    }
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { year, ...data } = body

  if (!year) {
    return NextResponse.json({ error: 'Year is required' }, { status: 400 })
  }

  // อัปเดตหรือสร้าง TaxProfile
  const profile = await prisma.taxProfile.upsert({
    where: {
      userId_year: {
        userId: session.user.id,
        year: year
      }
    },
    update: {
      ...data
    },
    create: {
      userId: session.user.id,
      year: year,
      ...data
    }
  })

  return NextResponse.json(profile)
}
