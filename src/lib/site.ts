export function getSiteUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    'http://localhost:3000'

  const normalizedUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
  return normalizedUrl.replace(/\/+$/, '')
}

export function getSiteName() {
  return process.env.NEXT_PUBLIC_SITE_NAME?.trim() || '我的小站'
}

export function absoluteUrl(pathname = '/') {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${getSiteUrl()}${normalizedPath}`
}
