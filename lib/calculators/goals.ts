// Goal gap analysis
export function monthlyNeeded(targetAmount: number, savedAmount: number, deadline: Date | string): number {
  const now = new Date()
  const end = new Date(deadline)
  const monthsLeft = Math.max(1, (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()))
  return (targetAmount - savedAmount) / monthsLeft
}

// Gap = what you need − what you're saving
export function savingsGap(monthlyNeededAmt: number, currentMonthlySaving: number): number {
  return monthlyNeededAmt - currentMonthlySaving
}

// How many months to reach target at current rate
export function monthsToGoal(targetAmount: number, savedAmount: number, monthlySaving: number): number {
  if (monthlySaving <= 0) return Infinity
  return Math.ceil((targetAmount - savedAmount) / monthlySaving)
}
