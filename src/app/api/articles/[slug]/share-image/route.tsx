import QRCode from 'qrcode'
import { ImageResponse } from 'next/og'
import { getPostBySlug } from '@/lib/posts'
import { prisma, runWithDatabase } from '@/lib/db'
import { getSetting } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const POSTER_WIDTH = 1080
const POSTER_MIN_HEIGHT = 1920
const POSTER_MAX_HEIGHT = 2400
const SIDE_PADDING = 58
const CONTENT_WIDTH = POSTER_WIDTH - SIDE_PADDING * 2
const BODY_FONT_SIZE = 52
const BODY_LINE_HEIGHT = 84
const TITLE_FONT_SIZE = 80
const TITLE_LINE_HEIGHT = 108
const FOOTER_RESERVED_HEIGHT = 420

type RouteContext = {
  params: Promise<{ slug: string }>
}

type ShareArticleData = {
  title: string
  excerpt: string
  content: string
  coverImage: string
  publishedAt: string
  articlePath: string
}

function resolveOrigin(req: Request) {
  const url = new URL(req.url)
  const forwardedHost = req.headers.get('x-forwarded-host')
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https'

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return url.origin
}

function stripHtml(content: string) {
  return content
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|blockquote|h1|h2|h3|h4|h5|h6)>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripMarkdown(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
}

