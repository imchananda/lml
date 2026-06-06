import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Dev mode cache — avoid querying DB on every single API request
let _cachedDevUserId: string | null = null

/**
 * Get current user ID with dev fallback.
 * In development, auto-creates a dev user if none exists.
 * Uses module-level cache in dev to avoid repeated findFirst() queries.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  let userId = session?.user?.id ?? null

  if (!userId && process.env.NODE_ENV === 'development') {
    // Return cached dev user ID if available
    if (_cachedDevUserId) return _cachedDevUserId

    const defaultUser = await prisma.user.findFirst()
    if (defaultUser) {
      _cachedDevUserId = defaultUser.id
      userId = defaultUser.id
    } else {
      const newUser = await prisma.user.create({
        data: { email: 'dev@test.com', name: 'Dev User', monthlyIncome: 55000 },
      })
      _cachedDevUserId = newUser.id
      userId = newUser.id
    }
  }

  return userId
}
