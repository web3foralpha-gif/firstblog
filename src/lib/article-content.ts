import { marked } from 'marked'
import { parseRichStyle } from '@/lib/rich-text'

marked.setOptions({
  async: false,
  breaks: true,
  gfm: true,
})

const LEGACY_RICH_BLOCK_RE = /:::style\s*([^\n]*)\n([\s\S]*?)\n:::|::video\s+([^\n]+)/g

const LEGACY_SIZE_MAP = {
  base: '17px',
  lg: '19px',
  xl: '22px',
  '2xl': '26px',
} as const

const LEGACY_COLOR_MAP = {
  default: '#3d3530',
  amber: '#b85d0c',
  rose: '#a64963',
  emerald: '#22664a',
  slate: '#334155',
} as const

const ALLOWED_CLASS_PATTERNS = [
  'ql-align-center',
  'ql-align-right',
  'ql-align-justify',
  'ql-font-serif',
  'ql-font-sans',
  'ql-font-mono',
  'ql-font-song',
  'ql-font-hei',
  'ql-uploaded-video',
]

const ALLOWED_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'figure',
  'figcaption',
  'h2',
  'h3',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'source',
  'span',
  'strong',
  'u',
  'ul',
  'video',
])

const DROP_CONTENT_TAGS = new Set(['iframe', 'object', 'embed', 'script', 'style'])

const ALLOWED_ATTRIBUTES = new Map<string, Set<string>>([
  ['a', new Set(['href', 'target', 'rel'])],
  ['img', new Set(['src', 'alt', 'title'])],
  ['source', new Set(['src', 'type'])],
  ['video', new Set(['src', 'controls', 'playsinline', 'preload', 'poster'])],
  ['div', new Set(['class', 'style'])],
  ['span', new Set(['class', 'style'])],
  ['p', new Set(['class', 'style'])],
  ['h2', new Set(['class', 'style'])],
  ['h3', new Set(['class', 'style'])],
  ['li', new Set(['class', 'style'])],
  ['ul', new Set(['class', 'style'])],
  ['ol', new Set(['class', 'style'])],
  ['blockquote', new Set(['class', 'style'])],
  ['pre', new Set(['class', 'style'])],
  ['figure', new Set(['class'])],
  ['code', new Set(['class'])],
])

function sanitizeStyleValue(style: string) {
  const safeDeclarations = style
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [property, ...rest] = part.split(':')
      const name = property?.trim().toLowerCase()
      const value = rest.join(':').trim()
      if (!name || !value) return ''
      if (name === 'color' && (/^#[0-9a-f]{3,8}$/i.test(value) || /^rgb(a)?\([^)]+\)$/i.test(value))) {
        return `${name}:${value}`
      }
      if (name === 'font-size' && /^\d+(?:px|em|rem|%)$/.test(value)) {
        return `${name}:${value}`
      }
      if (name === 'text-align' && /^(left|center|right|justify)$/.test(value)) {
        return `${name}:${value}`
      }
      if (name === 'text-indent' && /^\d+(?:px|em|rem)$/.test(value)) {
        return `${name}:${value}`
      }
      return ''
    })
    .filter(Boolean)

  return safeDeclarations.join(';')
}

function sanitizeClassValue(className: string) {
  return className
    .split(/\s+/)
    .map(value => value.trim())
    .filter(value => value && ALLOWED_CLASS_PATTERNS.includes(value))
    .join(' ')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function renderMarkdown(content: string) {
  return String(marked.parse(content))
}

function sanitizeMediaUrl(url: string) {
  const trimmed = url.trim()
  if (/^https?:\/\//.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed
  }
  return ''
}

function buildLegacyStyleHtml(attrs: string, content: string) {
  const style = parseRichStyle(attrs)
  const font = style.font ?? 'serif'
  const size = style.size ?? 'base'
  const color = style.color ?? 'default'
  const align = style.align ?? 'left'
  const classNames = [
    font === 'serif' ? 'ql-font-serif' : '',
    font === 'sans' ? 'ql-font-sans' : '',
    font === 'mono' ? 'ql-font-mono' : '',
    align === 'center' ? 'ql-align-center' : '',
    align === 'right' ? 'ql-align-right' : '',
  ].filter(Boolean)

  const inlineStyle = [
    size !== 'base' ? `font-size:${LEGACY_SIZE_MAP[size]}` : '',
    color !== 'default' ? `color:${LEGACY_COLOR_MAP[color]}` : '',
  ].filter(Boolean)

  const classAttr = classNames.length > 0 ? ` class="${classNames.join(' ')}"` : ''
  const styleAttr = inlineStyle.length > 0 ? ` style="${inlineStyle.join(';')}"` : ''

  return `<div${classAttr}${styleAttr}>${renderMarkdown(content)}</div>`
}

export function isRichHtmlContent(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content)
}

