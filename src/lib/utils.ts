import crypto from 'crypto'
import { plainTextFromArticleContent } from '@/lib/article-content'

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
  })
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
