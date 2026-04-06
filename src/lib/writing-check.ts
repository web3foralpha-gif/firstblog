import { plainTextFromArticleContent } from '@/lib/article-content'

export type WritingIssueLevel = 'warning' | 'info'

export type WritingIssue = {
  id: string
  level: WritingIssueLevel
  title: string
  detail: string
  excerpts?: string[]
}

type AnalyzeWritingIssuesInput = {
  title: string
  content: string
}

const CHINESE_CHAR_RE = /[\u3400-\u9fff]/
const COMMON_DUPLICATE_WORD_RE = /(的的|了了|是是|在在|有有|和和|就就|会会|都都|把把|被被)/g
const ENGLISH_PUNCTUATION_RE = /[,.!?;:]/g

function getPlainText(input: AnalyzeWritingIssuesInput) {
  return `${input.title}\n${plainTextFromArticleContent(input.content)}`
}

function countMatches(text: string, pattern: RegExp) {
  const matches = text.match(pattern)
  return matches ? matches.length : 0
}

function buildExcerpt(text: string, start: number, end: number, radius = 14) {
  const safeStart = Math.max(0, start - radius)
  const safeEnd = Math.min(text.length, end + radius)
  const prefix = safeStart > 0 ? '…' : ''
  const suffix = safeEnd < text.length ? '…' : ''
  return `${prefix}${text.slice(safeStart, safeEnd)}${suffix}`.replace(/\n/g, ' ')
}

function collectExcerpts(text: string, pattern: RegExp, maxCount = 3) {
  const matcher = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
  const excerpts: string[] = []
  let match: RegExpExecArray | null

  while ((match = matcher.exec(text)) !== null) {
    const matched = match[0] || ''
    if (!matched) break
    excerpts.push(buildExcerpt(text, match.index, match.index + matched.length))
    if (excerpts.length >= maxCount) break
  }

  return excerpts
}

function hasAsciiPunctuationAroundChinese(text: string) {
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (!ENGLISH_PUNCTUATION_RE.test(char)) continue

    const prev = text[index - 1] || ''
    const next = text[index + 1] || ''
    ENGLISH_PUNCTUATION_RE.lastIndex = 0

    if (CHINESE_CHAR_RE.test(prev) || CHINESE_CHAR_RE.test(next)) {
      return true
    }
  }

  return false
}

function collectAsciiPunctuationExcerpts(text: string, maxCount = 3) {
  const excerpts: string[] = []

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (!ENGLISH_PUNCTUATION_RE.test(char)) continue

    const prev = text[index - 1] || ''
    const next = text[index + 1] || ''
    ENGLISH_PUNCTUATION_RE.lastIndex = 0

    if (CHINESE_CHAR_RE.test(prev) || CHINESE_CHAR_RE.test(next)) {
      excerpts.push(buildExcerpt(text, index, index + 1))
      if (excerpts.length >= maxCount) break
    }
  }

  return excerpts
}

function hasUnbalancedPairs(text: string, open: string, close: string) {
  return countMatches(text, new RegExp(`\\${open}`, 'g')) !== countMatches(text, new RegExp(`\\${close}`, 'g'))
}

export function analyzeWritingIssues(input: AnalyzeWritingIssuesInput): WritingIssue[] {
  const text = getPlainText(input)
  const issues: WritingIssue[] = []

  if (!text.trim()) return issues

  if (hasAsciiPunctuationAroundChinese(text)) {
    issues.push({
      id: 'ascii-punctuation',
      level: 'warning',
      title: '中英文标点混用',
      detail: '正文里出现了英文逗号、句号或问号贴着中文使用，建议统一换成中文标点，读起来会更顺。',
      excerpts: collectAsciiPunctuationExcerpts(text),
    })
  }

  if (/([，。！？；：,.!?;:、])\1{1,}/.test(text) || /[!！?？]{3,}/.test(text)) {
    issues.push({
      id: 'repeated-punctuation',
      level: 'warning',
      title: '标点可能重复了',
      detail: '检测到连续重复的标点，像“！！”“。。”“，，”，可以再顺手清一下。',
      excerpts: collectExcerpts(text, /([，。！？；：,.!?;:、])\1{1,}|[!！?？]{3,}/g),
    })
  }

  if (/\.{3,}/.test(text)) {
    issues.push({
      id: 'dots-ellipsis',
      level: 'info',
      title: '省略号格式可统一',
      detail: '如果这里是中文语境，建议把英文句点式省略号改成“……”会更自然。',
      excerpts: collectExcerpts(text, /\.{3,}/g),
    })
  }

  if (/\s+[，。！？；：,.!?]/.test(text) || /[（《“]\s+/.test(text)) {
    issues.push({
      id: 'spacing-around-punctuation',
      level: 'info',
      title: '标点附近有多余空格',
      detail: '部分标点前后出现了不必要的空格，清掉之后版面会更整洁。',
      excerpts: collectExcerpts(text, /\s+[，。！？；：,.!?]|[（《“]\s+/g),
    })
  }

  if (/[\u3400-\u9fff]\s{1,2}[\u3400-\u9fff]/.test(text)) {
    issues.push({
      id: 'space-between-chinese',
      level: 'info',
      title: '中文之间可能有异常空格',
      detail: '检测到中文字符之间夹了空格，如果不是特意留白，建议删掉。',
      excerpts: collectExcerpts(text, /[\u3400-\u9fff]\s{1,2}[\u3400-\u9fff]/g),
    })
  }

  if (COMMON_DUPLICATE_WORD_RE.test(text)) {
    issues.push({
      id: 'duplicate-words',
      level: 'warning',
      title: '疑似重复字词',
      detail: '像“的的”“了了”这类常见重复字词被扫到了，建议再过一眼。',
      excerpts: collectExcerpts(text, COMMON_DUPLICATE_WORD_RE),
    })
  }
  COMMON_DUPLICATE_WORD_RE.lastIndex = 0

  const pairChecks: Array<[string, string, string]> = [
    ['（', '）', '中文圆括号'],
    ['(', ')', '英文圆括号'],
    ['【', '】', '方括号'],
    ['《', '》', '书名号'],
    ['“', '”', '双引号'],
    ['‘', '’', '单引号'],
  ]

  pairChecks.forEach(([open, close, label]) => {
    if (!hasUnbalancedPairs(text, open, close)) return
    issues.push({
      id: `pair-${label}`,
      level: 'warning',
      title: `${label}可能没成对`,
      detail: `检测到 ${open}${close} 的数量对不上，建议检查有没有漏掉开头或结尾。`,
    })
  })

  if (input.title.trim().length > 48) {
    issues.push({
      id: 'long-title',
      level: 'info',
      title: '标题偏长',
      detail: '标题已经比较长了，如果想让首页更利落，可以再收一收。',
    })
  }

  return issues.slice(0, 8)
}
