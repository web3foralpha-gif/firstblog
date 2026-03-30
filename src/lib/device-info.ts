export type ParsedDeviceInfo = {
  type: 'bot' | 'mobile' | 'tablet' | 'desktop' | 'other'
  typeLabel: string
  model: string | null
  osName: string | null
  osVersion: string | null
  osLabel: string | null
  browserName: string | null
  browserVersion: string | null
  browserLabel: string | null
  summary: string
}

export type DeviceInfoPayload = {
  platform: string | null
  platformVersion: string | null
  model: string | null
  mobile: boolean | null
  brands: string[]
  screenWidth: number | null
  screenHeight: number | null
  viewportWidth: number | null
  viewportHeight: number | null
  pixelRatio: number | null
  colorDepth: number | null
  language: string | null
  languages: string[]
  timezone: string | null
  maxTouchPoints: number | null
  memoryGb: number | null
  cpuCores: number | null
  networkType: string | null
  networkDownlink: number | null
  networkRtt: number | null
  saveData: boolean | null
  standalone: boolean | null
}

export type DeviceDescription = {
  summary: string
  detail: string | null
  primary: string
  osLabel: string | null
  browserLabel: string | null
}

type MatchResult = {
  name: string | null
  version: string | null
}

const BOT_PATTERN = /(bot|crawler|spider|slurp|curl|wget|python-requests|headlesschrome|postmanruntime|insomnia)/i

function normalizeVersion(raw: string | null | undefined) {
  if (!raw) return null
  const normalized = raw.replace(/_/g, '.').trim()
  if (!normalized) return null
  const segments = normalized.split('.').filter(Boolean).slice(0, 2)
  return segments.length > 0 ? segments.join('.') : null
}

function formatVersionedLabel(name: string | null, version: string | null) {
  if (!name) return null
  return version ? `${name} ${version}` : name
}

function pickMatch(userAgent: string, matchers: Array<{ pattern: RegExp; name: string }>): MatchResult {
  for (const matcher of matchers) {
    const match = userAgent.match(matcher.pattern)
    if (match) {
      return {
        name: matcher.name,
        version: normalizeVersion(match[1] || null),
      }
    }
  }

  return {
    name: null,
    version: null,
  }
}

function detectBrowser(userAgent: string): MatchResult {
  return pickMatch(userAgent, [
    { pattern: /MicroMessenger\/([\d._]+)/i, name: '微信' },
    { pattern: /QQBrowser\/([\d._]+)/i, name: 'QQ 浏览器' },
    { pattern: /QQ\/([\d._]+)/i, name: 'QQ' },
    { pattern: /WeCom\/([\d._]+)/i, name: '企业微信' },
    { pattern: /EdgiOS\/([\d._]+)/i, name: 'Edge' },
    { pattern: /EdgA?\/([\d._]+)/i, name: 'Edge' },
    { pattern: /OPR\/([\d._]+)/i, name: 'Opera' },
    { pattern: /Opera\/([\d._]+)/i, name: 'Opera' },
    { pattern: /SamsungBrowser\/([\d._]+)/i, name: 'Samsung Internet' },
    { pattern: /UCBrowser\/([\d._]+)/i, name: 'UC 浏览器' },
    { pattern: /FxiOS\/([\d._]+)/i, name: 'Firefox' },
    { pattern: /Firefox\/([\d._]+)/i, name: 'Firefox' },
    { pattern: /CriOS\/([\d._]+)/i, name: 'Chrome' },
    { pattern: /Chrome\/([\d._]+)/i, name: 'Chrome' },
    { pattern: /Chromium\/([\d._]+)/i, name: 'Chromium' },
    { pattern: /Version\/([\d._]+).*Safari/i, name: 'Safari' },
  ])
}

function detectWindowsName(version: string | null) {
  switch (version) {
    case '10.0':
      return 'Windows 10/11'
    case '6.3':
      return 'Windows 8.1'
    case '6.2':
      return 'Windows 8'
    case '6.1':
      return 'Windows 7'
    default:
      return 'Windows'
  }
}

