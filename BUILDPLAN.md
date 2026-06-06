# Finance App — Build Plan & Handoff

> ระบบบริหารการเงินส่วนตัวแบบครบวงจร สร้างด้วย Next.js 15, Prisma, PostgreSQL (Neon)  
> ใช้งานคนเดียว · Deploy บน Vercel · MVP ภายใน 3 สัปดาห์

---

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Neon (free tier) |
| ORM | Prisma 5 |
| Auth | NextAuth v5 (Credentials) |
| Charts | Recharts |
| Validation | Zod |
| Deploy | Vercel |

---

## Environment Variables

สร้างไฟล์ `.env.local` ที่ root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/finance_db?sslmode=require"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Project Structure

```
finance-app/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx          ← หน้า login
│   ├── dashboard/page.tsx          ← หน้าแรก: net worth, cashflow, goals
│   ├── transactions/page.tsx       ← รายรับรายจ่าย
│   ├── budget/page.tsx             ← budget envelope + category limits
│   ├── debt/page.tsx               ← debt manager + payoff calculator
│   ├── savings/page.tsx            ← saving pots
│   ├── investments/page.tsx        ← portfolio tracker
│   ├── goals/page.tsx              ← financial goals
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── transactions/route.ts
│   │   ├── budget/route.ts
│   │   ├── debt/route.ts
│   │   ├── savings/route.ts
│   │   ├── investments/route.ts
│   │   ├── goals/route.ts
│   │   └── summary/route.ts        ← dashboard aggregates
│   ├── layout.tsx                  ← root layout + sidebar nav
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── ui/                         ← shadcn components (button, input, dialog…)
│   ├── charts/
│   │   ├── CashflowChart.tsx       ← monthly bar chart
│   │   ├── CategoryPieChart.tsx
│   │   └── NetWorthChart.tsx
│   └── forms/
│       ├── TransactionForm.tsx
│       ├── DebtForm.tsx
│       └── GoalForm.tsx
├── lib/
│   ├── prisma.ts                   ← singleton prisma client
│   ├── auth.ts                     ← NextAuth helpers
│   ├── utils.ts                    ← cn(), formatCurrency(), formatDate()
│   └── calculators/
│       ├── debt.ts                 ← avalanche + snowball algorithms
│       ├── savings.ts              ← compound interest, emergency fund
│       └── goals.ts                ← gap analysis, deadline calc
├── types/
│   └── index.ts                    ← shared TypeScript interfaces
├── prisma/
│   ├── schema.prisma               ← ✅ DONE (see below)
│   └── seed.ts                     ← ✅ DONE (default Thai categories)
├── auth.ts                         ← ✅ DONE (NextAuth config)
├── package.json                    ← ✅ DONE
└── middleware.ts                   ← protect all routes except /login
```

---

## Prisma Schema (สร้างแล้ว)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String?
  currency      String    @default("THB")
  monthlyIncome Float     @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  transactions   Transaction[]
  budgets        Budget[]
  debts          Debt[]
  savingPots     SavingPot[]
  investments    Investment[]
  goals          Goal[]
  recurringItems RecurringItem[]

  @@map("users")
}

model Category {
  id    String          @id @default(cuid())
  name  String
  icon  String?
  color String          @default("#6366f1")
  type  TransactionType @default(EXPENSE)

  transactions Transaction[]
  budgets      Budget[]

  @@map("categories")
}

model Transaction {
  id          String          @id @default(cuid())
  amount      Float
  type        TransactionType
  description String?
  note        String?
  date        DateTime        @default(now())
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  recurringId String?
  recurring   RecurringItem? @relation(fields: [recurringId], references: [id])

  @@index([userId, date])
  @@index([userId, type])
  @@map("transactions")
}

model RecurringItem {
  id         String          @id @default(cuid())
  name       String
  amount     Float
  type       TransactionType
  frequency  Frequency
  nextDate   DateTime
  dayOfMonth Int?
  isActive   Boolean         @default(true)
  createdAt  DateTime        @default(now())

  userId     String
  user       User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId String?
  transactions Transaction[]

  @@map("recurring_items")
}

