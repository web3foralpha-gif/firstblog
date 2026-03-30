import QRCode from 'qrcode'
import { ImageResponse } from 'next/og'
import { getPostBySlug } from '@/lib/posts'
import { runWithDatabase } from '@/lib/db'
import { getAllSettings } from '@/lib/settings'
import { resolveSharedFontStack } from '@/lib/shared-fonts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const POSTER_WIDTH = 1080
const POSTER_MIN_HEIGHT = 1380
const POSTER_MAX_HEIGHT = 2160
const FRAME_INSET = 38
const FRAME_PADDING_X = 52
const FRAME_PADDING_TOP = 52
const FRAME_PADDING_BOTTOM = 42
const CONTENT_WIDTH = POSTER_WIDTH - (FRAME_INSET + FRAME_PADDING_X) * 2
const HEADER_ROW_HEIGHT = 220
const HEADER_GAP = 30
const TITLE_FONT_SIZE = 76
const TITLE_LINE_HEIGHT = 98
const TITLE_SECTION_TOP_PADDING = 30
const TITLE_SECTION_BOTTOM_PADDING = 28
const DATE_TOP_MARGIN = 24
const DATE_HEIGHT = 36
const BODY_TOP_MARGIN = 34
const BODY_FONT_SIZE = 34
const BODY_LINE_HEIGHT = 62
const BODY_PARAGRAPH_GAP = 20
const BODY_MAX_UNITS = 18.2
const BODY_FALLBACK_LINES = 5
const BODY_MAX_PARAGRAPHS = 5
const BODY_PREVIEW_RATIO = 0.25
const BODY_PREVIEW_MIN_LINES = 5
const BODY_PREVIEW_MAX_LINES = 9
const FOOTER_TOP_MARGIN = 28
const FOOTER_RESERVED_HEIGHT = 268
const QR_SIZE = 220
const MASCOT_CARD_SIZE = 220
const MASCOT_SIZE = 156

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
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
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

function appendPosterEllipsis(text: string) {
  const cleaned = text.trim().replace(/[，。、“”‘’；：！？,.!?;:…]+$/g, '')
  return cleaned ? `${cleaned}……` : '打开原文，继续阅读完整内容。'
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

  return appendPosterEllipsis(result)
}

function fitParagraphsToHeight(
  paragraphs: string[],
  maxHeight: number,
  options: {
    maxUnitsPerLine: number
    lineHeight: number
    paragraphGap: number
    fallbackLines?: number
    maxParagraphs?: number
  },
) {
  const {
    maxUnitsPerLine,
    lineHeight,
    paragraphGap,
    fallbackLines = BODY_FALLBACK_LINES,
    maxParagraphs,
  } = options

  const source = typeof maxParagraphs === 'number' ? paragraphs.slice(0, maxParagraphs) : paragraphs
  const hiddenByLimit = source.length < paragraphs.length
  const fitted: string[] = []
  let usedHeight = 0
  let truncated = false

  for (const paragraph of source) {
    const lineCount = estimateLineCount(paragraph, maxUnitsPerLine)
    const gap = fitted.length > 0 ? paragraphGap : 0
    const paragraphHeight = lineCount * lineHeight + gap

    if (usedHeight + paragraphHeight <= maxHeight) {
      fitted.push(paragraph)
      usedHeight += paragraphHeight
      continue
    }

    const remainingHeight = maxHeight - usedHeight - gap
    const remainingLines = Math.floor(remainingHeight / lineHeight)

    if (remainingLines > 0) {
      fitted.push(trimParagraphToUnits(paragraph, remainingLines * maxUnitsPerLine))
    }

    truncated = true
    break
  }

  if (fitted.length === 0) {
    return [trimParagraphToUnits(source[0] || '打开原文，继续阅读完整内容。', maxUnitsPerLine * fallbackLines)]
  }

  if (truncated || hiddenByLimit) {
    fitted[fitted.length - 1] = appendPosterEllipsis(fitted[fitted.length - 1])
  }

  return fitted
}

