#!/usr/bin/env node

const { spawnSync } = require('child_process')

const fallbackDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/blog?schema=public'
const env = { ...process.env }
const rawDatabaseUrl = env.DATABASE_URL?.trim() || ''

// Prisma generate 只需要合法的数据源格式，不需要真实连上数据库。
if (!rawDatabaseUrl || rawDatabaseUrl.startsWith('file:')) {
  env.DATABASE_URL = fallbackDatabaseUrl
}

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(npxCommand, ['prisma', 'generate'], {
  stdio: 'inherit',
  env,
})

process.exit(result.status ?? 1)