model Budget {
  id         String   @id @default(cuid())
  amount     Float
  month      Int
  year       Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])

  @@unique([userId, categoryId, month, year])
  @@map("budgets")
}

model Debt {
  id             String    @id @default(cuid())
  name           String
  type           DebtType
  totalAmount    Float
  currentBalance Float
  interestRate   Float     // APR %
  minimumPayment Float
  dueDate        Int?      // day of month
  isActive       Boolean   @default(true)
  notes          String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  userId   String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments DebtPayment[]

  @@map("debts")
}

model DebtPayment {
  id     String   @id @default(cuid())
  amount Float
  date   DateTime @default(now())
  note   String?

  debtId String
  debt   Debt   @relation(fields: [debtId], references: [id], onDelete: Cascade)

  @@map("debt_payments")
}

model SavingPot {
  id             String     @id @default(cuid())
  name           String
  targetAmount   Float
  savedAmount    Float      @default(0)
  term           SavingTerm
  targetDate     DateTime?
  icon           String?
  color          String     @default("#10b981")
  isActive       Boolean    @default(true)
  autoSaveAmount Float?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  userId       String
  user         User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions SavingTransaction[]

  @@map("saving_pots")
}

model SavingTransaction {
  id     String   @id @default(cuid())
  amount Float
  type   String   // DEPOSIT | WITHDRAW
  date   DateTime @default(now())
  note   String?

  potId String
  pot   SavingPot @relation(fields: [potId], references: [id], onDelete: Cascade)

  @@map("saving_transactions")
}

model Investment {
  id           String    @id @default(cuid())
  name         String
  ticker       String?
  assetType    AssetType
  quantity     Float
  costBasis    Float
  currentPrice Float?
  currency     String    @default("THB")
  notes        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  userId       String
  user         User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions InvestmentTransaction[]

  @@map("investments")
}

model InvestmentTransaction {
  id       String   @id @default(cuid())
  type     String   // BUY | SELL
  quantity Float
  price    Float
  fee      Float    @default(0)
  date     DateTime @default(now())
  note     String?

  investmentId String
  investment   Investment @relation(fields: [investmentId], references: [id], onDelete: Cascade)

  @@map("investment_transactions")
}

model Goal {
  id           String     @id @default(cuid())
  name         String
  description  String?
  targetAmount Float
  savedAmount  Float      @default(0)
  deadline     DateTime?
  priority     Priority   @default(MEDIUM)
  status       GoalStatus @default(IN_PROGRESS)
  icon         String?
  color        String     @default("#6366f1")
  linkedPotId  String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  userId     String
  user       User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  milestones GoalMilestone[]

  @@map("goals")
}

model GoalMilestone {
  id           String    @id @default(cuid())
  title        String
  targetAmount Float
  reachedAt    DateTime?
  createdAt    DateTime  @default(now())

  goalId String
  goal   Goal   @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@map("goal_milestones")
}

// Enums
enum TransactionType { INCOME  EXPENSE }
enum Frequency       { DAILY  WEEKLY  BIWEEKLY  MONTHLY  QUARTERLY  YEARLY }
enum DebtType        { CREDIT_CARD  PERSONAL_LOAN  MORTGAGE  CAR_LOAN  STUDENT_LOAN  OTHER }
enum SavingTerm      { SHORT  MEDIUM  LONG }
enum AssetType       { STOCK  ETF  MUTUAL_FUND  GOLD  CRYPTO  BOND  REAL_ESTATE  OTHER }
enum Priority        { LOW  MEDIUM  HIGH }
enum GoalStatus      { IN_PROGRESS  COMPLETED  PAUSED  CANCELLED }
```

---

## Files ที่สร้างแล้ว ✅

| File | Status |
|---|---|
| `package.json` | ✅ dependencies ครบ |
| `prisma/schema.prisma` | ✅ ทุก model พร้อม relations |
| `prisma/seed.ts` | ✅ categories ภาษาไทย default |
| `auth.ts` | ✅ NextAuth v5 + Credentials |

---

## Files ที่ต้องสร้างต่อ

### Priority 1 — ให้ระบบ run ได้ก่อน

**`lib/prisma.ts`** — Prisma singleton
```ts
import { PrismaClient } from '@prisma/client'
declare global { var prisma: PrismaClient | undefined }
export const prisma = global.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma
```

**`lib/utils.ts`** — helper functions
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'THB') {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency, minimumFractionDigits: 0
  }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(date))
}
```

