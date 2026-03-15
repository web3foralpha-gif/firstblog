const fs = require('fs')
const path = require('path')

const databaseUrl = process.env.DATABASE_URL || ''

if (!databaseUrl.startsWith('file:')) {
  process.exit(0)
}

const rawPath = databaseUrl.slice('file:'.length).split('?')[0].trim()

if (!rawPath || rawPath === ':memory:') {
  process.exit(0)
}

const resolvedPath = path.isAbsolute(rawPath)
  ? rawPath
  : path.resolve(process.cwd(), 'prisma', rawPath)

fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })

if (!fs.existsSync(resolvedPath)) {
  fs.writeFileSync(resolvedPath, '')
}
