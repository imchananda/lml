export function calculateDaysUntil(targetDate: Date | string | null): number | null {
  if (!targetDate) return null
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffTime = target.getTime() - today.getTime()
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
}

export function calculateReadingProgress(books: { currentPage: number; totalPages: number }[]): number {
  if (books.length === 0) return 0
  const totalPages = books.reduce((sum, b) => sum + b.totalPages, 0)
  const readPages = books.reduce((sum, b) => sum + b.currentPage, 0)
  if (totalPages === 0) return 0
  return Math.round((readPages / totalPages) * 100)
}

export function calculateAverageScore(scores: { score: number; maxScore: number }[]): number {
  if (scores.length === 0) return 0
  const percentages = scores.map(s => (s.score / s.maxScore) * 100)
  const sum = percentages.reduce((acc, pct) => acc + pct, 0)
  return Math.round(sum / scores.length)
}

export function calculateStudyStreak(sessions: { date: Date | string }[]): number {
  if (sessions.length === 0) return 0

  // Extract unique dates in YYYY-MM-DD
  const dates = Array.from(
    new Set(
      sessions.map(s => {
        const d = new Date(s.date)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // sort descending (newest first)

  if (dates.length === 0) return 0

  const todayStr = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // If the newest session is not today or yesterday, streak is broken (0)
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
    return 0
  }

  let streak = 0
  let checkDate = new Date(dates[0])

  for (let i = 0; i < dates.length; i++) {
    const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
    if (dates.includes(checkStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1) // check previous day
    } else {
      break
    }
  }

  return streak
}