export function legacyArticleToHtml(content: string) {
  const chunks: string[] = []
  let lastIndex = 0
  const matcher = new RegExp(LEGACY_RICH_BLOCK_RE)
  let match: RegExpExecArray | null

  while ((match = matcher.exec(content)) !== null) {
    const index = match.index ?? 0
    const rawBefore = content.slice(lastIndex, index)
    if (rawBefore.trim()) {
      chunks.push(renderMarkdown(rawBefore))
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      chunks.push(buildLegacyStyleHtml(match[1], match[2].trim()))
    } else if (match[3] !== undefined) {
      const safeUrl = sanitizeMediaUrl(match[3])
      if (safeUrl) {
        chunks.push(
          `<div class="ql-uploaded-video"><video controls playsinline preload="metadata" src="${escapeHtml(safeUrl)}"></video></div>`,
        )
      }
    }

    lastIndex = index + match[0].length
  }

  const rest = content.slice(lastIndex)
  if (rest.trim()) {
    chunks.push(renderMarkdown(rest))
  }

  return chunks.length > 0 ? chunks.join('\n') : renderMarkdown(content)
}

export function sanitizeArticleHtml(content: string) {
  if (typeof window === 'undefined') {
    return content
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/html')

  const sanitizeNode = (node: ParentNode) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove()
        return
      }

      if (child.nodeType !== Node.ELEMENT_NODE) return

      const element = child as HTMLElement
      const tagName = element.tagName.toLowerCase()

      if (DROP_CONTENT_TAGS.has(tagName)) {
        element.remove()
        return
      }

      if (!ALLOWED_TAGS.has(tagName)) {
        element.replaceWith(...Array.from(element.childNodes))
        sanitizeNode(node)
        return
      }

      Array.from(element.attributes).forEach(attribute => {
        const name = attribute.name.toLowerCase()
        const allowed = ALLOWED_ATTRIBUTES.get(tagName)
        if (!allowed?.has(name)) {
          element.removeAttribute(attribute.name)
        }
      })

      if (element.hasAttribute('class')) {
        const safeClassName = sanitizeClassValue(element.getAttribute('class') || '')
        if (safeClassName) {
          element.setAttribute('class', safeClassName)
        } else {
          element.removeAttribute('class')
        }
      }

      if (element.hasAttribute('style')) {
        const safeStyle = sanitizeStyleValue(element.getAttribute('style') || '')
        if (safeStyle) {
          element.setAttribute('style', safeStyle)
        } else {
          element.removeAttribute('style')
        }
      }

      if (tagName === 'a' && element.getAttribute('href')) {
        const href = element.getAttribute('href') || ''
        if (/^(https?:|mailto:|tel:|\/)/.test(href)) {
          element.setAttribute('target', '_blank')
          element.setAttribute('rel', 'noopener noreferrer')
        } else {
          element.removeAttribute('href')
        }
      }

      if ((tagName === 'img' || tagName === 'video' || tagName === 'source') && element.getAttribute('src')) {
        const src = element.getAttribute('src') || ''
        if (!/^(https?:\/\/|\/)/.test(src)) {
          element.removeAttribute('src')
        }
      }

      sanitizeNode(element)
    })
  }

  sanitizeNode(doc.body)
  return doc.body.innerHTML
}

function decodeEntities(value: string) {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

export function plainTextFromArticleContent(content: string) {
  const withoutHtml = content
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')

  return decodeEntities(withoutHtml)
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasMeaningfulArticleContent(content: string) {
  const normalized = content.trim()
  if (!normalized) return false

  if (isRichHtmlContent(normalized)) {
    const html = sanitizeArticleHtml(normalized)
    return plainTextFromArticleContent(html).length > 0 || /<(img|video|source)\b/i.test(html)
  }

  return (
    plainTextFromArticleContent(normalized).length > 0 ||
    /!\[[^\]]*]\([^)]+\)|::video\s+\S+/i.test(normalized)
  )
}