function normalizePosterText(content: string) {
  const raw = /<\/?[a-z][\s\S]*>/i.test(content) ? stripHtml(content) : stripMarkdown(content)

  return raw
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function splitParagraphs(content: string) {
  return normalizePosterText(content)
    .split(/\n{2,}/)
    .map(item => item.trim())
    .filter(Boolean)
}

function charUnits(text: string) {
  let units = 0

  for (const char of text) {
    if (/\s/.test(char)) {
      units += 0.35
    } else if (/[A-Za-z0-9]/.test(char)) {
      units += 0.56
    } else if (/[，。、“”‘’；：！？,.!?;:()（）【】《》\-]/.test(char)) {
      units += 0.58
    } else {
      units += 1
    }
  }

  return units
}

function estimateLineCount(text: string, maxUnits: number) {
  return Math.max(1, Math.ceil(charUnits(text) / maxUnits))
}

function trimParagraphToUnits(text: string, maxUnits: number) {
  if (charUnits(text) <= maxUnits) return text

  let currentUnits = 0
  let result = ''

  for (const char of text) {
    const nextUnits = currentUnits + charUnits(char)
    if (nextUnits > maxUnits) break
    result += char
    currentUnits = nextUnits
  }

  return `${result.trim()}……`
}

function fitParagraphsToHeight(paragraphs: string[], maxHeight: number) {
  const fitted: string[] = []
  let usedHeight = 0

  for (const paragraph of paragraphs) {
    const lineCount = estimateLineCount(paragraph, 18)
    const gap = fitted.length > 0 ? 28 : 0
    const paragraphHeight = lineCount * BODY_LINE_HEIGHT + gap

    if (usedHeight + paragraphHeight <= maxHeight) {
      fitted.push(paragraph)
      usedHeight += paragraphHeight
      continue
    }

    const remainingHeight = maxHeight - usedHeight - gap
    const remainingLines = Math.floor(remainingHeight / BODY_LINE_HEIGHT)

    if (remainingLines > 0) {
      fitted.push(trimParagraphToUnits(paragraph, remainingLines * 18))
    }

    break
  }

  return fitted.length > 0 ? fitted : [trimParagraphToUnits(paragraphs[0] || '打开原文，继续阅读完整内容。', 18 * 6)]
}

function formatDateLabel(input: string) {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ''

  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${weekday}  ${year}-${month}-${day}`
}

async function getShareArticleData(slug: string): Promise<ShareArticleData | null> {
  const article = await runWithDatabase(
    async db =>
      db.article.findFirst({
        where: { slug, published: true },
        select: {
          title: true,
          excerpt: true,
          content: true,
          coverImage: true,
          createdAt: true,
        },
      }),
    null,
    'share_poster_article',
  )

  if (article) {
    return {
      title: article.title,
      excerpt: article.excerpt || '',
      content: article.content || '',
      coverImage: article.coverImage || '',
      publishedAt: article.createdAt.toISOString(),
      articlePath: `/article/${slug}`,
    }
  }

  const markdown = await getPostBySlug(slug)
  if (!markdown) return null

  return {
    title: markdown.title,
    excerpt: markdown.excerpt || markdown.description || '',
    content: markdown.content || '',
    coverImage: markdown.coverImage || '',
    publishedAt: markdown.publishedAt,
    articlePath: `/blog/${slug}`,
  }
}

export async function GET(req: Request, { params }: RouteContext) {
  const { slug } = await params
  const [siteTitleRaw, article] = await Promise.all([
    getSetting('site.title'),
    getShareArticleData(slug),
  ])

  if (!article) {
    return new Response('Article not found', { status: 404 })
  }

  const siteTitle = siteTitleRaw.trim() || '我的小站'
  const origin = resolveOrigin(req)
  const articleUrl = `${origin}${article.articlePath}`
  const publishedLabel = formatDateLabel(article.publishedAt)
  const paragraphs = splitParagraphs(article.content)
  const rawParagraphs = paragraphs.length > 0 ? paragraphs : [article.excerpt || '打开原文，继续阅读完整内容。']

  const titleLines = estimateLineCount(article.title, 12)
  const titleBlockHeight = titleLines * TITLE_LINE_HEIGHT
  const coverBlockHeight = article.coverImage ? 360 : 0
  const maxContentHeight =
    POSTER_MAX_HEIGHT - 360 - titleBlockHeight - 120 - coverBlockHeight - FOOTER_RESERVED_HEIGHT
  const contentParagraphs = fitParagraphsToHeight(rawParagraphs, Math.max(maxContentHeight, BODY_LINE_HEIGHT * 6))
  const contentLineCount = contentParagraphs.reduce((total, paragraph) => total + estimateLineCount(paragraph, 18), 0)
  const paragraphGap = Math.max(0, contentParagraphs.length - 1) * 28
  const contentBlockHeight = contentLineCount * BODY_LINE_HEIGHT + paragraphGap
  const posterHeight = Math.min(
    POSTER_MAX_HEIGHT,
    Math.max(
      POSTER_MIN_HEIGHT,
      360 + titleBlockHeight + 120 + coverBlockHeight + contentBlockHeight + FOOTER_RESERVED_HEIGHT,
    ),
  )

  const qrDataUrl = await QRCode.toDataURL(articleUrl, {
    margin: 1,
    width: 240,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111111',
      light: '#ffffff',
    },
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: `${POSTER_WIDTH}px`,
          height: `${posterHeight}px`,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f6f1e9',
          color: '#111111',
          fontFamily: '"PingFang SC", "Noto Sans SC", sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #060606 0px, #111111 240px, #f8f8f8 420px, #ffffff 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: -22,
            left: 24,
            display: 'flex',
            fontSize: 136,
            letterSpacing: 6,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.09)',
          }}
        >
          BLOG POSTER
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: `${SIDE_PADDING}px`,
            paddingTop: '86px',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              color: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                fontSize: 22,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.72)',
              }}
            >
              <div style={{ display: 'flex' }}>Article Poster</div>
              <div style={{ display: 'flex', width: 80, height: 1, backgroundColor: 'rgba(255,255,255,0.32)' }} />
              <div style={{ display: 'flex' }}>{siteTitle}</div>
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 34,
                fontSize: 36,
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              {siteTitle}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 84,
              width: '100%',
              borderRadius: 42,
              backgroundColor: '#ffffff',
              padding: '56px 56px 48px',
              boxShadow: '0 36px 80px rgba(15, 23, 42, 0.14)',
              minHeight: `${posterHeight - 250}px`,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '100%',
                fontSize: `${TITLE_FONT_SIZE}px`,
                lineHeight: `${TITLE_LINE_HEIGHT}px`,
                fontWeight: 700,
                letterSpacing: 1,
                color: '#101010',
              }}
            >
              {article.title}
            </div>

            {publishedLabel ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  marginTop: 38,
                  fontSize: 28,
                  color: '#7a7a7a',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: '2px solid #b7b7b7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    color: '#9a9a9a',
                  }}
                >
                  •
                </div>
                <div style={{ display: 'flex' }}>{publishedLabel}</div>
              </div>
            ) : null}

            {article.coverImage ? (
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  marginTop: 36,
                  borderRadius: 28,
                  overflow: 'hidden',
                  backgroundColor: '#f5f5f5',
                }}
              >
                <img
                  src={article.coverImage}
                  alt={article.title}
                  style={{
                    width: `${CONTENT_WIDTH}px`,
                    height: '360px',
                    objectFit: 'cover',
                  }}
                />
              </div>
            ) : null}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                marginTop: article.coverImage ? 42 : 56,
                gap: 28,
                color: '#111111',
              }}
            >
              {contentParagraphs.map((paragraph, index) => (
                <div
                  key={`${index}-${paragraph.slice(0, 12)}`}
                  style={{
                    display: 'flex',
                    width: '100%',
                    fontSize: `${BODY_FONT_SIZE}px`,
                    lineHeight: `${BODY_LINE_HEIGHT}px`,
                    letterSpacing: 0.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {paragraph}
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                width: '100%',
                marginTop: 'auto',
                paddingTop: 64,
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  maxWidth: '56%',
                  color: '#111111',
                }}
              >
                <div style={{ display: 'flex', fontSize: 58, fontWeight: 800 }}>{siteTitle}</div>
                <div
                  style={{
                    display: 'flex',
                    marginTop: 14,
                    width: '100%',
                    height: 2,
                    backgroundColor: '#222222',
                    opacity: 0.2,
                  }}
                />
                <div style={{ display: 'flex', marginTop: 18, fontSize: 28, color: '#444444' }}>扫码查看原文</div>
                <div style={{ display: 'flex', marginTop: 12, fontSize: 22, color: '#7a7a7a' }}>{articleUrl}</div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    padding: 18,
                    borderRadius: 18,
                    backgroundColor: '#ffffff',
                    border: '2px solid #d8e3ff',
                  }}
                >
                  <img src={qrDataUrl} alt="文章二维码" style={{ width: 220, height: 220 }} />
                </div>
                <div style={{ display: 'flex', fontSize: 24, color: '#222222' }}>扫码查看原文</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: POSTER_WIDTH,
      height: posterHeight,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  )
}