**`middleware.ts`** — route protection
```ts
export { auth as middleware } from '@/auth'
export const config = {
  matcher: ['/((?!api/auth|login|_next|favicon).*)'],
}
```

**`app/api/auth/[...nextauth]/route.ts`**
```ts
export { GET, POST } from '@/auth'
// ใน auth.ts เพิ่ม: export const { handlers: { GET, POST }, ... }
```

---

### Priority 2 — Week 1 (Transaction + Dashboard)

**`app/api/transactions/route.ts`**
- `GET` — list by userId, filter by month/year/type/category
- `POST` — create transaction + validate with Zod

**`app/api/summary/route.ts`**
- `GET` — return: totalIncome, totalExpense, netCashflow, byCategory[], recentTransactions[]

**`app/transactions/page.tsx`**
- ตาราง transaction + filter bar (month, type, category)
- ปุ่ม Add → Dialog form (TransactionForm)
- แสดง income เป็นสีเขียว, expense สีแดง

**`app/dashboard/page.tsx`**
- Card: Net Worth (assets - debts)
- Card: รายรับเดือนนี้ / รายจ่ายเดือนนี้ / คงเหลือ
- CashflowChart (Recharts BarChart) — 6 เดือนย้อนหลัง
- CategoryPieChart — top 5 หมวดจ่าย
- รายการล่าสุด 5 รายการ
- Goal progress cards

---

### Priority 3 — Week 2 (Debt + Savings)

**`lib/calculators/debt.ts`**

```ts
// Avalanche: sort by interestRate DESC, pay minimum all + extra to highest rate
export function avalancheOrder(debts: Debt[]) {
  return [...debts].sort((a, b) => b.interestRate - a.interestRate)
}

// Snowball: sort by currentBalance ASC
export function snowballOrder(debts: Debt[]) {
  return [...debts].sort((a, b) => a.currentBalance - b.currentBalance)
}

// คำนวณ payoff timeline
export function calcPayoffMonths(balance: number, apr: number, monthlyPayment: number) {
  const r = apr / 100 / 12
  if (r === 0) return Math.ceil(balance / monthlyPayment)
  return Math.ceil(-Math.log(1 - (balance * r) / monthlyPayment) / Math.log(1 + r))
}

// คำนวณดอกเบี้ยรวมที่จะจ่าย
export function totalInterestPaid(balance: number, apr: number, months: number, payment: number) {
  return (payment * months) - balance
}
```

**`app/debt/page.tsx`**
- รายการหนี้ทั้งหมด + progress bar (paid %)
- เลือก strategy: Avalanche หรือ Snowball
- Payoff timeline chart (Recharts LineChart)
- What-if slider: "ถ้าจ่ายเพิ่ม X บาท/เดือน"

**`app/savings/page.tsx`**
- Saving pots grid (card แต่ละ pot + progress bar)
- Emergency fund tracker (เป้า = monthlyExpense × 6)
- 50/30/20 calculator จาก monthlyIncome

---

### Priority 4 — Week 3 (Investment + Goals + Deploy)

**`app/investments/page.tsx`**
- Portfolio summary: total value, total cost, P&L, P&L%
- Asset allocation pie chart
- รายการ investment แต่ละตัว (ราคาปัจจุบัน manual input ก่อน)
- DCA planner: ถ้าลงทุน X บาท/เดือน จะได้เท่าไรใน N ปี (compound)

**`app/goals/page.tsx`**
- Goal cards + progress (%)
- Milestone checklist
- Gap analysis: "ต้องออมเพิ่ม X บาท/เดือน ถึงจะถึงเป้าภายใน deadline"

