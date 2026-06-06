"use client"

import {
  Document, Page, Text, View, StyleSheet, Font, Svg, Path, Rect, G,
} from "@react-pdf/renderer"

// Register Noto Sans Thai (loaded from Google Fonts CDN)
Font.register({
  family: "NotoSansThai",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/notosansthai/v25/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofCTcdgSMRzQMkFJ3aU.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/notosansthai/v25/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofCTcdgSMRzQMkF83aU.woff2",
      fontWeight: 700,
    },
  ],
})

const S = StyleSheet.create({
  page: {
    fontFamily: "NotoSansThai",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#0f1117",
    color: "#e2e8f0",
  },
  pageLight: {
    fontFamily: "NotoSansThai",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
    color: "#1e293b",
  },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  logo: { fontSize: 18, fontWeight: 700, color: "#10b981" },
  logoSub: { fontSize: 9, color: "#64748b", marginTop: 2 },
  headerRight: { textAlign: "right" },
  pageTitle: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  pageTitleAccent: { color: "#10b981" },
  dateText: { fontSize: 9, color: "#64748b" },
  divider: { height: 1, backgroundColor: "#1e293b", marginBottom: 20 },

  // Cards
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  cardLight: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    border: "1 solid #e2e8f0",
  },
  cardTitle: { fontSize: 11, fontWeight: 700, marginBottom: 8, color: "#94a3b8" },
  cardTitleDark: { fontSize: 11, fontWeight: 700, marginBottom: 8, color: "#64748b" },
  bigNum: { fontSize: 22, fontWeight: 700, color: "#10b981" },
  bigNumBlue: { fontSize: 22, fontWeight: 700, color: "#3b82f6" },
  bigNumAmber: { fontSize: 22, fontWeight: 700, color: "#f59e0b" },
  bigNumRose: { fontSize: 22, fontWeight: 700, color: "#f43f5e" },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  label: { fontSize: 9, color: "#64748b", marginBottom: 2 },
  value: { fontSize: 12, fontWeight: 700, color: "#e2e8f0" },
  valueDark: { fontSize: 12, fontWeight: 700, color: "#1e293b" },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#e2e8f0" },
  sectionTitleDark: { fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#1e293b" },

  // Progress bar
  progressBg: { height: 6, backgroundColor: "#334155", borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },

  // Table
  tableRow: { flexDirection: "row", paddingVertical: 6, borderBottom: "1 solid #1e293b" },
  tableHeader: { flexDirection: "row", paddingVertical: 6, borderBottom: "1 solid #334155" },
  tableCell: { flex: 1, fontSize: 9 },
  tableCellRight: { flex: 1, fontSize: 9, textAlign: "right" },
  tableHeaderText: { fontSize: 9, fontWeight: 700, color: "#64748b" },

  // AI section
  aiCard: {
    backgroundColor: "#1e1430",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    border: "1 solid #6d28d9",
  },
  aiTitle: { fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 8 },
  aiText: { fontSize: 10, color: "#c4b5fd", lineHeight: 1.5 },
  recRow: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "flex-start" },
  badge: {
    fontSize: 8, fontWeight: 700, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    color: "#fff",
  },
  recText: { flex: 1, fontSize: 9.5, color: "#e2e8f0", lineHeight: 1.5 },

  // Footer
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#334155" },
})

const priorityColor: Record<string, string> = {
  high: "#f43f5e", medium: "#f59e0b", low: "#10b981",
}
const scoreColor: Record<string, string> = {
  A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#f43f5e",
}

function Header({ dark = true }: { dark?: boolean }) {
  const now = new Date()
  return (
    <View style={S.header}>
      <View>
        <Text style={[S.logo, { color: "#8b5cf6" }]}>LiveMyLife</Text>
        <Text style={S.logoSub}>Personal Life Report</Text>
      </View>
      <View style={S.headerRight}>
        <Text style={S.dateText}>สร้างเมื่อ {now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
      </View>
    </View>
  )
}

function PageFooter({ pageNum, total }: { pageNum: number; total: number }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>LiveMyLife — ข้อมูลส่วนบุคคล ห้ามเผยแพร่</Text>
      <Text style={S.footerText}>หน้า {pageNum} / {total}</Text>
    </View>
  )
}

