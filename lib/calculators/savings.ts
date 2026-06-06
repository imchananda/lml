// Compound interest for DCA
export function dcaFutureValue(monthlyAmount: number, annualReturn: number, years: number): number {
  const r = annualReturn / 100 / 12
  const n = years * 12
  if (r === 0) return monthlyAmount * n
  return monthlyAmount * ((Math.pow(1 + r, n) - 1) / r)
}

// Emergency fund target = avg monthly expense × months
export function emergencyFundTarget(avgMonthlyExpense: number, months = 6): number {
  return avgMonthlyExpense * months
}

// 50/30/20 rule breakdown
export function rule503020(monthlyIncome: number) {
  return {
    needs: monthlyIncome * 0.5,
    wants: monthlyIncome * 0.3,
    savings: monthlyIncome * 0.2,
  }
}

// Savings rate
export function savingsRate(income: number, expense: number): number {
  if (income <= 0) return 0
  return ((income - expense) / income) * 100
}
