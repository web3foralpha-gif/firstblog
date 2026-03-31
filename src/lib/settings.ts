import { prisma } from './prisma'
import { encrypt, decrypt } from './encrypt'
import { hasValidDatabaseUrl } from './database-url'
import { DEFAULT_ABOUT_CONTENT } from './content-defaults'

let hasLoggedSettingsFallback = false

// ── 所有设置的类型定义与默认值 ──────────────────────────────────────
export const SETTING_DEFS: Record<string, {
  type: 'string' | 'number' | 'boolean' | 'encrypted'
  default: string
  public: boolean
  label: string
}> = {
  // 基本信息
  'site.title':           { type: 'string',  default: '纸杯的自留地',          public: true,  label: '网站标题' },
  'site.description':     { type: 'string',  default: '一个记录日常、美食、方言文化和人生思考的个人博客，分享正在发生的小事与真实感悟。', public: true,  label: 'SEO 描述' },
  'site.keywords':        { type: 'string',  default: '个人博客,生活感悟,方言文化,辉县话,第一性原理,美食记录,人生思考',                  public: true,  label: 'SEO 关键词' },
  'site.favicon':         { type: 'string',  default: '',                  public: true,  label: '站点标签图标' },
  'site.googleVerification': { type: 'string', default: '',               public: false, label: 'Google 验证码' },
  'site.bingVerification': { type: 'string',  default: '',                public: false, label: 'Bing 验证码' },
  'site.baiduVerification': { type: 'string', default: '',                public: false, label: '百度验证码' },
  'site.yandexVerification': { type: 'string', default: '',               public: false, label: 'Yandex 验证码' },
  'site.pageSize':        { type: 'number',  default: '10',                public: false, label: '每页文章数' },
  'site.commentReview':   { type: 'boolean', default: 'true',              public: false, label: '评论需要审核' },
  'site.guestbookReview': { type: 'boolean', default: 'true',              public: false, label: '留言需要审核' },
  'blog.homeTitle':       { type: 'string',  default: '最新文章',          public: true,  label: '博客首页标题' },
  'blog.homeDescription': { type: 'string',  default: '记录生活小事、方言与人生感悟，也写下正在发生的真实心情。', public: true, label: '博客首页副标题' },
  'blog.cornerTitle':     { type: 'string',  default: '小站角落',          public: true,  label: '小站角落标题' },
  'blog.cornerContent':   { type: 'string',  default: '适合慢慢读几篇文章，发一会儿呆。\n右边的向日葵会记得每一次浇水、施肥和晒太阳。\n如果想留下点什么，留言板一直开着。', public: true, label: '小站角落文案' },
  'blog.quickLinksTitle': { type: 'string',  default: '快速入口',         public: true,  label: '快速入口标题' },
  'blog.quickLinkAboutLabel': { type: 'string', default: '关于我',        public: true,  label: '快速入口一名称' },
  'blog.quickLinkAboutHref':  { type: 'string', default: '/about',        public: true,  label: '快速入口一链接' },
  'blog.quickLinkGuestbookLabel': { type: 'string', default: '留言板',    public: true,  label: '快速入口二名称' },
  'blog.quickLinkGuestbookHref':  { type: 'string', default: '/guestbook', public: true, label: '快速入口二链接' },
  'blog.aboutTitle':     { type: 'string',  default: '关于我',            public: true,  label: '关于页标题' },
  'blog.aboutSubtitle':  { type: 'string',  default: '写给偶然路过这里的你。', public: true, label: '关于页副标题' },
  'blog.aboutAvatar':    { type: 'string',  default: '',                  public: true,  label: '关于页头像' },
  'blog.aboutCoverImage': { type: 'string', default: '',                  public: true,  label: '关于页头图' },
  'blog.aboutContent':   { type: 'string',  default: DEFAULT_ABOUT_CONTENT, public: false, label: '关于页内容' },
  'blog.aboutContactsTitle': { type: 'string', default: '社交与联系方式',  public: true,  label: '关于页联系区标题' },
  'blog.aboutContacts':  { type: 'string',  default: '',                  public: true,  label: '关于页联系列表' },
  'blog.footerText':      { type: 'string',  default: '用文字记录生活', public: true, label: '页脚文字' },
  'blog.friendLinksTitle': { type: 'string', default: '友情链接', public: true, label: '友链标题' },
  'blog.friendLinks':     { type: 'string',  default: '', public: true, label: '友情链接列表' },
  'blog.themeVariant':    { type: 'string',  default: 'warm', public: true, label: '前台主题' },
  'poster.headerLabel':   { type: 'string',  default: 'Article Poster', public: false, label: '海报顶部标签' },
  'poster.scanText':      { type: 'string',  default: '扫码阅读全文', public: false, label: '海报扫码提示' },
  'poster.footerDescription': {
    type: 'string',
    default: '这是一张文章分享海报，二维码将优先完整展示，扫码即可打开原文继续阅读。',
    public: false,
    label: '海报底部说明',
  },
  'poster.fontFamily':    { type: 'string',  default: '', public: false, label: '海报默认字体' },
  'analytics.ownerIpAllowlist': { type: 'string', default: '', public: false, label: '站长 IP 白名单' },
  'analytics.ownerDeviceAllowlist': { type: 'string', default: '', public: false, label: '站长设备白名单' },
  'admin.email':          { type: 'string',  default: process.env.ADMIN_EMAIL || '', public: false, label: '管理员邮箱' },
  'admin.passwordHash':   { type: 'encrypted', default: process.env.ADMIN_PASSWORD_HASH || '', public: false, label: '管理员密码 Hash' },

  // 支付
  'pay.enabled':          { type: 'boolean',   default: 'false', public: false, label: '开启打赏功能' },
  'pay.currency':         { type: 'string',    default: 'cny',   public: false, label: '货币代码' },
  'pay.stripePublicKey':  { type: 'string',    default: '',      public: false, label: 'Stripe 公钥' },
  'pay.stripeSecretKey':  { type: 'encrypted', default: '',      public: false, label: 'Stripe 私钥' },
  'pay.stripeWebhookKey': { type: 'encrypted', default: '',      public: false, label: 'Stripe Webhook 密钥' },
  'pay.cryptoEnabled':    { type: 'boolean',   default: 'false', public: false, label: '开启数字货币打赏' },
  'pay.cryptoNetworks':   { type: 'string',    default: 'USDT-TRC20|USDT-ERC20|BTC|ETH|SOL', public: false, label: '数字货币网络列表' },
  'pay.cryptoUsdCnyRate': { type: 'number',    default: '7.20',  public: false, label: 'USDT 参考汇率' },
  'pay.cryptoBTCAddress': { type: 'string',    default: '',      public: false, label: 'BTC 收款地址' },
  'pay.cryptoETHAddress': { type: 'string',    default: '',      public: false, label: 'ETH 收款地址' },
  'pay.cryptoSOLAddress': { type: 'string',    default: '',      public: false, label: 'SOL 收款地址' },
  'pay.cryptoUSDTTRC20Address': { type: 'string', default: '',   public: false, label: 'USDT-TRC20 收款地址' },
  'pay.cryptoUSDTERC20Address': { type: 'string', default: '',   public: false, label: 'USDT-ERC20 收款地址' },
  'pay.cryptoTips':       { type: 'string',    default: '转账后请提交交易哈希，博主确认后会发放解锁链接。', public: true, label: '数字货币打赏提示' },

  // 互动文案
  'ui.pikaSaluteText':    { type: 'string', default: '忠诚！',       public: true, label: '皮卡丘悬停文字' },
  'ui.pikaClickText':     { type: 'string', default: '⚡ 电击！',    public: true, label: '皮卡丘点击文字（备选）' },
  'ui.pikaPhrases':       { type: 'string', default: '皮卡～皮卡丘！|你好呀～ ⚡|皮皮～！|电击！⚡⚡|皮卡丘！❤️|要一起玩吗？', public: true, label: '点击台词（| 分隔）' },
  'ui.sfWaterText':       { type: 'string', default: '滋润了！🌊', public: true, label: '向日葵浇水反馈' },
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
  'mascot.panelLabel':      { type: 'string',    default: 'PIKACHU BUDDY',             public: true,  label: '对话面板英文标签' },
  'mascot.chatPlaceholder': { type: 'string',    default: '问问皮卡丘…',              public: true,  label: '输入框占位文字' },
  'mascot.mode':            { type: 'string',    default: 'twin',                      public: true,  label: '助手模式（pet/twin）' },
  'mascot.personaName':     { type: 'string',    default: '我的数字分身',              public: true,  label: '分身名称' },
  'mascot.panelTitle':      { type: 'string',    default: '网站宠物小助手',            public: true,  label: '对话面板标题' },
  'mascot.greeting':        { type: 'string',    default: '皮卡～ 我会在右下角陪着你，想聊文章、心情还是网站内容？', public: true, label: '欢迎语' },
  'mascot.quickPrompts':    { type: 'string',    default: '今天有什么新文章？|帮我推荐一篇文章|送我一句今天的鼓励', public: true, label: '快捷提问（| 分隔）' },
  'mascot.helperText':      { type: 'string',    default: '支持提问文章、页面功能和今日心情建议', public: true, label: '输入框下方提示' },
  'mascot.closeText':       { type: 'string',    default: '关闭',                      public: true,  label: '关闭按钮文字' },
  'mascot.sendText':        { type: 'string',    default: '发送',                      public: true,  label: '发送按钮文字' },
  'mascot.sendingText':     { type: 'string',    default: '思考中...',                 public: true,  label: '发送中按钮文字' },
  'mascot.typingText':      { type: 'string',    default: '皮卡正在组织语言…',         public: true,  label: '回复等待提示' },
  'mascot.identityProfile': { type: 'string',    default: '',                          public: false, label: '数字分身身份资料' },
  'mascot.knowledgeBase':   { type: 'string',    default: '',                          public: false, label: '数字分身知识库' },
  'mascot.replyStyle':      { type: 'string',    default: '自然、真诚、像真人，不要油腻，不要夸张，不知道就坦白。', public: false, label: '回复风格' },
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
    let hasAboutContentSetting = false

    for (const row of rows) {
      const def = SETTING_DEFS[row.key]
      if (!def) continue
      if (row.key === 'blog.aboutContent') hasAboutContentSetting = true
      map[row.key] = def.type === 'encrypted' ? decrypt(row.value) : row.value
    }

    if (!hasAboutContentSetting) {
      const legacyAbout = await prisma.siteSetting.findUnique({ where: { key: 'about_content' } })
      if (legacyAbout?.value?.trim()) {
        map['blog.aboutContent'] = legacyAbout.value
      }
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