function detectOs(userAgent: string): MatchResult {
  const harmony = userAgent.match(/HarmonyOS(?:\s|\/)([\d._]+)/i)
  if (harmony) {
    return { name: 'HarmonyOS', version: normalizeVersion(harmony[1]) }
  }

  const windows = userAgent.match(/Windows NT ([\d.]+)/i)
  if (windows) {
    const version = normalizeVersion(windows[1])
    return { name: detectWindowsName(version), version: version === '10.0' ? null : version }
  }

  const android = userAgent.match(/Android ([\d.]+)/i)
  if (android) {
    return { name: 'Android', version: normalizeVersion(android[1]) }
  }

  const iphone = userAgent.match(/iPhone OS ([\d_]+)/i)
  if (iphone) {
    return { name: 'iOS', version: normalizeVersion(iphone[1]) }
  }

  const ipad = userAgent.match(/CPU OS ([\d_]+)/i)
  if (ipad && /iPad/i.test(userAgent)) {
    return { name: 'iPadOS', version: normalizeVersion(ipad[1]) }
  }

  const mac = userAgent.match(/Mac OS X ([\d_]+)/i)
  if (mac) {
    return { name: 'macOS', version: normalizeVersion(mac[1]) }
  }

  if (/CrOS/i.test(userAgent)) {
    return { name: 'ChromeOS', version: null }
  }

  if (/Linux/i.test(userAgent)) {
    return { name: 'Linux', version: null }
  }

  return { name: null, version: null }
}

function detectModel(userAgent: string) {
  const matchers = [
    /\biPhone\b/i,
    /\biPad\b/i,
    /\bPixel [A-Za-z0-9\s-]+\b/i,
    /\bSM-[A-Z0-9-]+\b/i,
    /\bHUAWEI[ A-Z0-9-]+\b/i,
    /\bHONOR[ A-Z0-9-]+\b/i,
    /\bRedmi[ A-Za-z0-9-]+\b/i,
    /\bMi [A-Za-z0-9-]+\b/i,
    /\bXiaomi [A-Za-z0-9-]+\b/i,
    /\bONEPLUS [A-Za-z0-9-]+\b/i,
    /\bOPPO [A-Za-z0-9-]+\b/i,
    /\bvivo [A-Za-z0-9-]+\b/i,
    /\bCPH\d{4}\b/i,
  ]

  for (const pattern of matchers) {
    const match = userAgent.match(pattern)
    if (match?.[0]) {
      return match[0].replace(/\s+/g, ' ').trim()
    }
  }

  if (/Macintosh/i.test(userAgent)) return 'Mac'
  return null
}

function detectType(userAgent: string) {
  if (BOT_PATTERN.test(userAgent)) return 'bot'
  if (/iPad|Tablet|Nexus 7|Nexus 9|SM-T|KF[A-Z]{2}WI/i.test(userAgent)) return 'tablet'
  if (/iPhone|Mobile|Phone|Android.+Mobile|Windows Phone|IEMobile/i.test(userAgent)) return 'mobile'
  if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) return 'tablet'
  if (/Windows NT|Macintosh|CrOS|Linux x86_64|X11/i.test(userAgent)) return 'desktop'
  return 'other'
}

function typeToLabel(type: ParsedDeviceInfo['type']) {
  switch (type) {
    case 'bot':
      return '爬虫 / 脚本'
    case 'mobile':
      return '手机'
    case 'tablet':
      return '平板'
    case 'desktop':
      return '桌面设备'
    default:
      return '其他设备'
  }
}

function sanitizeStringValue(value: unknown, maxLength = 80) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, maxLength)
  return trimmed || null
}

function sanitizeStringList(value: unknown, maxItems = 4, maxLength = 60) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => sanitizeStringValue(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems)
}

function sanitizeBooleanValue(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function sanitizeNumberValue(
  value: unknown,
  options: {
    min?: number
    max?: number
    digits?: number
  } = {},
) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const digits = options.digits ?? 0
  const factor = 10 ** digits
  const rounded = Math.round(value * factor) / factor
  const min = options.min ?? 0
  const max = options.max ?? 999999

  if (rounded < min || rounded > max) return null
  return rounded
}

function hasDevicePayloadValue(payload: DeviceInfoPayload) {
  return Object.values(payload).some(value => {
    if (Array.isArray(value)) return value.length > 0
    return value !== null
  })
}

function pickBrowserBrand(brands: string[]) {
  return brands.find(brand => !/^not/i.test(brand)) || brands[0] || null
}

function formatResolution(width: number | null, height: number | null, label: string) {
  if (!width || !height) return null
  return `${label} ${width}×${height}`
}

function formatNetworkType(type: string | null) {
  if (!type) return null
  switch (type.toLowerCase()) {
    case 'slow-2g':
      return '网络 slow-2g'
    case '2g':
      return '网络 2G'
    case '3g':
      return '网络 3G'
    case '4g':
      return '网络 4G'
    case 'wifi':
      return '网络 Wi-Fi'
    default:
      return `网络 ${type}`
  }
}

