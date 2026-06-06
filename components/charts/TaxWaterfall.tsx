import { formatCurrency } from "@/lib/utils"

interface TaxWaterfallProps {
  totalIncome: number
  totalDeductions: number
  netIncome: number
  taxAmount: number
}

export function TaxWaterfall({ totalIncome, totalDeductions, netIncome, taxAmount }: TaxWaterfallProps) {
  if (totalIncome === 0) return null

  // Calculate percentages relative to totalIncome
  const deductionPct = (totalDeductions / totalIncome) * 100
  const netIncomePct = (netIncome / totalIncome) * 100
  const taxPct = (taxAmount / totalIncome) * 100

  return (
    <div className="space-y-3 font-sans w-full bg-secondary/10 p-4 rounded-xl border border-secondary/20">
      <h4 className="text-sm font-semibold text-muted-foreground mb-4">เส้นทางภาษีของคุณ (Tax Journey)</h4>
      
      {/* Total Income */}
      <div className="relative pt-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium">เงินได้ทั้งหมด</span>
          <span className="font-bold text-foreground">฿{formatCurrency(totalIncome)}</span>
        </div>
        <div className="flex h-3 w-full rounded-full bg-secondary overflow-hidden">
          <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }} />
        </div>
      </div>

      {/* Deductions (Negative) */}
      <div className="relative pt-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">หักค่าลดหย่อน</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">-฿{formatCurrency(totalDeductions)}</span>
        </div>
        <div className="flex h-3 w-full rounded-full bg-secondary overflow-hidden justify-end" style={{ paddingRight: `${netIncomePct}%` }}>
          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${deductionPct}%` }} />
        </div>
      </div>

      {/* Net Income */}
      <div className="relative pt-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium text-amber-600 dark:text-amber-500">เงินได้สุทธิ (คิดภาษี)</span>
          <span className="font-bold text-amber-600 dark:text-amber-500">฿{formatCurrency(netIncome)}</span>
        </div>
        <div className="flex h-3 w-full rounded-full bg-secondary overflow-hidden">
          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${netIncomePct}%` }} />
        </div>
      </div>

      {/* Tax */}
      <div className="relative pt-2 mt-2 border-t border-border/50">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-bold text-red-600 dark:text-red-400">ภาษีที่ต้องจ่ายจริง</span>
          <span className="font-black text-red-600 dark:text-red-400">฿{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex h-4 w-full rounded-full bg-secondary overflow-hidden">
          <div className="bg-red-500 h-full rounded-full" style={{ width: `${taxPct}%` }} />
        </div>
      </div>
    </div>
  )
}
