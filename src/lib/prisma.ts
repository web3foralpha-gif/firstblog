import { PrismaClient } from '@prisma/client'
import { hasValidDatabaseUrl } from './database-url'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const hasDatabaseUrl = hasValidDatabaseUrl(process.env.DATABASE_URL)

  return new PrismaClient({
    log: !hasDatabaseUrl
      ? []
      : process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
