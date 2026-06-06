import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
  var keepAliveInterval: any
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'stdout', level: 'warn' }, { emit: 'stdout', level: 'error' }]
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

if (!global.keepAliveInterval) {
  const timer = setInterval(async () => {
    try {
      await prisma.$executeRawUnsafe('SELECT 1')
    } catch (err) {
      // Silent ignore to prevent cluttering logs
    }
  }, 4 * 60 * 1000) // 4 minutes

  if (timer && typeof timer.unref === 'function') {
    timer.unref()
  }
  global.keepAliveInterval = timer
}
