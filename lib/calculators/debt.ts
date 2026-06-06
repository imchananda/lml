// Avalanche: sort by interestRate DESC — pay minimum all + extra to highest rate
export function avalancheOrder<T extends { interestRate: number }>(debts: T[]) {
  return [...debts].sort((a, b) => b.interestRate - a.interestRate)
}

// Snowball: sort by currentBalance ASC
export function snowballOrder<T extends { currentBalance: number }>(debts: T[]) {
  return [...debts].sort((a, b) => a.currentBalance - b.currentBalance)
}

// Calculate months to payoff
export function calcPayoffMonths(balance: number, apr: number, monthlyPayment: number): number {
  if (monthlyPayment <= 0 || balance <= 0) return 0
  const r = apr / 100 / 12
  if (r === 0) return Math.ceil(balance / monthlyPayment)
  const minInterest = balance * r
  if (monthlyPayment <= minInterest) return Infinity // Will never pay off
  return Math.ceil(-Math.log(1 - (balance * r) / monthlyPayment) / Math.log(1 + r))
}

// Total interest paid over loan lifetime
export function totalInterestPaid(balance: number, apr: number, months: number, payment: number): number {
  return Math.max(0, (payment * months) - balance)
}

// Estimate debt-free date
export function debtFreeDate(debts: { currentBalance: number; interestRate: number; minimumPayment: number }[], extraPayment = 0): Date {
  if (debts.length === 0) return new Date()
  const totalMinPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0) + extraPayment
  const totalBalance = debts.reduce((sum, d) => sum + d.currentBalance, 0)
  const avgRate = debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length
  const months = calcPayoffMonths(totalBalance, avgRate, totalMinPayment)
  const date = new Date()
  date.setMonth(date.getMonth() + (months === Infinity ? 999 : months))
  return date
}
