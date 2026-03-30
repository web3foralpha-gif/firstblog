import { getSiteName, getSiteUrl } from './site'

const DEFAULT_OPENAI_API_BASE = 'https://api.openai.com/v1'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_OPENROUTER_MODEL = 'liquid/lfm-2.5-1.2b-instruct:free'

function trimOuterQuotes(value: string) {
  return value.replace(/^[`"'“”]+|[`"'“”]+$/g, '').trim()
}

function toAsciiHeaderValue(value: string, fallback: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]+/g, '')
    .trim()

  return normalized || fallback
}

export function normalizeMascotApiBase(value?: string) {
  const raw = trimOuterQuotes((value ?? '').trim())
  if (!raw) return DEFAULT_OPENAI_API_BASE

  const matchedUrl = raw.match(/https?:\/\/[^\s"'<>]+/i)?.[0]
  const normalized = trimOuterQuotes(
    (matchedUrl ?? raw.replace(/^(?:api\s*base\s*url|base\s*url|url|接口(?:地址)?|地址)\s*[:：]\s*/i, '').trim())
      .replace(/[),.;，。；]+$/g, '')
      .replace(/\/+$/g, ''),
  )

  if (/^openrouter$/i.test(normalized)) return DEFAULT_OPENROUTER_API_BASE
  if (!/^https?:\/\//i.test(normalized)) return DEFAULT_OPENAI_API_BASE
  return normalized
}

export function normalizeMascotModel(value?: string, apiBase?: string) {
  const normalizedBase = normalizeMascotApiBase(apiBase)
  const isOpenRouter = /openrouter\.ai/i.test(normalizedBase)
  const raw = trimOuterQuotes((value ?? '').trim().replace(/^(?:model|模型(?:名称)?)\s*[:：]\s*/i, ''))

  if (!raw) {
    return isOpenRouter ? DEFAULT_OPENROUTER_MODEL : DEFAULT_OPENAI_MODEL
  }

  if (isOpenRouter) {
    const lowered = raw.toLowerCase()
    if (lowered === 'openrouter' || lowered === 'free' || lowered === 'openrouter/free') {
      return DEFAULT_OPENROUTER_MODEL
    }
    if (lowered === 'auto') return 'openrouter/auto'
  }

  return raw
}

export function isMaskedSecret(value?: string) {
  const raw = (value ?? '').trim()
  return raw.length >= 8 && /[•*]/.test(raw)
}

export function buildMascotProviderHeaders(apiBase: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (/openrouter\.ai/i.test(apiBase)) {
    const siteUrl = getSiteUrl()
    const fallbackTitle = siteUrl.replace(/^https?:\/\//, '')
    headers['HTTP-Referer'] = siteUrl
    headers['X-Title'] = toAsciiHeaderValue(getSiteName(), fallbackTitle)
  }

  return headers
}
