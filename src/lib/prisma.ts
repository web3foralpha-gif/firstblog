import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim())

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