**`app/dashboard/page.tsx` (v2)**
- เพิ่ม Net Worth breakdown (savings + investments - debts)
- Goal progress section
- Monthly savings rate (%)

---

## Business Logic สำคัญ

### Debt Calculator
```
Avalanche = จ่ายขั้นต่ำทุกใบ + โปะเงินเหลือที่ APR สูงที่สุด → ประหยัดดอกเบี้ยสูงสุด
Snowball  = จ่ายขั้นต่ำทุกใบ + โปะที่ยอดน้อยที่สุด → หมดหนี้เร็ว ได้แรงจูงใจ

payoff months = -log(1 - balance×r/payment) / log(1+r)   [r = APR/12/100]
```

### Savings Rate (50/30/20)
```
needs   = monthlyIncome × 0.50   ← ค่าใช้จ่ายจำเป็น
wants   = monthlyIncome × 0.30   ← อยากได้
savings = monthlyIncome × 0.20   ← ออม + ลงทุน
```

### Emergency Fund Target
```
target = avgMonthlyExpense (last 3 months) × 6
```

### Goal Gap Analysis
```
monthsLeft     = deadline - today (in months)
monthlyNeeded  = (targetAmount - savedAmount) / monthsLeft
gap            = monthlyNeeded - currentMonthlySaving
```

### DCA Compound Interest
```
FV = PMT × ((1 + r)^n - 1) / r
PMT = monthly invest amount
r   = monthly return rate (e.g. 0.07/12 for 7% annual)
n   = months
```

---

## API Route Pattern (ใช้แบบนี้ทุก route)

```ts
// app/api/transactions/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1
  const year  = Number(searchParams.get('year'))  || new Date().getFullYear()

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: {
        gte: new Date(year, month - 1, 1),
        lt:  new Date(year, month, 1),
      },
    },
    include: { category: true },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(transactions)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // validate with Zod here...

  const transaction = await prisma.transaction.create({
    data: { ...body, userId: session.user.id },
  })

  return NextResponse.json(transaction, { status: 201 })
}
```

---

## Setup Commands (รันตามลำดับ)

```bash
# 1. install dependencies
npm install

# 2. สร้าง DB บน Neon แล้วใส่ DATABASE_URL ใน .env.local

# 3. push schema ไป DB
npx prisma db push

# 4. generate prisma client
npx prisma generate

# 5. seed default categories
npx prisma db seed

# 6. run dev
npm run dev

# (optional) ดู DB ผ่าน GUI
npx prisma studio
```

---

## Deploy Vercel

```bash
# 1. push โค้ดขึ้น GitHub

# 2. ไป vercel.com → Import project

# 3. เพิ่ม Environment Variables:
#    DATABASE_URL  = (จาก Neon)
#    NEXTAUTH_SECRET = (จาก openssl rand -base64 32)
#    NEXTAUTH_URL  = https://your-app.vercel.app

# 4. Deploy
```

---

## Milestones

| วัน | เป้าหมาย |
|---|---|
| Day 3 | Login ได้ · DB เชื่อมได้ · navigate ทุก page shell |
| Day 10 | บันทึก tx ได้ · ดู chart ได้ · dashboard พื้นฐาน |
| Day 17 | debt payoff calc · saving pots · 50/30/20 |
| Day 21 | portfolio · goals · dashboard เต็ม · deploy Vercel |

---

## Design Notes

