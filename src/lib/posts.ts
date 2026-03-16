import 'server-only'

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

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

export async function getAllPosts(): Promise<BlogPostSummary[]> {
  const filenames = await getPostFilenames()

  const posts = await Promise.all(
    filenames.map(async filename => {
      const slug = slugFromFilename(filename)
      const fullPath = path.join(POSTS_DIRECTORY, filename)
      const fileContent = await fs.readFile(fullPath, 'utf8')
      const stats = await fs.stat(fullPath)
      const parsed = parsePost(slug, fileContent, stats.birthtime || stats.mtime)
      const { content, ...summary } = parsed
      const frontmatter = matter(fileContent).data as PostFrontmatter

      return frontmatter.draft ? null : summary
    }),
  )

  return posts
    .filter((post): post is BlogPostSummary => Boolean(post))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
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
