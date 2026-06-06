import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth-helper'

export async function GET(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: 'desc' },
    })

    // CSV Header with BOM for Excel UTF-8 support
    let csv = '\uFEFF'
    csv += 'Date,Type,Category,Description,Note,Amount\n'

    // CSV Rows
    transactions.forEach(tx => {
      const date = tx.date.toISOString().split('T')[0]
      const type = tx.type
      const category = tx.category?.name || ''
      
      // Escape quotes and wrap strings in quotes to handle commas inside text
      const desc = `"${(tx.description || '').replace(/"/g, '""')}"`
      const note = `"${(tx.note || '').replace(/"/g, '""')}"`
      const amount = tx.amount

      csv += `${date},${type},"${category}",${desc},${note},${amount}\n`
    })

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="transactions_export.csv"',
      },
    })
  } catch (error) {
    console.error('Export CSV error:', error)
    return new Response('Failed to export transactions', { status: 500 })
  }
}
