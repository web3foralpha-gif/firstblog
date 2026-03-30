import { SHARED_FONT_OPTIONS } from '@/lib/shared-fonts'

export type AdminFieldOption = {
  label: string
  value: string
}

export type AdminSettingFieldKind =
  | 'text'
  | 'textarea'
  | 'image'
  | 'select'
  | 'toggle'
  | 'number'
  | 'email'
  | 'password'

export type AdminSettingField = {
  key: string
  label: string
  kind?: AdminSettingFieldKind
  hint?: string
  placeholder?: string
  rows?: number
  min?: number
  max?: number
  options?: AdminFieldOption[]
}

export type AdminSettingSection = {
  id: string
  title: string
  description: string
  accent: string
  fields: AdminSettingField[]
}

const THEME_OPTIONS: AdminFieldOption[] = [
  { label: '暖色日常', value: 'warm' },
  { label: '过年喜庆', value: 'festival' },
  { label: '悼念黑白', value: 'memorial' },
  { label: '极光梦境', value: 'aurora' },
  { label: '海盐蓝调', value: 'ocean' },
  { label: '玫瑰晚霞', value: 'rose' },
]

const CURRENCY_OPTIONS: AdminFieldOption[] = ['cny', 'usd', 'eur', 'jpy', 'hkd'].map(currency => ({
  label: currency.toUpperCase(),
  value: currency,
}))

