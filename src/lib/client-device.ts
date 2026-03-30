import type { DeviceInfoPayload } from '@/lib/device-info'
import { sanitizeDeviceInfo } from '@/lib/device-info'

type NavigatorWithHints = Navigator & {
  userAgentData?: {
    mobile?: boolean
    platform?: string
    brands?: Array<{ brand?: string; version?: string }>
    getHighEntropyValues?: (
      hints: string[],
    ) => Promise<Record<string, unknown> & {
      model?: string
      platform?: string
      platformVersion?: string
      mobile?: boolean
      fullVersionList?: Array<{ brand?: string; version?: string }>
    }>
  }
  connection?: {
    effectiveType?: string
    downlink?: number
    rtt?: number
    saveData?: boolean
  }
  deviceMemory?: number
}

let cachedDeviceInfo: DeviceInfoPayload | null | undefined
let pendingDeviceInfo: Promise<DeviceInfoPayload | null> | null = null
let highEntropyResolved = false

function formatBrands(items: Array<{ brand?: string; version?: string }> | undefined) {
  if (!Array.isArray(items)) return []
  return items
    .map(item => {
      const brand = item.brand?.trim()
      if (!brand) return null
      const version = item.version?.trim()
      return version ? `${brand} ${version}` : brand
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, 4)
}

function readStandalone() {
  if (typeof window === 'undefined') return null
  const matchMediaStandalone = typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)').matches
    : false
  const navigatorStandalone =
    typeof navigator !== 'undefined' &&
    'standalone' in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  return matchMediaStandalone || navigatorStandalone
}

export function getClientDeviceInfoSync(): DeviceInfoPayload | null {
  if (cachedDeviceInfo !== undefined) return cachedDeviceInfo
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null

  const nav = navigator as NavigatorWithHints
  const hints = nav.userAgentData
  const info = sanitizeDeviceInfo({
    platform: hints?.platform || navigator.platform || null,
    mobile: typeof hints?.mobile === 'boolean' ? hints.mobile : null,
    brands: formatBrands(hints?.brands),
    screenWidth: window.screen?.width ?? null,
    screenHeight: window.screen?.height ?? null,
    viewportWidth: window.innerWidth || document.documentElement?.clientWidth || null,
    viewportHeight: window.innerHeight || document.documentElement?.clientHeight || null,
    pixelRatio: window.devicePixelRatio || null,
    colorDepth: window.screen?.colorDepth ?? null,
    language: navigator.language || null,
    languages: Array.isArray(navigator.languages) ? navigator.languages.slice(0, 5) : [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    memoryGb: nav.deviceMemory ?? null,
    cpuCores: navigator.hardwareConcurrency || null,
    networkType: nav.connection?.effectiveType || null,
    networkDownlink: nav.connection?.downlink ?? null,
    networkRtt: nav.connection?.rtt ?? null,
    saveData: nav.connection?.saveData ?? null,
    standalone: readStandalone(),
  })

  cachedDeviceInfo = info
  return info
}

export async function collectClientDeviceInfo(): Promise<DeviceInfoPayload | null> {
  if (cachedDeviceInfo !== undefined && highEntropyResolved) return cachedDeviceInfo
  if (pendingDeviceInfo) return pendingDeviceInfo

  const initial = getClientDeviceInfoSync()
  if (typeof navigator === 'undefined') return initial

  const nav = navigator as NavigatorWithHints
  const getHighEntropyValues = nav.userAgentData?.getHighEntropyValues
  if (!getHighEntropyValues) {
    highEntropyResolved = true
    return initial
  }

  pendingDeviceInfo = (async () => {
    try {
      const highEntropy = await getHighEntropyValues.call(nav.userAgentData, [
        'model',
        'platform',
        'platformVersion',
        'mobile',
        'fullVersionList',
      ])
      const highEntropyBrands = formatBrands(highEntropy.fullVersionList)

      const enriched = sanitizeDeviceInfo({
        ...initial,
        platform: highEntropy.platform || initial?.platform || null,
        platformVersion: typeof highEntropy.platformVersion === 'string' ? highEntropy.platformVersion : null,
        model: typeof highEntropy.model === 'string' ? highEntropy.model : null,
        mobile: typeof highEntropy.mobile === 'boolean' ? highEntropy.mobile : initial?.mobile ?? null,
        brands: highEntropyBrands.length > 0 ? highEntropyBrands : initial?.brands || [],
      })

      cachedDeviceInfo = enriched
      highEntropyResolved = true
      return enriched
    } catch {
      cachedDeviceInfo = initial
      highEntropyResolved = true
      return initial
    } finally {
      pendingDeviceInfo = null
    }
  })()

  return pendingDeviceInfo
}