- สีหลัก: income = `emerald-500` (#10b981), expense = `red-500` (#ef4444)
- Font: ใช้ system font Thai-friendly หรือ `Sarabun` จาก Google Fonts
- Dark mode: ใช้ Tailwind `dark:` class ผ่าน `next-themes`
- Sidebar nav: Dashboard / Transactions / Budget / Debt / Savings / Investments / Goals / Settings
- Mobile: sidebar collapse → bottom nav bar

---

*Generated by Claude · Finance App Build Plan v1.0*


---

## Phase 2: AboutMyWealth V2.0 (Smart Personal Wealth Advisor)

**วิสัยทัศน์:** ยกระดับจากแอปบันทึกข้อมูลการเงิน สู่การเป็นผู้ช่วยส่วนตัวทางการเงินอัจฉริยะที่ใช้ข้อมูลและการแสดงผลระดับมืออาชีพ

### 1. แกนหลักในการพัฒนา (Core Development Tracks)

**Track 1: Advanced Data Visualization (แสดงผลข้อมูลขั้นสูง)**
- **Cashflow Sankey Diagram:** กราฟกระแสน้ำแสดงการไหลของรายรับไปสู่รายจ่าย (เจาะดูรอยรั่วทางการเงิน)
- **Portfolio Treemap:** กราฟบล็อกสี่เหลี่ยมแสดงสัดส่วนการกระจายความเสี่ยง (Asset Allocation)
- **Net Worth Stacked Area:** กราฟภูเขาสะสมความมั่งคั่ง แสดงการเติบโตของสินทรัพย์เทียบกับการหดตัวของหนี้สิน
- **Target vs. Actual Trajectory:** กราฟเส้นพยากรณ์เป้าหมายทางการเงินและเปรียบเทียบว่ากำลัง On-track หรือไม่

**Track 2: Intelligence & Smart Features (ระบบอัจฉริยะและคำแนะนำ)**
- **Smart Tax Planner:** โมดูลจำลองและวางแผนลดหย่อนภาษี (SSF, RMF, ประกันชีวิต) ค้นหาจุดคุ้มทุน
- **AI Financial Insights:** ใช้ AI อ่านพฤติกรรมการใช้จ่ายเพื่อแจ้งเตือนและให้คำแนะนำแบบ Personalized
- **Passive Income Crossover:** ระบบตรวจจับ "อิสรภาพทางการเงิน" (เมื่อรายได้ Passive แซงรายจ่าย)

**Track 3: Usability & Export (การนำไปใช้งานจริง)**
- **Data Export & Reporting:** ออกรายงานการเงินประจำปีเป็นไฟล์ PDF/Excel สไตล์มืออาชีพ
- **Personalized UI/UX:** รองรับ Dark Mode เต็มรูปแบบ, ตั้งค่าสกุลเงิน, และจัดเรียงหน้า Dashboard เองได้

### 2. แผนการพัฒนาแบบเป็นระยะ (Phased Rollout Strategy)
- **Phase 2.1 - The Visual Upgrade:** ติดตั้งชุดกราฟระดับโปร (Sankey & Treemap) บน Dashboard และพอร์ตการลงทุน
- **Phase 2.2 - The Tax & Goals Engine:** สร้างโมดูลคำนวณภาษีและไทม์ไลน์เป้าหมายชีวิต
- **Phase 2.3 - The Advisor & Export:** เชื่อมต่อระบบ AI ให้คำปรึกษาและปล่อยฟีเจอร์ดาวน์โหลดรายงาน

---

### Phase 2.3: The Advisor & Export (ระบบ AI ให้คำปรึกษา และ Export PDF)

**เป้าหมาย:** นำข้อมูลพฤติกรรมการเงินและการลงทุนทั้งหมดมาประมวลผล เพื่อให้คำแนะนำเฉพาะบุคคล (Personalized Financial Advice) ที่สามารถนำไปปฏิบัติได้จริง และสร้างระบบออกรายงานทางการเงินระดับมืออาชีพ (Executive Wealth Report)

#### 1. ระบบ AI ให้คำปรึกษา (Smart Financial Advisor)
เปลี่ยนจาก Dashboard ธรรมดาเป็น "ผู้ช่วยส่วนตัว" ที่คอยให้ Insights ด้านการเงิน

**Tech Stack:**
- Vercel AI SDK (สำหรับการทำ Streaming Response)
- LLM Provider (OpenAI, Anthropic, หรือ Google Gemini API)

**ฟีเจอร์หลัก:**
- **Monthly Cashflow Insights:** วิเคราะห์รายรับ-รายจ่ายของเดือนที่ผ่านมา แจ้งเตือนความผิดปกติ (เช่น "เดือนนี้คุณใช้จ่ายหมวดช้อปปิ้งสูงกว่าค่าเฉลี่ย 30%") และแนะนำแนวทางประหยัด
- **Portfolio Health Check:** วิเคราะห์การกระจายตัวของสินทรัพย์ (Asset Allocation) จาก Treemap และให้คำแนะนำเบื้องต้น เช่น สัดส่วนเงินสดมากเกินไปในช่วงเงินเฟ้อ หรือสัดส่วนสินทรัพย์เสี่ยงสูงเกินไปเมื่อเทียบกับอายุ
- **Smart Alerts:** แจ้งเตือนเมื่อสถานะหนี้อยู่ในจุดวิกฤต (เช่น DSR สูงเกิน 40%) หรือแจ้งเตือนใกล้สิ้นปีให้ซื้อกองทุนลดหย่อนภาษี
- **Goal Readiness & What-if Analysis:** ถามตอบเรื่องเป้าหมายการเงิน เช่น "ถ้าต้องการเกษียณเร็วขึ้น 5 ปี ต้องทำอย่างไร?"

**แนวทางการพัฒนา (Data Privacy & Prompting):**
- **Data Minimization:** ดึงข้อมูลจาก Database เป็นก้อนสรุป (Summary Aggregates) เช่น สัดส่วน % หนี้, รายจ่ายรวมแต่ละหมวดหมู่ ส่งไปให้ LLM เท่านั้น **ห้ามส่งข้อมูล PII หรือรายการย่อยที่ระบุตัวตนได้**
- **System Prompt Design:** สวมบทบาท (Persona) ให้ AI เป็น "ผู้เชี่ยวชาญการเงินส่วนบุคคลชาวไทย (CFP) ตอบสั้น กระชับ มี Empathy และอ้างอิงหลักการเงินสากล"

#### 2. ระบบ Export PDF (Professional Wealth Report)
สร้างรายงานสุขภาพทางการเงินประจำปีหรือรายไตรมาสแบบอัตโนมัติ เพื่อให้ผู้ใช้นำไปวิเคราะห์ต่อ ปรึกษาผู้เชี่ยวชาญจริง หรือใช้ประกอบการขอสินเชื่อ

**Tech Stack:**
- `@react-pdf/renderer` สำหรับสร้างเอกสาร PDF ผ่าน React Components (ได้ไฟล์คมชัดระดับ Vector และจัดการ Layout ได้ง่ายกว่า)
- `html2canvas` สำหรับการ Capture กราฟ Recharts/Sankey ออกมาเป็นรูปภาพก่อนนำไปแปะใน PDF
- ฟอนต์ภาษาไทย (เช่น Sarabun หรือ Noto Sans Thai) แบบฝัง (Embedded) เพื่อป้องกันปัญหาภาษาไทยเพี้ยน

**โครงสร้างเนื้อหาในรายงาน (Report Components):**
1. **Executive Summary:** สรุปความมั่งคั่งสุทธิ (Net Worth) ของปัจจุบันเทียบกับปีที่ผ่านมา (Growth %)
2. **Cashflow & Budgeting:** ภาพรวมการไหลของเงิน (ใช้ภาพจาก Sankey Diagram) และวินัยการใช้จ่ายตามสัดส่วน 50/30/20
3. **Asset & Investment Overview:** สัดส่วนพอร์ตการลงทุน (Asset Allocation) ผลตอบแทนโดยประมาณ (Estimated Yield/P&L)
4. **Debt & Credit Health:** สรุปสถานะหนี้สิน, อัตราส่วนหนี้สินต่อรายได้ (DSR), และคะแนนเครดิตจำลอง (Credit Score Estimate)
5. **Tax Summary:** สรุปยอดภาษีที่ประมาณการว่าจะต้องจ่าย และลิสต์รายการลดหย่อนที่ใช้ไปแล้ว/ยังขาดได้อีก
6. **AI Advisor's Note:** หน้าสุดท้ายเป็นข้อเสนอแนะเชิงกลยุทธ์ (Strategic Recommendations) ที่ Generate จาก AI

**ลำดับการพัฒนา (Implementation Steps):**
1. ออกแบบ Template PDF ด้วย `@react-pdf/renderer` และลงทะเบียนฟอนต์ภาษาไทย
2. พัฒนากลไกแปลงกราฟ (Charts) บนหน้าเว็บให้เป็น Data URL (Base64 Image) ซ่อนใน Background เพื่อส่งเข้า PDF
3. สร้าง AI Endpoint ที่รับข้อมูลสถิติของ User ไป Generate คำแนะนำสำหรับใส่ในหน้า `AI Advisor's Note`
4. ทำปุ่ม **"Download Wealth Report"** ในหน้า Dashboard พร้อม Loading State ระหว่าง Generate ไฟล์

#### 3. System Architecture & Technical Limitations (ข้อควรระวังและสถาปัตยกรรมเชิงเทคนิค)
เพื่อให้ระบบทำงานได้จริงบน Production อย่างมีเสถียรภาพและควบคุมค่าใช้จ่ายได้ จำเป็นต้องมีกลไกเพิ่มเติมดังนี้:

**1. AI Cost Control & Rate Limiting (การควบคุมต้นทุน LLM):**
- **Caching Insights:** ผลลัพธ์จากการวิเคราะห์รายเดือน (Monthly Insights) หรือพอร์ตโฟลิโอ ควรถูก Generate เพียง 1 ครั้งต่อช่วงเวลา แล้ว Cache เก็บไว้ใน Database (เช่น ตาราง `AI_Insights`) แทนที่จะยิง API ทุกครั้งที่ผู้ใช้เปิดหน้า Dashboard
- **Rate Limit for Chat:** หากมีฟีเจอร์ Chatbot สำหรับถาม-ตอบ ต้องติดตั้ง Rate Limit (เช่น ใช้ Upstash Redis) จำกัดโควต้าคำถามต่อวัน (เช่น 5-10 คำถาม/วัน) เพื่อป้องกันการโดน Spam 

**2. UI/UX Separation (การแยกประเภทของการแสดงผล AI):**
- **Static Widgets:** คำแนะนำรายเดือน/รายวัน ให้แสดงผลเป็นการ์ดข้อความ (Widgets) บนหน้า Dashboard (ไม่ต้องพิมพ์ตอบแบบเรียลไทม์)
- **Interactive Chat:** แยกส่วนถาม-ตอบเฉพาะบุคคล ไปไว้ใน Sidebar หรือ Modal ต่างหาก โดยใช้ Vercel AI SDK เพื่อทำ Streaming UI ให้ดูเหมือนกำลังแชทกับคนจริง

**3. Context Management (การจัดการบริบทไม่ให้ AI หลอน):**
- ห้ามส่งข้อมูลดิบ (Raw Data) เด็ดขาด ต้องมี Service Layer เช่น `getUserFinancialContext(userId)` ทำหน้าที่รวบรวมข้อมูลสรุป (เช่น `{ totalDebt: 500000, debtToIncomeRatio: 0.45 }`) เพื่อส่งเป็น System Prompt
- บังคับให้ AI ตอบกลับมาเป็น **Structured Data (JSON)** ในบางฟีเจอร์ เพื่อให้นำค่าที่ได้มา Render เป็น UI Component (เช่น `<Alert severity="warning">...</Alert>`) แทนที่จะแสดงแค่ก้อน Text

**4. PDF Export Performance (ประสิทธิภาพการแคปเจอร์หน้าจอ):**
- **Print-Friendly Theme:** บังคับเปลี่ยน Theme เป็นแบบ Light Mode หรือตัดพื้นหลังสีเข้มออกเฉพาะส่วนที่จะ Capture (`html2canvas`) เพื่อให้ประหยัดหมึกพิมพ์และลดภาระการ Render
- **Background Processing / Loading State:** การแปลง HTML เป็นรูปภาพและจัดหน้า PDF บนเบราว์เซอร์กิน RAM สูง ต้องมี UI/UX เป็น Full-screen Loading Spinner (เช่น "กำลังรวบรวมข้อมูล...", "กำลังสร้างกราฟ...") เพื่อไม่ให้ผู้ใช้ตกใจหากหน้าเว็บกระตุกช่วง 3-5 วินาทีที่บราวเซอร์ทำงานหนัก