export const ADMIN_SETTING_SECTIONS: AdminSettingSection[] = [
  {
    id: 'site',
    title: '站点身份',
    description: '统一处理站点标题、SEO、标签图标和审核策略。',
    accent: 'from-sky-500/20 via-cyan-500/10 to-white',
    fields: [
      { key: 'site.title', label: '网站标题', placeholder: '纸杯的自留地' },
      { key: 'site.description', label: 'SEO 描述', kind: 'textarea', rows: 3, placeholder: '一句话说明网站主题' },
      { key: 'site.keywords', label: 'SEO 关键词', placeholder: 'Web3, 区块链, 博客' },
      { key: 'site.favicon', label: '标签页图标', kind: 'image', hint: '建议使用 256x256 以上的正方形 PNG、ICO 或 SVG。' },
      { key: 'site.googleVerification', label: 'Google 验证码', placeholder: 'google-site-verification=...' },
      { key: 'site.bingVerification', label: 'Bing 验证码', placeholder: 'msvalidate.01 对应 content 值' },
      { key: 'site.baiduVerification', label: '百度验证码', placeholder: 'codeva-xxxxxxxx' },
      { key: 'site.yandexVerification', label: 'Yandex 验证码', placeholder: '可留空' },
      { key: 'site.pageSize', label: '每页文章数', kind: 'number', min: 1, max: 50 },
      { key: 'site.commentReview', label: '评论需要审核', kind: 'toggle' },
      { key: 'site.guestbookReview', label: '留言需要审核', kind: 'toggle' },
    ],
  },
  {
    id: 'blog',
    title: '首页与文章列表',
    description: '把博客首页、侧边入口和全站主题集中到一起。',
    accent: 'from-violet-500/18 via-fuchsia-500/10 to-white',
    fields: [
      { key: 'blog.homeTitle', label: '博客首页标题', placeholder: '博客文章' },
      { key: 'blog.homeDescription', label: '博客首页副标题', kind: 'textarea', rows: 3 },
      { key: 'blog.cornerTitle', label: '小站角落标题' },
      { key: 'blog.cornerContent', label: '小站角落文案', kind: 'textarea', rows: 5, hint: '每行会显示为一段文字。' },
      { key: 'blog.quickLinksTitle', label: '快速入口标题' },
      { key: 'blog.quickLinkAboutLabel', label: '入口一名称' },
      { key: 'blog.quickLinkAboutHref', label: '入口一链接', placeholder: '/about' },
      { key: 'blog.quickLinkGuestbookLabel', label: '入口二名称' },
      { key: 'blog.quickLinkGuestbookHref', label: '入口二链接', placeholder: '/guestbook' },
      { key: 'blog.footerText', label: '页脚文字' },
      { key: 'blog.friendLinksTitle', label: '友链标题' },
      { key: 'blog.friendLinks', label: '友情链接', kind: 'textarea', rows: 5, hint: '每行一条，格式：名称|链接。' },
      { key: 'blog.themeVariant', label: '前台主题', kind: 'select', options: THEME_OPTIONS },
    ],
  },
  {
    id: 'about',
    title: '关于页',
    description: '头像、头图、联系信息和正文都可以直接集中维护。',
    accent: 'from-amber-500/20 via-orange-500/10 to-white',
    fields: [
      { key: 'blog.aboutTitle', label: '页面标题' },
      { key: 'blog.aboutSubtitle', label: '页面副标题', placeholder: '写给偶然路过这里的你。' },
      { key: 'blog.aboutAvatar', label: '头像', kind: 'image', hint: '建议使用正方形图片。' },
      { key: 'blog.aboutCoverImage', label: '头图', kind: 'image', hint: '建议使用横向宽图。' },
      { key: 'blog.aboutContactsTitle', label: '联系区标题' },
      { key: 'blog.aboutContacts', label: '社交与联系方式', kind: 'textarea', rows: 6, hint: '每行一条，格式：名称|链接，可用 https://、mailto:、tel:' },
      { key: 'blog.aboutContent', label: '页面内容', kind: 'textarea', rows: 14, hint: '支持 Markdown。' },
    ],
  },
  {
    id: 'poster',
    title: '分享海报',
    description: '海报顶部、扫码说明和默认字体统一在这里调整。',
    accent: 'from-rose-500/18 via-pink-500/10 to-white',
    fields: [
      { key: 'poster.headerLabel', label: '顶部标签' },
      { key: 'poster.scanText', label: '扫码提示' },
      { key: 'poster.footerDescription', label: '底部说明', kind: 'textarea', rows: 4 },
      {
        key: 'poster.fontFamily',
        label: '海报默认字体',
        kind: 'select',
        options: SHARED_FONT_OPTIONS.map(option => ({ label: option.label, value: option.value })),
      },
    ],
  },
  {
    id: 'payments',
    title: '支付与打赏',
    description: '把法币、数字货币和提示文案一起收口。',
    accent: 'from-lime-500/18 via-yellow-500/10 to-white',
    fields: [
      { key: 'pay.enabled', label: '开启打赏功能', kind: 'toggle' },
      { key: 'pay.currency', label: '法币代码', kind: 'select', options: CURRENCY_OPTIONS },
      { key: 'pay.stripePublicKey', label: 'Stripe 公钥', placeholder: 'pk_live_...' },
      { key: 'pay.stripeSecretKey', label: 'Stripe 私钥', kind: 'password', hint: '留空代表保持现有值。' },
      { key: 'pay.stripeWebhookKey', label: 'Webhook 密钥', kind: 'password', hint: '留空代表保持现有值。' },
      { key: 'pay.cryptoEnabled', label: '开启数字货币打赏', kind: 'toggle' },
      { key: 'pay.cryptoNetworks', label: '数字货币网络', placeholder: 'USDT-TRC20|USDT-ERC20|BTC|ETH|SOL' },
      { key: 'pay.cryptoUsdCnyRate', label: 'USDT 参考汇率', kind: 'number', min: 1, max: 20 },
      { key: 'pay.cryptoBTCAddress', label: 'BTC 地址' },
      { key: 'pay.cryptoETHAddress', label: 'ETH 地址' },
      { key: 'pay.cryptoSOLAddress', label: 'SOL 地址' },
      { key: 'pay.cryptoUSDTTRC20Address', label: 'USDT-TRC20 地址' },
      { key: 'pay.cryptoUSDTERC20Address', label: 'USDT-ERC20 地址' },
      { key: 'pay.cryptoTips', label: '数字货币提示文案', kind: 'textarea', rows: 4 },
    ],
  },
  {
    id: 'interaction',
    title: '互动文案',
    description: '宠物、向日葵与访客互动文案统一调整。',
    accent: 'from-indigo-500/18 via-blue-500/10 to-white',
    fields: [
      { key: 'ui.pikaSaluteText', label: '宠物悬停文字' },
      { key: 'ui.pikaClickText', label: '宠物点击备选文案' },
      { key: 'ui.pikaPhrases', label: '宠物随机台词', kind: 'textarea', rows: 4, hint: '用 | 分隔。' },
      { key: 'ui.sfWaterText', label: '浇水反馈' },
      { key: 'ui.sfFertilizeText', label: '施肥反馈' },
      { key: 'ui.sfSunText', label: '晒太阳反馈' },
      { key: 'ui.sfDoneText', label: '重复互动提示' },
    ],
  },
  {
    id: 'analytics',
    title: '统计过滤',
    description: '把站长自己的 IP 和设备加入白名单，后续测试流量不再污染统计。',
    accent: 'from-emerald-500/18 via-teal-500/10 to-white',
    fields: [
      {
        key: 'analytics.ownerIpAllowlist',
        label: '站长 IP 白名单',
        kind: 'textarea',
        rows: 6,
        hint: '每行一个 IP。加入后，这些 IP 的访问、阅读、点赞、转发等行为都不再计入统计。',
        placeholder: '203.0.113.10',
      },
      {
        key: 'analytics.ownerDeviceAllowlist',
        label: '站长设备精确签名白名单',
        kind: 'textarea',
        rows: 6,
        hint: '每行一个系统生成的设备签名，采用精确匹配。不要手动填写 iPhone、Chrome 这类宽泛词，建议使用统计页的一键加入按钮。',
        placeholder: 'device_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI 分身',
    description: '聊天入口、人格信息和模型接入都集中到这一组。',
    accent: 'from-slate-500/18 via-zinc-500/10 to-white',
    fields: [
      { key: 'mascot.aiEnabled', label: '启用 AI 对话', kind: 'toggle' },
      { key: 'mascot.aiApiBase', label: 'API Base URL', placeholder: 'https://api.openai.com/v1' },
      { key: 'mascot.aiModel', label: '模型名称', placeholder: 'gpt-4o-mini' },
      { key: 'mascot.aiApiKey', label: 'API Key', kind: 'password', hint: '加密存储，留空保持现有值。' },
      { key: 'mascot.chatEnabled', label: '前台显示聊天入口', kind: 'toggle' },
      { key: 'mascot.panelLabel', label: '面板英文标签' },
      { key: 'mascot.panelTitle', label: '对话面板标题' },
      { key: 'mascot.chatPlaceholder', label: '输入框占位文字' },
      { key: 'mascot.greeting', label: '欢迎语', kind: 'textarea', rows: 3 },
      { key: 'mascot.quickPrompts', label: '快捷提问', kind: 'textarea', rows: 3, hint: '用 | 分隔。' },
      { key: 'mascot.helperText', label: '输入框下方提示' },
      { key: 'mascot.closeText', label: '关闭按钮文字' },
      { key: 'mascot.sendText', label: '发送按钮文字' },
      { key: 'mascot.sendingText', label: '发送中按钮文字' },
      { key: 'mascot.typingText', label: '回复等待提示' },
      { key: 'mascot.mode', label: '助手模式', kind: 'select', options: [
        { label: '宠物模式', value: 'pet' },
        { label: '数字分身', value: 'twin' },
      ] },
      { key: 'mascot.personaName', label: '分身名称' },
      { key: 'mascot.systemPrompt', label: '系统提示词', kind: 'textarea', rows: 6 },
      { key: 'mascot.identityProfile', label: '身份资料', kind: 'textarea', rows: 6 },
      { key: 'mascot.knowledgeBase', label: '知识库', kind: 'textarea', rows: 8 },
      { key: 'mascot.replyStyle', label: '回复风格', kind: 'textarea', rows: 4 },
    ],
  },
  {
    id: 'security',
    title: '安全与登录',
    description: '管理员账号、密码与登录安全项。',
    accent: 'from-red-500/18 via-orange-500/10 to-white',
    fields: [
      { key: 'admin.email', label: '管理员邮箱', kind: 'email', placeholder: 'admin@example.com' },
    ],
  },
]

export const ADMIN_SETTING_SECTION_MAP = Object.fromEntries(
  ADMIN_SETTING_SECTIONS.map(section => [section.id, section]),
) as Record<string, AdminSettingSection>
