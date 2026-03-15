export const FONT_OPTIONS = [
  { value: 'serif', label: '衬线' },
  { value: 'sans', label: '无衬线' },
  { value: 'mono', label: '等宽' },
] as const

export const SIZE_OPTIONS = [
  { value: 'base', label: '常规' },
  { value: 'lg', label: '偏大' },
  { value: 'xl', label: '大字' },
  { value: '2xl', label: '强调大字' },
] as const

export const COLOR_OPTIONS = [
  { value: 'default', label: '默认墨色' },
  { value: 'amber', label: '暖橙' },
  { value: 'rose', label: '玫瑰' },
  { value: 'emerald', label: '青绿' },
  { value: 'slate', label: '冷灰蓝' },
] as const

export const ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
] as const

export type RichFont = (typeof FONT_OPTIONS)[number]['value']
export type RichSize = (typeof SIZE_OPTIONS)[number]['value']
export type RichColor = (typeof COLOR_OPTIONS)[number]['value']
export type RichAlign = (typeof ALIGN_OPTIONS)[number]['value']

export type RichStyle = {
  font?: RichFont
  size?: RichSize
  color?: RichColor
  align?: RichAlign
}

const DEFAULT_STYLE: Required<RichStyle> = {
  font: 'serif',
  size: 'base',
  color: 'default',
  align: 'left',
}

export function normalizeRichStyle(style: RichStyle): Required<RichStyle> {
  return {
    font: style.font ?? DEFAULT_STYLE.font,
    size: style.size ?? DEFAULT_STYLE.size,
    color: style.color ?? DEFAULT_STYLE.color,
    align: style.align ?? DEFAULT_STYLE.align,
  }
}

export function stringifyRichStyle(style: RichStyle) {
  const normalized = normalizeRichStyle(style)
  return Object.entries(normalized)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ')
}

export function buildStyleDirective(style: RichStyle, content: string) {
  return `:::style ${stringifyRichStyle(style)}\n${content}\n:::`
}

export function buildVideoDirective(url: string) {
  return `::video ${url}`
}

export function parseRichStyle(raw: string): RichStyle {
  const parsed: RichStyle = {}
  const matcher = /(font|size|color|align)=([a-z0-9-]+)/g
  let match: RegExpExecArray | null

  while ((match = matcher.exec(raw)) !== null) {
    const [, key, value] = match
    if (key === 'font' && FONT_OPTIONS.some(option => option.value === value)) parsed.font = value as RichFont
    if (key === 'size' && SIZE_OPTIONS.some(option => option.value === value)) parsed.size = value as RichSize
    if (key === 'color' && COLOR_OPTIONS.some(option => option.value === value)) parsed.color = value as RichColor
    if (key === 'align' && ALIGN_OPTIONS.some(option => option.value === value)) parsed.align = value as RichAlign
  }

  return normalizeRichStyle(parsed)
}
