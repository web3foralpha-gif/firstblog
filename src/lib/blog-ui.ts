export type BlogThemeVariant = 'warm' | 'festival' | 'memorial' | 'aurora' | 'ocean' | 'rose'

export type BlogLink = {
  label: string
  href: string
}

const BLOG_THEME_SET = new Set<BlogThemeVariant>(['warm', 'festival', 'memorial', 'aurora', 'ocean', 'rose'])

function normalizeLinkHref(rawHref: string) {
  const href = rawHref.trim()

  if (!href) return ''
  if (href.startsWith('/')) return href
  if (/^mailto:/i.test(href)) return href
  if (/^tel:/i.test(href)) return href
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href)) return `mailto:${href}`
  if (/^\+?[0-9()\-\s]{6,}$/.test(href)) return `tel:${href.replace(/\s+/g, '')}`
  if (/^https?:\/\//i.test(href)) return href

  return ''
}

export function normalizeBlogTheme(value: string | null | undefined): BlogThemeVariant {
  const normalized = value?.trim().toLowerCase() as BlogThemeVariant | undefined
  return normalized && BLOG_THEME_SET.has(normalized) ? normalized : 'warm'
}

export function parseBlogLinks(value: string | null | undefined): BlogLink[] {
  if (!value) return []

  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [rawLabel = '', rawHref = ''] = line.split(/[|｜]/, 2)
      const label = rawLabel.trim()
      const href = normalizeLinkHref(rawHref)

      if (!label || !href) return null
      return { label, href }
    })
    .filter((item): item is BlogLink => Boolean(item))
    .slice(0, 12)
}