export function sanitizeDeviceInfo(input: unknown): DeviceInfoPayload | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null

  const source = input as Record<string, unknown>
  const payload: DeviceInfoPayload = {
    platform: sanitizeStringValue(source.platform),
    platformVersion: sanitizeStringValue(source.platformVersion),
    model: sanitizeStringValue(source.model),
    mobile: sanitizeBooleanValue(source.mobile),
    brands: sanitizeStringList(source.brands),
    screenWidth: sanitizeNumberValue(source.screenWidth, { min: 1, max: 20000 }),
    screenHeight: sanitizeNumberValue(source.screenHeight, { min: 1, max: 20000 }),
    viewportWidth: sanitizeNumberValue(source.viewportWidth, { min: 1, max: 20000 }),
    viewportHeight: sanitizeNumberValue(source.viewportHeight, { min: 1, max: 20000 }),
    pixelRatio: sanitizeNumberValue(source.pixelRatio, { min: 0.1, max: 10, digits: 2 }),
    colorDepth: sanitizeNumberValue(source.colorDepth, { min: 1, max: 128 }),
    language: sanitizeStringValue(source.language, 24),
    languages: sanitizeStringList(source.languages, 5, 24),
    timezone: sanitizeStringValue(source.timezone, 48),
    maxTouchPoints: sanitizeNumberValue(source.maxTouchPoints, { min: 0, max: 20 }),
    memoryGb: sanitizeNumberValue(source.memoryGb, { min: 0.1, max: 512, digits: 1 }),
    cpuCores: sanitizeNumberValue(source.cpuCores, { min: 1, max: 128 }),
    networkType: sanitizeStringValue(source.networkType, 16),
    networkDownlink: sanitizeNumberValue(source.networkDownlink, { min: 0, max: 10000, digits: 1 }),
    networkRtt: sanitizeNumberValue(source.networkRtt, { min: 0, max: 10000 }),
    saveData: sanitizeBooleanValue(source.saveData),
    standalone: sanitizeBooleanValue(source.standalone),
  }

  return hasDevicePayloadValue(payload) ? payload : null
}

export function parseUserAgent(userAgent?: string | null): ParsedDeviceInfo {
  const source = (userAgent || '').trim()
  if (!source) {
    return {
      type: 'other',
      typeLabel: '设备待识别',
      model: null,
      osName: null,
      osVersion: null,
      osLabel: null,
      browserName: null,
      browserVersion: null,
      browserLabel: null,
      summary: '设备待识别',
    }
  }

  const type = detectType(source)
  const browser = detectBrowser(source)
  const os = detectOs(source)
  const model = detectModel(source)
  const typeLabel = typeToLabel(type)
  const osLabel = formatVersionedLabel(os.name, os.version)
  const browserLabel = formatVersionedLabel(browser.name, browser.version)
  const summary = [model || typeLabel, osLabel, browserLabel].filter(Boolean).join(' · ') || typeLabel

  return {
    type,
    typeLabel,
    model,
    osName: os.name,
    osVersion: os.version,
    osLabel,
    browserName: browser.name,
    browserVersion: browser.version,
    browserLabel,
    summary,
  }
}

export function describeDevice(userAgent?: string | null, deviceInfo?: DeviceInfoPayload | null): DeviceDescription {
  const parsed = parseUserAgent(userAgent)
  const osLabel = deviceInfo?.platform
    ? formatVersionedLabel(deviceInfo.platform, sanitizeStringValue(deviceInfo.platformVersion))
    : parsed.osLabel
  const browserLabel = pickBrowserBrand(deviceInfo?.brands || []) || parsed.browserLabel
  const primary = deviceInfo?.model || parsed.model || parsed.typeLabel

  const summary = [primary, osLabel, browserLabel].filter(Boolean).join(' · ') || parsed.summary
  const detail = [
    formatResolution(deviceInfo?.viewportWidth ?? null, deviceInfo?.viewportHeight ?? null, '视口'),
    formatResolution(deviceInfo?.screenWidth ?? null, deviceInfo?.screenHeight ?? null, '屏幕'),
    deviceInfo?.language || null,
    deviceInfo?.timezone || null,
    formatNetworkType(deviceInfo?.networkType || null),
    deviceInfo?.saveData ? '省流量模式' : null,
  ].filter(Boolean).join(' · ') || null

  return {
    summary,
    detail,
    primary,
    osLabel,
    browserLabel,
  }
}
