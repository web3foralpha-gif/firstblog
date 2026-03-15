#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { PrismaClient } = require('@prisma/client')

const sourceArg = process.argv[2]
const sourcePath = path.resolve(process.cwd(), sourceArg || process.env.SQLITE_SOURCE_PATH || 'prisma/dev.db')
const databaseUrl = process.env.DATABASE_URL?.trim() || ''

if (!databaseUrl) {
  console.error('❌ 缺少 DATABASE_URL，请先把它设置为 PostgreSQL 连接字符串。')
  process.exit(1)
}

if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
  console.error('❌ 当前 DATABASE_URL 不是 PostgreSQL 连接字符串。')
  process.exit(1)
}

if (!fs.existsSync(sourcePath)) {
  console.error(`❌ 找不到 SQLite 源文件：${sourcePath}`)
  process.exit(1)
}

function querySqlite(tableName) {
  const output = execFileSync('sqlite3', ['-json', sourcePath, `SELECT * FROM "${tableName}";`], {
    encoding: 'utf8',
  }).trim()

  return output ? JSON.parse(output) : []
}

function toBool(value) {
  return value === true || value === 1 || value === '1'
}

function toDate(value) {
  return value ? new Date(value) : null
}

async function main() {
  const prisma = new PrismaClient()

  const source = {
    articles: querySqlite('Article'),
    media: querySqlite('Media'),
    comments: querySqlite('Comment'),
    payments: querySqlite('Payment'),
    siteSettings: querySqlite('SiteSetting'),
    guestbook: querySqlite('Guestbook'),
    pageViews: querySqlite('PageView'),
    sunflowerState: querySqlite('SunflowerState'),
    sunflowerInteractions: querySqlite('SunflowerInteraction'),
    settings: querySqlite('Setting'),
  }

  const targetCounts = await Promise.all([
    prisma.article.count(),
    prisma.comment.count(),
    prisma.guestbook.count(),
    prisma.payment.count(),
    prisma.pageView.count(),
  ])

  if (targetCounts.some(count => count > 0) && !process.argv.includes('--force')) {
    console.error('❌ 目标 PostgreSQL 数据库里已经有数据。')
    console.error('   如果你确认要覆盖导入，请重新运行：')
    console.error('   npm run db:import:sqlite -- --force')
    await prisma.$disconnect()
    process.exit(1)
  }

  console.log(`📦 从 ${sourcePath} 读取 SQLite 数据...`)

  await prisma.$transaction([
    prisma.comment.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.guestbook.deleteMany(),
    prisma.media.deleteMany(),
    prisma.pageView.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.siteSetting.deleteMany(),
    prisma.sunflowerInteraction.deleteMany(),
    prisma.sunflowerState.deleteMany(),
    prisma.article.deleteMany(),
  ])

  if (source.articles.length) {
    await prisma.article.createMany({
      data: source.articles.map(item => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        content: item.content,
        excerpt: item.excerpt ?? null,
        mood: item.mood ?? '',
        coverImage: item.coverImage ?? null,
        accessType: item.accessType ?? 'PUBLIC',
        pinned: toBool(item.pinned),
        pinnedAt: toDate(item.pinnedAt),
        passwordHash: item.passwordHash ?? null,
        passwordHint: item.passwordHint ?? null,
        price: item.price == null ? null : Number(item.price),
        published: toBool(item.published),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      })),
    })
  }

  if (source.media.length) {
    await prisma.media.createMany({
      data: source.media.map(item => ({
        id: item.id,
        filename: item.filename,
        originalName: item.originalName,
        url: item.url,
        key: item.key,
        size: Number(item.size),
        mimeType: item.mimeType,
        type: item.type ?? 'IMAGE',
        createdAt: toDate(item.createdAt),
      })),
    })
  }

  if (source.siteSettings.length) {
    await prisma.siteSetting.createMany({
      data: source.siteSettings.map(item => ({
        id: item.id,
        key: item.key,
        value: item.value,
        updatedAt: toDate(item.updatedAt),
      })),
    })
  }

  if (source.settings.length) {
    await prisma.setting.createMany({
      data: source.settings.map(item => ({
        key: item.key,
        value: item.value,
        type: item.type ?? 'string',
        updatedAt: toDate(item.updatedAt),
      })),
    })
  }

  if (source.guestbook.length) {
    await prisma.guestbook.createMany({
      data: source.guestbook.map(item => ({
        id: item.id,
        nickname: item.nickname,
        avatar: item.avatar,
        email: item.email ?? null,
        emailPublic: toBool(item.emailPublic),
        emailVisible: toBool(item.emailVisible),
        content: item.content,
        emoji: item.emoji ?? null,
        pinned: toBool(item.pinned),
        pinnedAt: toDate(item.pinnedAt),
        ipAddress: item.ipAddress ?? null,
        ipCountry: item.ipCountry ?? null,
        ipRegion: item.ipRegion ?? null,
        ipCity: item.ipCity ?? null,
        ipIsp: item.ipIsp ?? null,
        status: item.status ?? 'PENDING',
        createdAt: toDate(item.createdAt),
      })),
    })
  }

  if (source.pageViews.length) {
    await prisma.pageView.createMany({
      data: source.pageViews.map(item => ({
        id: item.id,
        sessionId: item.sessionId,
        ipAddress: item.ipAddress ?? null,
        ipRegion: item.ipRegion ?? null,
        ipCity: item.ipCity ?? null,
        path: item.path,
        enteredAt: toDate(item.enteredAt),
        duration: item.duration == null ? null : Number(item.duration),
        userAgent: item.userAgent ?? null,
      })),
    })
  }

  if (source.sunflowerState.length) {
    await prisma.sunflowerState.createMany({
      data: source.sunflowerState.map(item => ({
        id: item.id,
        totalCount: Number(item.totalCount ?? 0),
        updatedAt: toDate(item.updatedAt),
      })),
    })
  }

  if (source.sunflowerInteractions.length) {
    await prisma.sunflowerInteraction.createMany({
      data: source.sunflowerInteractions.map(item => ({
        ipHash: item.ipHash,
        action: item.action,
        createdAt: toDate(item.createdAt),
      })),
    })
  }

  if (source.comments.length) {
    await prisma.comment.createMany({
      data: source.comments.map(item => ({
        id: item.id,
        articleId: item.articleId,
        nickname: item.nickname,
        email: item.email ?? null,
        content: item.content,
        status: item.status ?? 'PENDING',
        createdAt: toDate(item.createdAt),
      })),
    })
  }

  if (source.payments.length) {
    await prisma.payment.createMany({
      data: source.payments.map(item => ({
        id: item.id,
        articleId: item.articleId,
        email: item.email,
        amount: Number(item.amount),
        currency: item.currency ?? 'cny',
        stripeSessionId: item.stripeSessionId ?? null,
        status: item.status ?? 'PENDING',
        accessToken: item.accessToken ?? null,
        tokenExpiresAt: toDate(item.tokenExpiresAt),
        createdAt: toDate(item.createdAt),
      })),
    })
  }

  await prisma.$disconnect()

  console.log('✅ SQLite 数据已导入 PostgreSQL。')
  console.log(`   文章: ${source.articles.length}`)
  console.log(`   评论: ${source.comments.length}`)
  console.log(`   留言: ${source.guestbook.length}`)
  console.log(`   页面访问: ${source.pageViews.length}`)
}

main().catch(async (error) => {
  console.error('❌ 导入失败：', error)
  process.exit(1)
})
