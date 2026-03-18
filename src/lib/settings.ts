import { prisma } from './prisma'
import { encrypt, decrypt } from './encrypt'
import { hasValidDatabaseUrl } from './database-url'

let hasLoggedSettingsFallback = false

// ── 所有设置的类型定义与默认值 ──────────────────────────────────────
export const SETTING_DEFS: Record<string, {
  type: 'string' | 'number' | 'boolean' | 'encrypted'
  default: string
  public: boolean
  label: string
}> = {
  // 基本信息
  'site.title':           { type: 'string',  default: '我的小站',          public: true,  label: '网站标题' },
  'site.description':     { type: 'string',  default: '记录生活，分享心情', public: true,  label: 'SEO 描述' },
  'site.pageSize':        { type: 'number',  default: '10',                public: false, label: '每页文章数' },
  'site.commentReview':   { type: 'boolean', default: 'true',              public: false, label: '评论需要审核' },
  'site.guestbookReview': { type: 'boolean', default: 'true',              public: false, label: '留言需要审核' },
  'admin.email':          { type: 'string',  default: process.env.ADMIN_EMAIL || '', public: false, label: '管理员邮箱' },
  'admin.passwordHash':   { type: 'encrypted', default: process.env.ADMIN_PASSWORD_HASH || '', public: false, label: '管理员密码 Hash' },

  // 关于我
  'about_content':        { type: 'string',  default: '',                   public: true,  label: '关于我页面内容' },

  // 支付
  'pay.enabled':          { type: 'boolean',   default: 'false', public: false, label: '开启打赏功能' },
  'pay.currency':         { type: 'string',    default: 'cny',   public: false, label: '货币代码' },
  'pay.stripePublicKey':  { type: 'string',    default: '',      public: false, label: 'Stripe 公钥' },
  'pay.stripeSecretKey':  { type: 'encrypted', default: '',      public: false, label: 'Stripe 私钥' },
  'pay.stripeWebhookKey': { type: 'encrypted', default: '',      public: false, label: 'Stripe Webhook 密钥' },

  // 互动文案
  'ui.pikaSaluteText':    { type: 'string', default: '忠诚！',       public: true, label: '皮卡丘悬停文字' },
  'ui.pikaClickText':     { type: 'string', default: '⚡ 电击！',    public: true, label: '皮卡丘点击文字（备选）' },
  'ui.pikaPhrases':       { type: 'string', default: '皮卡～皮卡丘！|你好呀～ ⚡|皮皮～！|电击！⚡⚡|皮卡丘！❤️|要一起玩吗？', public: true, label: '点击台词（| 分隔）' },
  'ui.sfWaterText':       { type: 'string', default: '滋润了！🌊',   public: true, label: '向日葵浇水反馈' },
  'ui.sfFertilizeText':   { type: 'string', default: '营养充足！✨', public: true, label: '向日葵施肥反馈' },
  'ui.sfSunText':         { type: 'string', default: '沐浴阳光！🌤', public: true, label: '向日葵晒太阳反馈' },
  'ui.sfDoneText':        { type: 'string', default: '你已经照顾过向日葵啦 🌸', public: true, label: '向日葵重复互动提示' },

  // AI 宠物
  'mascot.aiEnabled':       { type: 'boolean',   default: 'false',                     public: false, label: '启用 AI 对话' },
  'mascot.aiApiBase':       { type: 'string',    default: 'https://api.openai.com/v1', public: false, label: 'API Base URL' },
  'mascot.aiModel':         { type: 'string',    default: 'gpt-4o-mini',               public: false, label: '模型名称' },
  'mascot.aiApiKey':        { type: 'encrypted', default: '',                          public: false, label: 'API Key（加密存储）' },
  'mascot.systemPrompt':    { type: 'string',    default: '',                          public: false, label: '系统提示词（留空用默认）' },
  'mascot.chatEnabled':     { type: 'boolean',   default: 'true',                      public: true,  label: '显示聊天入口' },
  'mascot.chatPlaceholder': { type: 'string',    default: '问问皮卡丘…',              public: true,  label: '输入框占位文字' },
}

function buildDefaultSettings(): Record<string, string> {
  const map: Record<string, string> = {}

  for (const [key, def] of Object.entries(SETTING_DEFS)) {
    map[key] = def.default
  }

  return map
}

// ── 获取所有设置（解密，后台用）────────────────────────────────────
export async function getAllSettings(): Promise<Record<string, string>> {
  const map = buildDefaultSettings()
  const hasDatabaseUrl = hasValidDatabaseUrl(process.env.DATABASE_URL)

  if (!hasDatabaseUrl) {
    if (!hasLoggedSettingsFallback) {
      hasLoggedSettingsFallback = true
      console.warn('[settings] DATABASE_URL is missing or invalid, using default settings.')
    }
    return map
  }

  try {
    const rows = await prisma.setting.findMany()

    for (const row of rows) {
      const def = SETTING_DEFS[row.key]
      if (!def) continue
      map[row.key] = def.type === 'encrypted' ? decrypt(row.value) : row.value
    }
  } catch (error) {
    if (!hasLoggedSettingsFallback) {
      hasLoggedSettingsFallback = true
      console.warn('[settings] Database unavailable, using default settings.')
    }
  }

  return map
}

// ── 获取公开设置（前台用，不含敏感字段）────────────────────────────
export async function getPublicSettings(): Promise<Record<string, string>> {
  const all = await getAllSettings()
  const result: Record<string, string> = {}
  for (const [key, def] of Object.entries(SETTING_DEFS)) {
    if (def.public) result[key] = all[key]
  }
  return result
}

// ── 批量更新设置 ─────────────────────────────────────────────────────
export async function updateSettings(updates: Record<string, string>): Promise<void> {
  for (const [key, rawValue] of Object.entries(updates)) {
    const def = SETTING_DEFS[key]
    if (!def) continue

    let value = rawValue?.toString() ?? ''

    if (def.type === 'encrypted' && value === '') continue
    if (def.type === 'encrypted') value = encrypt(value)
    if (def.type === 'boolean') value = value === 'true' || value === '1' ? 'true' : 'false'
    if (def.type === 'number' && isNaN(Number(value))) continue

    await prisma.setting.upsert({
      where:  { key },
      update: { value, type: def.type },
      create: { key, value, type: def.type },
    })
  }
}

// ── 获取单个设置 ─────────────────────────────────────────────────────
export async function getSetting(key: string): Promise<string> {
  const all = await getAllSettings()
  return all[key] ?? SETTING_DEFS[key]?.default ?? ''
}