function extractPosterBodyFontFamily(content: string) {
  const styleMatcher = /style=(['"])(.*?)\1/gi
  let styleMatch: RegExpExecArray | null

  while ((styleMatch = styleMatcher.exec(content)) !== null) {
    const declarations = styleMatch[2] || ''
    const fontMatch = declarations.match(/font-family\s*:\s*([^;]+)/i)
    const fontFamily = fontMatch?.[1]?.trim()
    if (fontFamily) return fontFamily
  }

  const classMap: Record<string, string> = {
    'ql-font-serif': "'Noto Serif SC', Georgia, serif",
    'ql-font-sans': "'Noto Sans SC', system-ui, sans-serif",
    'ql-font-song': "'Songti SC', 'STSong', 'SimSun', serif",
    'ql-font-hei': "'PingFang SC', 'Microsoft YaHei', sans-serif",
    'ql-font-mono': "'JetBrains Mono', 'Fira Code', monospace",
  }

  const classMatcher = /class=(['"])(.*?)\1/gi
  let classMatch: RegExpExecArray | null

  while ((classMatch = classMatcher.exec(content)) !== null) {
    const classNames = (classMatch[2] || '').split(/\s+/)
    for (const className of classNames) {
      if (classMap[className]) return classMap[className]
    }
  }

  return ''
}

function formatPosterDate(input: string) {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return {
      weekday: '',
      fullDate: '',
    }
  }

  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return {
    weekday,
    fullDate: `${year}-${month}-${day}`,
  }
}

function resolvePosterMascotUrl(origin: string) {
  return `${origin}/pets/pikachu-shimeji/shime44.png`
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
  const [allSettings, article] = await Promise.all([getAllSettings(), getShareArticleData(slug)])

  if (!article) {
    return new Response('Article not found', { status: 404 })
  }

  const siteTitle = (allSettings['site.title'] || '').trim() || '我的小站'
  const posterHeaderSetting = (allSettings['poster.headerLabel'] || '').trim()
  const posterHeaderText = trimParagraphToUnits(
    posterHeaderSetting && posterHeaderSetting.toLowerCase() !== 'article poster'
      ? posterHeaderSetting
      : '文章分享海报',
    18,
  )
  const posterScanText = trimParagraphToUnits(
    (allSettings['poster.scanText'] || '').trim() || '扫码查看原文',
    12,
  )
  const posterFooterDescription = trimParagraphToUnits(
    (allSettings['poster.footerDescription'] || '').trim() || '把想说的话，好好留在这里。',
    40,
  )
  const posterFontFamily = resolveSharedFontStack(allSettings['poster.fontFamily'])
  const articleBodyFontFamily = extractPosterBodyFontFamily(article.content) || posterFontFamily
  const origin = resolveOrigin(req)
  const articleUrl = `${origin}${article.articlePath}`
  const siteDomain = new URL(articleUrl).host.replace(/^www\./, '')
  const published = formatPosterDate(article.publishedAt)
  const paragraphs = splitParagraphs(article.content)
  const rawParagraphs = paragraphs.length > 0 ? paragraphs : [article.excerpt || '打开原文，继续阅读完整内容。']
  const mascotUrl = resolvePosterMascotUrl(origin)

  const titleLines = estimateLineCount(article.title, 11.6)
  const titleBlockHeight = titleLines * TITLE_LINE_HEIGHT
  const fixedHeight =
    FRAME_INSET * 2 +
    FRAME_PADDING_TOP +
    FRAME_PADDING_BOTTOM +
    HEADER_ROW_HEIGHT +
    HEADER_GAP +
    TITLE_SECTION_TOP_PADDING +
    titleBlockHeight +
    DATE_TOP_MARGIN +
    DATE_HEIGHT +
    TITLE_SECTION_BOTTOM_PADDING +
    BODY_TOP_MARGIN +
    FOOTER_TOP_MARGIN +
    FOOTER_RESERVED_HEIGHT
  const maxContentHeight = POSTER_MAX_HEIGHT - fixedHeight
  const rawLineEstimate = rawParagraphs.reduce(
    (total, paragraph) => total + estimateLineCount(paragraph, BODY_MAX_UNITS),
    0,
  )
  const previewTargetLines = Math.max(
    BODY_PREVIEW_MIN_LINES,
    Math.min(BODY_PREVIEW_MAX_LINES, Math.ceil(rawLineEstimate * BODY_PREVIEW_RATIO)),
  )
  const previewGapAllowance =
    Math.max(0, Math.min(rawParagraphs.length - 1, BODY_MAX_PARAGRAPHS - 1, 2)) * BODY_PARAGRAPH_GAP
  const previewMaxHeight = previewTargetLines * BODY_LINE_HEIGHT + previewGapAllowance
  const contentParagraphs = fitParagraphsToHeight(
    rawParagraphs,
    Math.max(
      Math.min(maxContentHeight, previewMaxHeight),
      BODY_LINE_HEIGHT * BODY_FALLBACK_LINES,
    ),
    {
      maxUnitsPerLine: BODY_MAX_UNITS,
      lineHeight: BODY_LINE_HEIGHT,
      paragraphGap: BODY_PARAGRAPH_GAP,
      fallbackLines: BODY_FALLBACK_LINES,
      maxParagraphs: BODY_MAX_PARAGRAPHS,
    },
  )
  const contentLineCount = contentParagraphs.reduce(
    (total, paragraph) => total + estimateLineCount(paragraph, BODY_MAX_UNITS),
    0,
  )
  const contentGapHeight = Math.max(0, contentParagraphs.length - 1) * BODY_PARAGRAPH_GAP
  const contentBlockHeight = contentLineCount * BODY_LINE_HEIGHT + contentGapHeight
  const posterHeight = Math.min(
    POSTER_MAX_HEIGHT,
    Math.max(POSTER_MIN_HEIGHT, fixedHeight + contentBlockHeight),
  )

  const qrDataUrl = await QRCode.toDataURL(articleUrl, {
    margin: 1,
    width: QR_SIZE,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#221812',
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
          position: 'relative',
          background: 'linear-gradient(180deg, #eee0ce 0%, #e5d3bc 100%)',
          color: '#1f140d',
          fontFamily: posterFontFamily,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: `${FRAME_INSET}px`,
            display: 'flex',
            border: '3px solid #694f3d',
            borderRadius: 32,
            background: 'linear-gradient(180deg, #fbf7f0 0%, #f4e8d7 100%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            position: 'relative',
            zIndex: 1,
            padding: `${FRAME_INSET + FRAME_PADDING_TOP}px ${FRAME_INSET + FRAME_PADDING_X}px ${FRAME_INSET + FRAME_PADDING_BOTTOM}px`,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: `${CONTENT_WIDTH}px`,
              height: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: `${HEADER_ROW_HEIGHT}px`,
                justifyContent: 'space-between',
                alignItems: 'stretch',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  width: 640,
                  paddingTop: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignSelf: 'flex-start',
                    alignItems: 'center',
                    padding: '16px 24px',
                    border: '2px solid #725947',
                    borderRadius: 999,
                    backgroundColor: '#fff8f0',
                    maxWidth: 480,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 22,
                      letterSpacing: 2.6,
                      color: '#7d6552',
                      fontWeight: 700,
                    }}
                  >
                    {posterHeaderText}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 58,
                      lineHeight: '64px',
                      fontWeight: 700,
                      color: '#25170f',
                    }}
                  >
                    {siteTitle}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      marginTop: 12,
                      fontSize: 24,
                      color: '#7d6856',
                      letterSpacing: 0.2,
                    }}
                  >
                    {siteDomain}
                  </div>
                </div>
              </div>

              {mascotUrl ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: `${MASCOT_CARD_SIZE}px`,
                    height: `${MASCOT_CARD_SIZE}px`,
                    padding: '18px 14px 14px',
                    border: '2px solid #725947',
                    borderRadius: 26,
                    background: 'linear-gradient(180deg, #f0dfcc 0%, #fff5ea 100%)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#5e4939',
                    }}
                  >
                    纸杯吖
                  </div>
                  <img
                    src={mascotUrl}
                    alt="网站宠物"
                    style={{
                      width: `${MASCOT_SIZE}px`,
                      height: `${MASCOT_SIZE}px`,
                      objectFit: 'contain',
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                marginTop: `${HEADER_GAP}px`,
                padding: `${TITLE_SECTION_TOP_PADDING}px 0 ${TITLE_SECTION_BOTTOM_PADDING}px`,
                borderTop: '2px solid #6b523f',
                borderBottom: '2px solid #6b523f',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: `${TITLE_FONT_SIZE}px`,
                  lineHeight: `${TITLE_LINE_HEIGHT}px`,
                  fontWeight: 800,
                  letterSpacing: 0.36,
                  color: '#23160e',
                }}
              >
                {article.title}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: `${DATE_TOP_MARGIN}px`,
                  height: `${DATE_HEIGHT}px`,
                  fontSize: 24,
                  color: '#7f6957',
                  letterSpacing: 0.2,
                }}
              >
                <div style={{ display: 'flex' }}>{published.weekday || '发布于'}</div>
                <div
                  style={{
                    display: 'flex',
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: '#b5967c',
                    margin: '0 14px',
                  }}
                />
                <div style={{ display: 'flex' }}>{published.fullDate || siteDomain}</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                marginTop: `${BODY_TOP_MARGIN}px`,
                padding: '0 4px',
                color: '#20150f',
                fontFamily: articleBodyFontFamily,
              }}
            >
              {contentParagraphs.map((paragraph, index) => (
                <div
                  key={`${index}-${paragraph.slice(0, 12)}`}
                  style={{
                    display: 'flex',
                    width: '100%',
                    marginTop: index === 0 ? 0 : `${BODY_PARAGRAPH_GAP}px`,
                    fontSize: `${BODY_FONT_SIZE}px`,
                    lineHeight: `${BODY_LINE_HEIGHT}px`,
                    letterSpacing: 0.08,
                    whiteSpace: 'pre-wrap',
                    color: '#281b12',
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
                marginTop: `${FOOTER_TOP_MARGIN}px`,
                paddingTop: 28,
                borderTop: '2px solid #6b523f',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  width: 592,
                  minHeight: `${FOOTER_RESERVED_HEIGHT}px`,
                  padding: '30px 34px',
                  border: '2px solid #725947',
                  borderRadius: 30,
                  background: 'linear-gradient(180deg, rgba(236, 219, 199, 0.96) 0%, rgba(248, 239, 227, 0.98) 100%)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 44,
                      fontWeight: 700,
                      color: '#24170f',
                    }}
                  >
                    {siteTitle}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      marginTop: 18,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        fontSize: 28,
                        lineHeight: '44px',
                        color: '#4e3d30',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {posterFooterDescription}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        marginTop: 22,
                        fontSize: 22,
                        color: '#7c6857',
                      }}
                    >
                      {siteDomain}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  width: 260,
                  minHeight: `${FOOTER_RESERVED_HEIGHT}px`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 254,
                    height: 254,
                    padding: 16,
                    border: '2px solid #725947',
                    borderRadius: 28,
                    backgroundColor: '#fffdf9',
                  }}
                >
                  <img src={qrDataUrl} alt="文章二维码" style={{ width: QR_SIZE, height: QR_SIZE }} />
                </div>

                <div
                  style={{
                    display: 'flex',
                    marginTop: 20,
                    fontSize: 24,
                    color: '#25180f',
                    fontWeight: 700,
                  }}
                >
                  {posterScanText}
                </div>
                <div
                  style={{
                    display: 'flex',
                    marginTop: 10,
                    fontSize: 18,
                    color: '#89715f',
                  }}
                >
                  {siteDomain}
                </div>
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
