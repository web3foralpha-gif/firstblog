import crypto from 'crypto'

// 成长阶段配置
export const STAGES = [
  { stage: 0, name: '种子', emoji: '🌰', threshold: 0,   nextThreshold: 10  },
  { stage: 1, name: '发芽', emoji: '🌱', threshold: 10,  nextThreshold: 100 },
  { stage: 2, name: '长茎', emoji: '🌿', threshold: 100, nextThreshold: 200 },
  { stage: 3, name: '长叶', emoji: '🍃', threshold: 200, nextThreshold: 300 },
  { stage: 4, name: '花骨朵', emoji: '🌼', threshold: 300, nextThreshold: 500 },
  { stage: 5, name: '盛开', emoji: '🌻', threshold: 500, nextThreshold: Infinity },
] as const

type Stage = (typeof STAGES)[number]

export type StageInfo = {
  stage: number
  name: string
  emoji: string
  totalCount: number
  progressCurrent: number  // 在当前阶段内的进度
  progressMax: number      // 当前阶段满格所需数
  progressPct: number      // 0-100
  isMax: boolean
  nextNeeded: number       // 距下一阶段还差多少人
}

export function getStageInfo(totalCount: number): StageInfo {
  // 找到当前阶段
  let current: Stage = STAGES[0]
  for (const s of STAGES) {
    if (totalCount >= s.threshold) current = s
    else break
  }

  const isMax = current.stage === 5
  const progressCurrent = totalCount - current.threshold
  const progressMax = isMax ? current.threshold : current.nextThreshold - current.threshold
  const progressPct = isMax ? 100 : Math.min(100, Math.round((progressCurrent / progressMax) * 100))
  const nextNeeded = isMax ? 0 : current.nextThreshold - totalCount

  return {
    stage: current.stage,
    name: current.name,
    emoji: current.emoji,
    totalCount,
    progressCurrent,
    progressMax,
    progressPct,
    isMax,
    nextNeeded,
  }
}

// IP → SHA-256 哈希（加环境变量盐，保护隐私）
export function hashIP(ip: string): string {
  const salt = process.env.SUNFLOWER_IP_SALT || 'sunflower-default-salt-change-me'
  return crypto.createHash('sha256').update(salt + ip).digest('hex')
}

// 从 Next.js 请求头提取真实 IP
export function getClientIP(req: Request): string {
  const headers = new Headers((req as any).headers)
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') || '127.0.0.1'
}
