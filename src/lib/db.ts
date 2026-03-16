import 'server-only'

import { prisma } from './prisma'
import { hasValidDatabaseUrl } from './database-url'

const warnedContexts = new Set<string>()
const databaseConfigured = hasValidDatabaseUrl(process.env.DATABASE_URL)

function warnOnce(context: string, message: string) {
  if (warnedContexts.has(context)) return
  warnedContexts.add(context)
  console.warn(message)
}

export function isDatabaseConfigured() {
  return databaseConfigured
}

export async function runWithDatabase<T>(
  operation: (client: typeof prisma) => Promise<T>,
  fallback: T,
  context = 'query',
): Promise<T> {
  if (!databaseConfigured) {
    warnOnce('database-missing', '[db] DATABASE_URL is missing or invalid, using fallback data.')
    return fallback
  }

  try {
    return await operation(prisma)
  } catch {
    warnOnce(context, `[db] ${context} failed, using fallback data.`)
    return fallback
  }
}

export { prisma }
