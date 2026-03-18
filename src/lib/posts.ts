import 'server-only'

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

import { isDatabaseConfigured, runWithDatabase, prisma } from './db'

export const BLOG_REVALIDATE_SECONDS = 3600

const POSTS_DIRECTORY = path.join(process.cwd(), 'content', 'posts')

type PostFrontmatter = {
  title?: string
  excerpt?: string
  description?: string
  publishedAt?: string | Date
  date?: string | Date
  updatedAt?: string | Date
  coverImage?: string
  tags?: string[] | string
  mood?: string
  draft?: boolean
}

export type BlogPostSummary = {
  slug: string
  title: string
  excerpt: string
  description: string
  publishedAt: string
  updatedAt?: string
  coverImage?: string
  tags: string[]
  mood: string
  readingTimeMinutes: number
  href?: string
  pinned?: boolean
  accessType?: string
  price?: number
}

export type BlogPost = BlogPostSummary & {
  content: string
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeTags(tags: PostFrontmatter['tags']) {
  if (Array.isArray(tags)) {
    return tags.map(tag => normalizeText(tag)).filter(Boolean)
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeDate(value: string | Date | undefined, fallback: Date) {
  if (!value) return fallback.toISOString()

  const date = value instanceof Date ? value : new Date(value.trim())
  if (Number.isNaN(date.getTime())) {
    return fallback.toISOString()
  }

  return date.toISOString()
}

function stripMarkdown(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildExcerpt(content: string) {
  const plainText = stripMarkdown(content)
  if (plainText.length <= 140) return plainText
  return `${plainText.slice(0, 140).trim()}...`
}

function estimateReadingTime(content: string) {
  const normalizedLength = stripMarkdown(content).replace(/\s+/g, '').length
  return Math.max(1, Math.ceil(normalizedLength / 320))
}

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function parsePost(slug: string, rawContent: string, fallbackDate: Date): BlogPost {
  const { data, content } = matter(rawContent)
  const frontmatter = data as PostFrontmatter
  const excerpt = normalizeText(frontmatter.excerpt) || normalizeText(frontmatter.description) || buildExcerpt(content)
  const publishedAt = normalizeDate(frontmatter.publishedAt || frontmatter.date, fallbackDate)
  const updatedAt = normalizeText(frontmatter.updatedAt)

  return {
    slug,
    title: normalizeText(frontmatter.title) || titleFromSlug(slug),
    excerpt,
    description: normalizeText(frontmatter.description) || excerpt,
    publishedAt,
    updatedAt: updatedAt ? normalizeDate(updatedAt, new Date(publishedAt)) : undefined,
    coverImage: normalizeText(frontmatter.coverImage) || undefined,
    tags: normalizeTags(frontmatter.tags),
    mood: normalizeText(frontmatter.mood) || '✍️',
    readingTimeMinutes: estimateReadingTime(content),
    content: content.trim(),
  }
}

async function getPostFilenames() {
  try {
    const entries = await fs.readdir(POSTS_DIRECTORY, { withFileTypes: true })
    return entries
      .filter(entry => entry.isFile() && /\.md$/i.test(entry.name))
      .map(entry => entry.name)
  } catch {
    return []
  }
}

function slugFromFilename(filename: string) {
  return filename.replace(/\.md$/i, '')
}

export async function getAllPostSlugs() {
  const filenames = await getPostFilenames()
  return filenames.map(slugFromFilename)
}

async function getMarkdownPostRecords(): Promise<BlogPost[]> {
  const filenames = await getPostFilenames()

  const posts = await Promise.all(
    filenames.map(async filename => {
      const slug = slugFromFilename(filename)
      const fullPath = path.join(POSTS_DIRECTORY, filename)
      const fileContent = await fs.readFile(fullPath, 'utf8')
      const stats = await fs.stat(fullPath)
      const parsed = parsePost(slug, fileContent, stats.birthtime || stats.mtime)
      const frontmatter = matter(fileContent).data as PostFrontmatter

      return frontmatter.draft ? null : parsed
    }),
  )

  return posts
    .filter((post): post is BlogPost => Boolean(post))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

type DatabaseArticleSummary = {
  slug: string
  title: string
  content: string
  excerpt: string | null
  mood: string
  coverImage: string | null
  accessType: string
  price: number | null
  pinned: boolean
  createdAt: Date
  updatedAt: Date
}

function mapDatabaseArticleToSummary(article: DatabaseArticleSummary): BlogPostSummary {
  const excerpt = normalizeText(article.excerpt) || buildExcerpt(article.content)

  return {
    slug: article.slug,
    title: article.title.trim(),
    excerpt,
    description: excerpt,
    publishedAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    coverImage: article.coverImage || undefined,
    tags: [],
    mood: normalizeText(article.mood) || '✍️',
    readingTimeMinutes: estimateReadingTime(article.content),
    href: `/article/${article.slug}`,
    pinned: article.pinned,
    accessType: article.accessType || 'PUBLIC',
    price: article.price ?? undefined,
  }
}

async function getPublishedDatabasePosts() {
  const articles = await runWithDatabase(
    async db =>
      db.article.findMany({
        where: { published: true },
        orderBy: [{ pinned: 'desc' }, { pinnedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          slug: true,
          title: true,
          content: true,
          excerpt: true,
          mood: true,
          coverImage: true,
          accessType: true,
          price: true,
          pinned: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    [],
    'public_database_posts',
  )

  return articles.map(mapDatabaseArticleToSummary)
}

export async function syncMarkdownPostsToDatabase(): Promise<void> {
  if (!isDatabaseConfigured()) return

  const markdownPosts = await getMarkdownPostRecords()
  if (markdownPosts.length === 0) return

  const slugs = markdownPosts.map(post => post.slug)
  const existingSlugs = await runWithDatabase(
    async db => {
      const existing = await db.article.findMany({
        where: { slug: { in: slugs } },
        select: { slug: true },
      })

      return existing.map(article => article.slug)
    },
    [] as string[],
    'markdown_import_existing',
  )

  const existingSlugSet = new Set(existingSlugs)
  const missingPosts = markdownPosts.filter(post => !existingSlugSet.has(post.slug))

  if (missingPosts.length === 0) return

  await runWithDatabase(
    async () => {
      await prisma.article.createMany({
        data: missingPosts.map(post => ({
          slug: post.slug,
          title: post.title,
          content: post.content ?? '',
          excerpt: post.excerpt,
          mood: post.mood,
          coverImage: post.coverImage ?? null,
          accessType: 'PUBLIC',
          price: null,
          pinned: Boolean(post.pinned),
          published: true,
          createdAt: new Date(post.publishedAt),
        })),
        skipDuplicates: true,
      })
    },
    undefined,
    'markdown_import_create',
  )
}

export async function getAllPosts(): Promise<BlogPostSummary[]> {
  await syncMarkdownPostsToDatabase()

  const [databasePosts, markdownPosts] = await Promise.all([
    getPublishedDatabasePosts(),
    getMarkdownPostRecords(),
  ])

  const databaseSlugSet = new Set(databasePosts.map(post => post.slug))

  const markdownSummaries = markdownPosts
    .filter(post => !databaseSlugSet.has(post.slug))
    .map(({ content, ...summary }) => ({
      ...summary,
      href: `/blog/${summary.slug}`,
    }))

  return [...databasePosts, ...markdownSummaries]
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1
      }

      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const fullPath = path.join(POSTS_DIRECTORY, `${slug}.md`)

  try {
    const [fileContent, stats] = await Promise.all([
      fs.readFile(fullPath, 'utf8'),
      fs.stat(fullPath),
    ])
    const parsed = parsePost(slug, fileContent, stats.birthtime || stats.mtime)
    const frontmatter = matter(fileContent).data as PostFrontmatter

    if (frontmatter.draft) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}
