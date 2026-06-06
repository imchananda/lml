import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth-helper"
import { calculateDaysUntil, calculateReadingProgress, calculateAverageScore, calculateStudyStreak } from "@/lib/calculators/study"

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const todayStart = new Date()
    todayStart.setHours(0,0,0,0)
    const todayEnd = new Date()
    todayEnd.setHours(23,59,59,999)

    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()) // Sunday
    startOfWeek.setHours(0,0,0,0)

    // 1. Fetch Active Exam info
    const activeExam = await prisma.studyExam.findFirst({
      where: { userId, isActive: true },
      include: { subjects: true }
    })

    const daysToExam = activeExam ? calculateDaysUntil(activeExam.examDate) : null

    // 2. Fetch all books for reading progress
    const books = await prisma.studyBook.findMany({
      where: { userId }
    })
    const readingProgressPct = calculateReadingProgress(books)
    const totalBooksCount = books.length
    const completedBooksCount = books.filter(b => b.status === "COMPLETED").length
    const readingBooksCount = books.filter(b => b.status === "READING").length

    // 3. Fetch study sessions for streak and total hours
    const sessions = await prisma.studySession.findMany({
      where: { userId },
      orderBy: { date: "desc" }
    })

    const streak = calculateStudyStreak(sessions)
    const totalStudyMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0)
    
    // Weekly study sessions
    const weeklySessions = sessions.filter(s => new Date(s.date) >= startOfWeek)
    const weeklyStudyMinutes = weeklySessions.reduce((acc, s) => acc + s.durationMinutes, 0)

    // 4. Fetch Scores for averages
    const scores = await prisma.studyScore.findMany({
      where: { userId }
    })
    const avgScorePct = calculateAverageScore(scores)

    // 5. Fetch subjects detailed info (for subject cards)
    // Map subjects with their books and scores
    let subjectsSummary: any[] = []
    if (activeExam) {
      subjectsSummary = await Promise.all(
        activeExam.subjects.map(async (subj) => {
          const subjBooks = books.filter(b => b.subjectId === subj.id)
          const subjScores = scores.filter(s => s.subjectId === subj.id)
          const subjSessions = sessions.filter(s => s.subjectId === subj.id)
          
          const bookProgress = calculateReadingProgress(subjBooks)
          const avgScore = calculateAverageScore(subjScores)
          const studyMinutes = subjSessions.reduce((acc, s) => acc + s.durationMinutes, 0)

          return {
            id: subj.id,
            name: subj.name,
            weight: subj.weight,
            targetScore: subj.targetScore,
            color: subj.color,
            booksCount: subjBooks.length,
            completedBooks: subjBooks.filter(b => b.status === "COMPLETED").length,
            bookProgress,
            avgScore,
            studyHours: Math.round((studyMinutes / 60) * 10) / 10
          }
        })
      )
    }

    // 6. Today's Schedules & Upcoming Events
    const schedules = await prisma.studySchedule.findMany({
      where: { userId },
      orderBy: [
        { dayOfWeek: "asc" },
        { date: "asc" },
        { startTime: "asc" }
      ]
    })

    // Filter today's schedules
    const todayDayOfWeek = new Date().getDay() // 0-6
    const todaySchedules = schedules.filter(s => {
      if (s.isRecurring) {
        return s.dayOfWeek === todayDayOfWeek
      } else if (s.date) {
        const sDate = new Date(s.date)
        return sDate.getFullYear() === todayStart.getFullYear() &&
               sDate.getMonth() === todayStart.getMonth() &&
               sDate.getDate() === todayStart.getDate()
      }
      return false
    })

    return NextResponse.json({
      exam: activeExam ? {
        id: activeExam.id,
        name: activeExam.name,
        examDate: activeExam.examDate,
        university: activeExam.university,
        program: activeExam.program,
        daysToExam
      } : null,
      reading: {
        progressPct: readingProgressPct,
        totalBooks: totalBooksCount,
        completedBooks: completedBooksCount,
        readingBooks: readingBooksCount
      },
      study: {
        streak,
        totalHours: Math.round((totalStudyMinutes / 60) * 10) / 10,
        weeklyHours: Math.round((weeklyStudyMinutes / 60) * 10) / 10,
        weeklyMinutes: weeklyStudyMinutes
      },
      scores: {
        averagePct: avgScorePct,
        count: scores.length
      },
      subjects: subjectsSummary,
      todaySchedules: todaySchedules.slice(0, 5)
    })
  } catch (error) {
    console.error("Study summary API error:", error)
    return NextResponse.json({ error: "Failed to load study summary" }, { status: 500 })
  }
}