// ─── Main Document ─────────────────────────────────────────────
interface WealthReportProps {
  context: any
  advisorNote: any
}

export function WealthReportPDF({ context, advisorNote }: WealthReportProps) {
  const { financial, health, study, todo } = context
  const { cashflow, portfolio, debt, savings, tax, goals, netWorth } = financial
  const now = new Date()
  const year = now.getFullYear()
  const totalPages = 5

  return (
    <Document title={`LiveMyLife Report ${year}`} author="LiveMyLife">

      {/* Page 1: Executive Summary */}
      <Page size="A4" style={S.page}>
        <Header />
        <View style={S.divider} />

        <Text style={S.pageTitle}>สรุปภาพรวมแผนชีวิตและการเงิน{" "}
          <Text style={[S.pageTitleAccent, { color: "#8b5cf6" }]}>{year}</Text>
        </Text>

        {/* Net Worth Hero */}
        <View style={S.card}>
          <Text style={S.cardTitle}>NET WORTH รวม (การเงิน)</Text>
          <Text style={[S.bigNum, { fontSize: 28, color: "#10b981" }]}>
            ฿{Number(netWorth).toLocaleString()}
          </Text>
          <Text style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>
            เงินออม ฿{Number(savings.total).toLocaleString()} + พอร์ตลงทุน ฿{Number(portfolio.totalValue).toLocaleString()} − หนี้ ฿{Number(debt.total).toLocaleString()}
          </Text>
        </View>

        {/* 4 KPI Cards */}
        <View style={S.row}>
          <View style={[S.card, S.col]}>
            <Text style={S.cardTitle}>รายรับเดือนนี้</Text>
            <Text style={[S.bigNum, { color: "#10b981" }]}>฿{Number(cashflow.monthlyIncome).toLocaleString()}</Text>
          </View>
          <View style={[S.card, S.col]}>
            <Text style={S.cardTitle}>น้ำหนักตัวปัจจุบัน</Text>
            <Text style={[S.bigNum, { color: "#f59e0b" }]}>
              {health.weight.current ? `${health.weight.current} kg` : 'N/A'}
            </Text>
          </View>
        </View>
        <View style={S.row}>
          <View style={[S.card, S.col]}>
            <Text style={S.cardTitle}>ความก้าวหน้าการเรียน</Text>
            <Text style={[S.bigNum, { color: "#0ea5e9" }]}>
              {study.reading.progressPct}%
            </Text>
          </View>
          <View style={[S.card, S.col]}>
            <Text style={S.cardTitle}>ภารกิจเสร็จสิ้นวันนี้</Text>
            <Text style={[S.bigNum, { color: "#8b5cf6" }]}>
              {todo.today.completed}/{todo.today.total}
            </Text>
          </View>
        </View>

        {/* Goals Progress */}
        {goals.total > 0 && (
          <View style={S.card}>
            <Text style={S.cardTitle}>เป้าหมายทางการเงินที่กำลังดำเนินการ</Text>
            <Text style={{ color: "#10b981", fontSize: 10 }}>
              {goals.onTrackCount} / {goals.total} เป้าหมายดำเนินงานได้ตามเกณฑ์
            </Text>
          </View>
        )}

        <PageFooter pageNum={1} total={totalPages} />
      </Page>

      {/* Page 2: Investment & Cashflow */}
      <Page size="A4" style={S.page}>
        <Header />
        <View style={S.divider} />

        <Text style={[S.sectionTitle, { marginBottom: 16 }]}>พอร์ตการลงทุนและกระแสเงินสด</Text>

        <View style={S.row}>
          <View style={[S.card, S.col]}>
            <Text style={S.cardTitle}>มูลค่าตลาด</Text>
            <Text style={S.bigNumBlue}>฿{Number(portfolio.totalValue).toLocaleString()}</Text>
          </View>
          <View style={[S.card, S.col]}>
            <Text style={S.cardTitle}>ต้นทุนรวม</Text>
            <Text style={S.value}>฿{Number(portfolio.totalCost).toLocaleString()}</Text>
          </View>
        </View>

        {/* Asset Allocation */}
        <View style={S.card}>
          <Text style={S.cardTitle}>การกระจายสินทรัพย์ (Asset Allocation)</Text>
          {Object.entries(portfolio.allocationByType || {}).map(([type, pct]: any) => (
            <View key={type} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 9, color: "#94a3b8" }}>{type}</Text>
                <Text style={{ fontSize: 9, fontWeight: 700 }}>{pct}%</Text>
              </View>
              <View style={S.progressBg}>
                <View style={[S.progressFill, { width: `${pct}%`, backgroundColor: "#3b82f6" }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Cashflow */}
        <Text style={[S.sectionTitle, { marginTop: 8 }]}>Cashflow เดือนนี้</Text>
        <View style={S.row}>
          <View style={[S.card, S.col]}>
            <Text style={S.cardTitle}>รายรับ</Text>
            <Text style={[S.bigNum, { color: "#10b981" }]}>฿{Number(cashflow.monthlyIncome).toLocaleString()}</Text>
          </View>
          <View style={[S.card, S.col]}>
            <Text style={S.cardTitle}>รายจ่าย</Text>
            <Text style={S.bigNumRose}>฿{Number(cashflow.monthlyExpense).toLocaleString()}</Text>
          </View>
        </View>

        {/* Top Categories */}
        <View style={S.card}>
          <Text style={S.cardTitle}>หมวดรายจ่ายสูงสุด</Text>
          {cashflow.topExpenseCategories?.map((cat: any, i: number) => (
            <View key={i} style={S.tableRow}>
              <Text style={[S.tableCell, { color: "#e2e8f0" }]}>{cat.name}</Text>
              <Text style={[S.tableCellRight, { color: "#f43f5e", fontWeight: 700 }]}>{cat.pct}%</Text>
            </View>
          ))}
        </View>

        <PageFooter pageNum={2} total={totalPages} />
      </Page>

      {/* Page 3: Debt & Tax */}
      <Page size="A4" style={S.page}>
        <Header />
        <View style={S.divider} />

        <Text style={[S.sectionTitle]}>หนี้สินและภาษี</Text>

        {/* Debt */}
        <View style={S.card}>
          <Text style={S.cardTitle}>สรุปหนี้สิน</Text>
          <View style={S.row}>
            <View style={S.col}>
              <Text style={S.label}>หนี้สินรวม</Text>
              <Text style={S.bigNumRose}>฿{Number(debt.total).toLocaleString()}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.label}>DSR (หนี้ต่อรายได้)</Text>
              <Text style={[S.bigNum, { color: debt.dsr <= 35 ? "#10b981" : "#f43f5e" }]}>{debt.dsr}%</Text>
              <Text style={{ fontSize: 8, color: "#64748b" }}>เกณฑ์ดี ≤ 35%</Text>
            </View>
            <View style={S.col}>
              <Text style={S.label}>ดอกเบี้ยสูงสุด</Text>
              <Text style={S.bigNumAmber}>{debt.highestApr}%</Text>
            </View>
          </View>
        </View>

        {/* Tax */}
        {tax && (
          <View style={[S.card, { marginTop: 8 }]}>
            <Text style={S.cardTitle}>สรุปภาษีเงินได้ปีนี้</Text>
            <View style={S.row}>
              <View style={S.col}>
                <Text style={S.label}>รายได้ประเมิน</Text>
                <Text style={S.value}>฿{Number(tax.estimatedIncome).toLocaleString()}</Text>
              </View>
              <View style={S.col}>
                <Text style={S.label}>ภาษีโดยประมาณ</Text>
                <Text style={[S.bigNumAmber, { fontSize: 16 }]}>฿{Number(tax.estimatedTax).toLocaleString()}</Text>
              </View>
              <View style={S.col}>
                <Text style={S.label}>อัตรา Marginal</Text>
                <Text style={S.value}>{tax.marginalRate}%</Text>
              </View>
            </View>
            {tax.unusedRetirementBudget > 0 && (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: "#064e3b", borderRadius: 6 }}>
                <Text style={{ color: "#6ee7b7", fontSize: 9.5 }}>
                  💡 ยังสามารถซื้อกองทุนลดหย่อนภาษีได้อีก ฿{Number(tax.unusedRetirementBudget).toLocaleString()} (SSF/RMF) — เหลือ {tax.monthsLeft} เดือนในปีนี้
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Critical Goals */}
        {goals.criticalGoals?.length > 0 && (
          <View style={[S.card, { marginTop: 8 }]}>
            <Text style={S.cardTitle}>เป้าหมายการเงินที่ต้องเร่งดำเนินการ</Text>
            {goals.criticalGoals.map((g: any, i: number) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ fontSize: 9, color: "#e2e8f0" }}>{g.name}</Text>
                  <Text style={{ fontSize: 9, fontWeight: 700, color: "#f43f5e" }}>{g.pct}%</Text>
                </View>
                <View style={S.progressBg}>
                  <View style={[S.progressFill, { width: `${g.pct}%`, backgroundColor: "#f43f5e" }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        <PageFooter pageNum={3} total={totalPages} />
      </Page>

      {/* Page 4: Health & Study & Todo */}
      <Page size="A4" style={S.page}>
        <Header />
        <View style={S.divider} />

        <Text style={S.sectionTitle}>สุขภาพ การเรียน และภารกิจประจำวัน</Text>

        {/* Health Section */}
        <View style={S.card}>
          <Text style={[S.cardTitle, { color: "#f59e0b" }]}>💪 ด้านสุขภาพและการเผาผลาญ</Text>
          <View style={S.row}>
            <View style={S.col}>
              <Text style={S.label}>น้ำหนักตัว</Text>
              <Text style={S.value}>{health.weight.current ? `${health.weight.current} kg` : 'N/A'}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.label}>ค่า BMI / เกณฑ์</Text>
              <Text style={S.value}>{health.bmi ? `${health.bmi.score} (${health.bmi.category})` : 'N/A'}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.label}>พลังงานที่กินวันนี้</Text>
              <Text style={S.value}>{health.calories.consumedToday} kcal</Text>
            </View>
            <View style={S.col}>
              <Text style={S.label}>พลังงานเป้าหมาย (TDEE)</Text>
              <Text style={S.value}>{health.tdee ? `${health.tdee} kcal` : 'N/A'}</Text>
            </View>
          </View>
          {health.goal && (
            <View style={{ marginTop: 8, padding: 6, backgroundColor: "#1c1917", borderRadius: 4 }}>
              <Text style={{ fontSize: 8.5, color: "#f59e0b" }}>
                {`🎯 เป้าหมาย: ${health.goal.type} (เริ่มต้น ${health.goal.start} kg → เป้าหมาย ${health.goal.target} kg, ล่าสุด ${health.goal.current} kg)`}
              </Text>
            </View>
          )}
        </View>

        {/* Study Section */}
        <View style={S.card}>
          <Text style={[S.cardTitle, { color: "#0ea5e9" }]}>📚 ด้านการเรียนและวางแผนสอบ ป.โท จุฬาฯ</Text>
          <View style={S.row}>
            <View style={S.col}>
              <Text style={S.label}>สอบที่ตั้งเป้าหมาย</Text>
              <Text style={S.value}>{study.exam ? `${study.exam.program} (${study.exam.university})` : 'N/A'}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.label}>วันสอบถอยหลัง</Text>
              <Text style={[S.value, { color: "#ef4444" }]}>{study.exam?.daysToExam !== null ? `${study.exam.daysToExam} วัน` : 'N/A'}</Text>
            </View>
            <View style={S.col}>
              <Text style={S.label}>อ่านหนังสือสัปดาห์นี้</Text>
              <Text style={S.value}>{study.weeklyStudyHours} ชม. (สะสม {study.streak} วัน 🔥)</Text>
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ fontSize: 9, color: "#94a3b8" }}>ความก้าวหน้าการอ่าน ({study.reading.completedBooks}/{study.reading.totalBooks} เล่ม)</Text>
              <Text style={{ fontSize: 9, fontWeight: 700, color: "#0ea5e9" }}>{study.reading.progressPct}%</Text>
            </View>
            <View style={S.progressBg}>
              <View style={[S.progressFill, { width: `${study.reading.progressPct}%`, backgroundColor: "#0ea5e9" }]} />
            </View>
          </View>
        </View>

        {/* Todo Section */}
        <View style={S.card}>
          <Text style={[S.cardTitle, { color: "#8b5cf6" }]}>✅ ด้านภารกิจและ Todo List วันนี้</Text>
          <View style={S.row}>
            <View style={S.col}>
              <Text style={S.label}>ภารกิจเสร็จสิ้นวันนี้</Text>
              <Text style={S.value}>{todo.today.completed} / {todo.today.total} งาน ({todo.today.completionPct}%)</Text>
            </View>
            <View style={S.col}>
              <Text style={S.label}>งานคงค้าง (Pending)</Text>
              <Text style={S.value}>{todo.today.pending} งาน</Text>
            </View>
          </View>
          {todo.pendingHighPriority.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 8.5, color: "#a78bfa", marginBottom: 2 }}>⚡ งานสำคัญด่วนที่ยังค้างอยู่:</Text>
              {todo.pendingHighPriority.slice(0, 2).map((t: any, idx: number) => (
                <Text key={idx} style={{ fontSize: 8, color: "#e2e8f0" }}>• [{t.category}] {t.title} {t.dueTime ? `(${t.dueTime})` : ''}</Text>
              ))}
            </View>
          )}
        </View>

        <PageFooter pageNum={4} total={totalPages} />
      </Page>

      {/* Page 5: AI Advisor Note */}
      <Page size="A4" style={S.page}>
        <Header />
        <View style={S.divider} />

        <Text style={S.sectionTitle}>บทวิเคราะห์และคำแนะนำแบบองค์รวมโดย AI Advisor</Text>
        <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 16 }}>
          วิเคราะห์โดย Gemini AI ประมวลผลจากข้อมูลการใช้ชีวิตและการเงินของคุณ
        </Text>

        {advisorNote ? (
          <>
            {/* Overall Score */}
            <View style={S.aiCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 10,
                  backgroundColor: scoreColor[advisorNote.overallScore] || "#64748b",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>
                    {advisorNote.overallScore || "B"}
                  </Text>
                </View>
                <Text style={[S.aiText, { flex: 1, fontWeight: 700, fontSize: 11 }]}>
                  {advisorNote.title}
                </Text>
              </View>

              {/* Recommendations */}
              {advisorNote.recommendations?.map((rec: any, i: number) => (
                <View key={i} style={S.recRow}>
                  <Text style={[S.badge, { backgroundColor: priorityColor[rec.priority] || "#64748b" }]}>
                    {rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'} {rec.area}
                  </Text>
                  <Text style={S.recText}>{rec.action}</Text>
                </View>
              ))}
            </View>

            {/* Outlook */}
            {advisorNote.outlook && (
              <View style={[S.aiCard, { borderColor: "#1d4ed8" }]}>
                <Text style={[S.aiTitle, { color: "#93c5fd" }]}>📈 มุมมองภาพรวมชีวิต 6-12 เดือนข้างหน้า</Text>
                <Text style={S.aiText}>{advisorNote.outlook}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={S.aiCard}>
            <Text style={S.aiText}>ไม่สามารถสร้างคำแนะนำ AI ได้ในขณะนี้</Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={{ marginTop: 20, padding: 12, backgroundColor: "#1e293b", borderRadius: 8 }}>
          <Text style={{ fontSize: 8, color: "#475569", lineHeight: 1.5 }}>
            รายงานฉบับนี้จัดทำขึ้นโดยอัตโนมัติจากข้อมูลที่คุณบันทึกในระบบ LiveMyLife เพื่อประกอบการวางแผนการดำเนินชีวิตและเป้าหมายส่วนบุคคลเท่านั้น ไม่ใช่คำแนะนำที่เป็นทางการจากแพทย์ ผู้ชำนาญการทางการเงิน หรือที่ปรึกษาทางวิชาการโดยตรง
          </Text>
        </View>

        <PageFooter pageNum={5} total={totalPages} />
      </Page>

    </Document>
  )
}



