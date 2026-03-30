import crypto from 'crypto'
import { plainTextFromArticleContent } from '@/lib/article-content'

export const SITE_TIME_ZONE = 'Asia/Shanghai'

// 生成安全随机 token（64 位十六进制字符）
export function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// 从文章内容生成摘要
export function generateExcerpt(content: string, length = 120): string {
  const plain = plainTextFromArticleContent(content)
  return plain.length > length ? plain.slice(0, length) + '…' : plain
}

// 生成 URL-safe 的 slug
export function generateSlug(title: string): string {
  // 对中文标题用拼音风格处理（简单版：时间戳）
  const timestamp = Date.now()
  const safe = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return safe ? `${safe}-${timestamp}` : `article-${timestamp}`
}

// 格式化日期为中文
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: SITE_TIME_ZONE,
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: SITE_TIME_ZONE,
  })
}

function getTimeZoneParts(date: Date, timeZone = SITE_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const year = Number(parts.find(part => part.type === 'year')?.value)
  const month = Number(parts.find(part => part.type === 'month')?.value)
  const day = Number(parts.find(part => part.type === 'day')?.value)

  return { year, month, day }
}

export function getDayRangeInTimeZone(date = new Date(), timeZone = SITE_TIME_ZONE) {
  const { year, month, day } = getTimeZoneParts(date, timeZone)
  const utcStart = new Date(Date.UTC(year, month - 1, day, -8, 0, 0, 0))
  const utcEnd = new Date(Date.UTC(year, month - 1, day + 1, -8, 0, 0, 0))

  return {
    start: utcStart,
    end: utcEnd,
  }
}

// 心情列表
export const MOODS = [
  { value: '😊', label: '开心' },
  { value: '😢', label: '悲伤' },
  { value: '😤', label: '愤怒' },
  { value: '😌', label: '平静' },
  { value: '🤔', label: '思考' },
  { value: '😴', label: '困倦' },
  { value: '🥰', label: '甜蜜' },
  { value: '😎', label: '酷' },
  { value: '😰', label: '焦虑' },
  { value: '🎉', label: '庆祝' },
]
