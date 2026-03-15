type GeoInfo = {
  country: string
  region: string
  city: string
  isp: string
}

const geoCache = new Map<string, GeoInfo>()

export async function getGeoInfo(ip: string): Promise<GeoInfo | null> {
  // 本地/内网 IP 跳过解析
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: '本地', region: '开发环境', city: '本地', isp: '本地' }
  }

  // 命中缓存直接返回
  if (geoCache.has(ip)) return geoCache.get(ip)!

  try {
    // ip-api.com 免费接口，每分钟 45 次，无需 API key
    // lang=zh-CN 返回中文省市名
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,regionName,city,isp,status&lang=zh-CN`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null

    const data = await res.json()
    if (data.status !== 'success') return null

    const info: GeoInfo = {
      country: data.country || '',
      region:  data.regionName || '',
      city:    data.city || '',
      isp:     data.isp || '',
    }

    geoCache.set(ip, info)
    return info
  } catch {
    return null
  }
}

// 格式化成 "中国 · 广东省 · 广州市" 的形式
export function formatGeo(country?: string | null, region?: string | null, city?: string | null): string {
  const parts = [country, region, city].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '未知'
}
