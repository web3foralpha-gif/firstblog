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
    description: '统一处理站点标题、SEO、标签图标、全站主题和审核策略。',
    accent: 'from-sky-500/20 via-cyan-500/10 to-white',
    fields: [
      { key: 'site.title', label: '网站标题', placeholder: '纸杯的自留地' },
      { key: 'site.description', label: 'SEO 描述', kind: 'textarea', rows: 3, placeholder: '一句话说明网站主题' },
      { key: 'site.keywords', label: 'SEO 关键词', placeholder: 'Web3, 区块链, 博客' },
      { key: 'site.favicon', label: '标签页图标', kind: 'image', hint: '建议使用 256x256 以上的正方形 PNG、ICO 或 SVG。' },
      { key: 'blog.themeVariant', label: '前台主题', kind: 'select', options: THEME_OPTIONS },
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
    id: 'navigation',
    title: '导航与全站入口',
    description: '控制顶部导航、页脚入口和 RSS 是否对前台显示。',
    accent: 'from-violet-500/18 via-fuchsia-500/10 to-white',
    fields: [
      { key: 'nav.homeLabel', label: '首页名称' },
      { key: 'nav.archiveLabel', label: '归档名称' },
      { key: 'nav.aboutLabel', label: '关于名称' },
      { key: 'nav.guestbookLabel', label: '留言板名称' },
      { key: 'nav.rssLabel', label: 'RSS 名称' },
      { key: 'nav.showArchive', label: '显示归档入口', kind: 'toggle' },
      { key: 'nav.showAbout', label: '显示关于入口', kind: 'toggle' },
      { key: 'nav.showGuestbook', label: '显示留言板入口', kind: 'toggle' },
      { key: 'nav.showRss', label: '显示 RSS 入口', kind: 'toggle' },
    ],
  },
  {
    id: 'home',
    title: '首页呈现',
    description: '首页标题、搜索栏、角落卡片和快捷入口都在这里集中调整。',
    accent: 'from-violet-500/18 via-fuchsia-500/10 to-white',
    fields: [
      { key: 'blog.homeTitle', label: '首页标题', placeholder: '最新文章' },
      { key: 'blog.homeDescription', label: '首页副标题', kind: 'textarea', rows: 3 },
      { key: 'blog.searchPlaceholder', label: '搜索占位文字' },
      { key: 'blog.searchButtonLabel', label: '搜索按钮文字' },
      { key: 'blog.searchClearLabel', label: '清除按钮文字' },
      { key: 'blog.resultsSummaryTemplate', label: '结果统计文案', hint: '支持 {count} 占位符。' },
      { key: 'blog.filteredResultsSummaryTemplate', label: '筛选结果统计文案', hint: '支持 {query} 和 {count} 占位符。' },
      { key: 'blog.emptyStateText', label: '空状态文案', kind: 'textarea', rows: 2 },
      { key: 'blog.emptySearchText', label: '搜索无结果文案', kind: 'textarea', rows: 2 },
      { key: 'blog.showCornerCard', label: '显示小站角落卡片', kind: 'toggle' },
      { key: 'blog.cornerTitle', label: '小站角落标题' },
      { key: 'blog.cornerContent', label: '小站角落文案', kind: 'textarea', rows: 5, hint: '每行会显示为一段文字。' },
      { key: 'blog.showQuickLinksCard', label: '显示快速入口卡片', kind: 'toggle' },
      { key: 'blog.quickLinksTitle', label: '快速入口标题' },
      { key: 'blog.quickLinkAboutLabel', label: '入口一名称' },
      { key: 'blog.quickLinkAboutHref', label: '入口一链接', placeholder: '/about' },
      { key: 'blog.quickLinkGuestbookLabel', label: '入口二名称' },
      { key: 'blog.quickLinkGuestbookHref', label: '入口二链接', placeholder: '/guestbook' },
    ],
  },
  {
    id: 'archive',
    title: '归档页',
    description: '归档页标题、说明和按钮文案单独维护，不再和首页混在一起。',
    accent: 'from-blue-500/18 via-cyan-500/10 to-white',
    fields: [
      { key: 'archive.eyebrowLabel', label: '英文标签', placeholder: 'Archive' },
      { key: 'archive.pageTitle', label: '页面标题', placeholder: '文章归档' },
      { key: 'archive.pageDescription', label: '页面说明', kind: 'textarea', rows: 4 },
      { key: 'archive.backHomeLabel', label: '返回首页按钮' },
      { key: 'archive.rssButtonLabel', label: 'RSS 按钮文字' },
    ],
  },
  {
    id: 'guestbook',
    title: '留言板',
    description: '留言板页头、分隔标题和留言表单文案都可以单独维护。',
    accent: 'from-teal-500/18 via-emerald-500/10 to-white',
    fields: [
      { key: 'guestbook.metaDescription', label: 'SEO 描述', kind: 'textarea', rows: 3 },
      { key: 'guestbook.pageTitle', label: '页面标题' },
      { key: 'guestbook.pageSubtitle', label: '页面副标题' },
      { key: 'guestbook.messagesDividerLabel', label: '留言列表分隔标题' },
      { key: 'guestbook.emptyText', label: '空状态文案', kind: 'textarea', rows: 2 },
      { key: 'guestbook.formDividerLabel', label: '表单分隔标题' },
      { key: 'guestbook.formTitle', label: '表单标题' },
      { key: 'guestbook.formSubtitle', label: '表单说明' },
      { key: 'guestbook.nicknameLabel', label: '昵称标签' },
      { key: 'guestbook.nicknamePlaceholder', label: '昵称占位文字' },
      { key: 'guestbook.emailLabel', label: '邮箱标签' },
      { key: 'guestbook.emailPlaceholder', label: '邮箱占位文字' },
      { key: 'guestbook.emailPublicOnLabel', label: '公开邮箱提示' },
      { key: 'guestbook.emailPublicOffLabel', label: '隐藏邮箱提示' },
      { key: 'guestbook.emojiLabel', label: '心情标签' },
      { key: 'guestbook.contentLabel', label: '留言内容标签' },
      { key: 'guestbook.contentPlaceholder', label: '留言内容占位文字', kind: 'textarea', rows: 2 },
      { key: 'guestbook.submitLabel', label: '提交按钮文字' },
      { key: 'guestbook.submittingLabel', label: '提交中按钮文字' },
      { key: 'guestbook.successTitle', label: '成功标题' },
      { key: 'guestbook.successMessage', label: '成功提示', kind: 'textarea', rows: 2 },
      { key: 'guestbook.successActionLabel', label: '成功操作按钮文字' },
    ],
  },
  {
    id: 'footer',
    title: '页脚与友链',
    description: '页脚短句、英文标签和友情链接统一收纳，方便集中修改。',
    accent: 'from-stone-500/18 via-slate-500/10 to-white',
    fields: [
      { key: 'blog.footerEyebrow', label: '页脚英文标签' },
      { key: 'blog.footerText', label: '页脚文字', kind: 'textarea', rows: 3 },
      { key: 'blog.friendLinksTitle', label: '友链标题' },
      { key: 'blog.friendLinks', label: '友情链接', kind: 'textarea', rows: 5, hint: '每行一条，格式：名称|链接。' },
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
    id: 'article',
    title: '文章页互动',
    description: '文章详情页的评论区、互动栏、相关推荐和返回入口统一在这里维护。',
    accent: 'from-indigo-500/18 via-sky-500/10 to-white',
    fields: [
      { key: 'article.passwordBadgeLabel', label: '加密文章标签' },
      { key: 'article.paidBadgeLabel', label: '打赏文章标签' },
      { key: 'article.commentSectionTitle', label: '评论区标题' },
      { key: 'article.commentEmptyText', label: '评论区空状态文案', kind: 'textarea', rows: 2 },
      { key: 'article.commentFormTitle', label: '评论表单标题' },
      { key: 'article.commentNicknameLabel', label: '评论昵称标签' },
      { key: 'article.commentNicknamePlaceholder', label: '评论昵称占位文字' },
      { key: 'article.commentEmailLabel', label: '评论邮箱标签' },
      { key: 'article.commentEmailOptionalLabel', label: '评论邮箱可选提示' },
      { key: 'article.commentEmailPlaceholder', label: '评论邮箱占位文字' },
      { key: 'article.commentContentLabel', label: '评论内容标签' },
      { key: 'article.commentContentPlaceholder', label: '评论内容占位文字', kind: 'textarea', rows: 2 },
      { key: 'article.commentSubmitLabel', label: '评论提交按钮文字' },
      { key: 'article.commentSubmittingLabel', label: '评论提交中按钮文字' },
      { key: 'article.commentRequiredError', label: '评论必填错误文案' },
      { key: 'article.commentSuccessMessage', label: '评论成功提示', kind: 'textarea', rows: 2 },
      { key: 'article.commentErrorMessage', label: '评论失败提示' },
      { key: 'article.readStatLabel', label: '阅读统计名称' },
      { key: 'article.likeStatLabel', label: '点赞统计名称' },
      { key: 'article.shareStatLabel', label: '转发统计名称' },
      { key: 'article.commentStatLabel', label: '评论统计名称' },
      { key: 'article.likeActionLabel', label: '点赞按钮文字' },
      { key: 'article.likedActionLabel', label: '已点赞按钮文字' },
      { key: 'article.processingLabel', label: '处理中按钮文字' },
      { key: 'article.copyLinkActionLabel', label: '复制链接按钮文字' },
      { key: 'article.copyingLinkLabel', label: '复制链接中按钮文字' },
      { key: 'article.posterActionLabel', label: '生成海报按钮文字' },
      { key: 'article.posterGeneratingLabel', label: '生成海报中按钮文字' },
      { key: 'article.commentActionLabel', label: '去评论按钮文字' },
      { key: 'article.interactionHint', label: '互动栏提示文案', kind: 'textarea', rows: 3, hint: '支持 {title} 占位符。' },
      { key: 'article.sharePreviewTitle', label: '海报预览标题' },
      { key: 'article.sharePreviewSubtitle', label: '海报预览副标题' },
      { key: 'article.copyPosterActionLabel', label: '复制海报按钮文字' },
      { key: 'article.copyPosterCopyingLabel', label: '复制海报中按钮文字' },
      { key: 'article.closeLabel', label: '关闭按钮文字' },
      { key: 'article.posterMobileHint', label: '海报底部提示', kind: 'textarea', rows: 2 },
      { key: 'article.copyLinkSuccess', label: '复制链接成功提示' },
      { key: 'article.copyLinkError', label: '复制链接失败提示' },
      { key: 'article.posterGenerateSuccess', label: '海报生成成功提示', kind: 'textarea', rows: 2 },
      { key: 'article.posterGenerateError', label: '海报生成失败提示' },
      { key: 'article.copyPosterSuccess', label: '复制海报成功提示' },
      { key: 'article.copyPosterError', label: '复制海报失败提示' },
      { key: 'article.copyPosterUnsupportedError', label: '复制海报不支持提示', kind: 'textarea', rows: 2 },
      { key: 'article.likeError', label: '点赞失败提示' },
      { key: 'article.relatedEyebrow', label: '相关推荐英文标签' },
      { key: 'article.relatedTitle', label: '相关推荐标题' },
      { key: 'article.relatedArchiveLabel', label: '相关推荐归档入口文字' },
      { key: 'article.relatedPasswordBadgeLabel', label: '相关推荐加密标签' },
      { key: 'article.relatedPaidBadgeLabel', label: '相关推荐打赏标签' },
      { key: 'article.markdownBackLabel', label: 'Markdown 文章返回入口文字' },
      { key: 'article.updatedAtPrefix', label: '更新时间前缀' },
      { key: 'article.readingTimeSuffix', label: '阅读时长后缀' },
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
      { key: 'pay.paywallTitle', label: '付费解锁标题' },
      { key: 'pay.paywallDescription', label: '付费解锁说明', kind: 'textarea', rows: 2, hint: '支持 {price} 占位符。' },
      { key: 'pay.paywallHint', label: '付费解锁提示', kind: 'textarea', rows: 2 },
      { key: 'pay.paywallEmailPlaceholder', label: '付费解锁邮箱占位文字' },
      { key: 'pay.paywallErrorMessage', label: '付费解锁失败提示' },
      { key: 'pay.paywallSubmittingLabel', label: '付费解锁提交中按钮文字' },
      { key: 'pay.paywallSubmitLabel', label: '付费解锁提交按钮文字', hint: '支持 {price} 占位符。' },
      { key: 'pay.paywallProviderHint', label: '付费解锁底部提示' },
      { key: 'pay.successTitle', label: '支付成功页标题' },
      { key: 'pay.successUnlockedDescription', label: '支付成功页解锁提示', kind: 'textarea', rows: 2, hint: '支持 {title} 占位符。' },
      { key: 'pay.successPendingDescription', label: '支付成功页处理中提示', kind: 'textarea', rows: 2 },
      { key: 'pay.successEmailHint', label: '支付成功页邮箱提示', kind: 'textarea', rows: 2 },
      { key: 'pay.successReadNowLabel', label: '支付成功页立即阅读按钮文字' },
      { key: 'pay.successLinkNoticeLabel', label: '支付成功页专属链接提示' },
      { key: 'pay.successBackHomeLabel', label: '支付成功页返回首页按钮文字' },
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
      { key: 'ui.sfWaterLabel', label: '浇水按钮文字' },
      { key: 'ui.sfFertilizeLabel', label: '施肥按钮文字' },
      { key: 'ui.sfSunLabel', label: '晒太阳按钮文字' },
      { key: 'ui.sfWaterText', label: '浇水反馈' },
      { key: 'ui.sfFertilizeText', label: '施肥反馈' },
      { key: 'ui.sfSunText', label: '晒太阳反馈' },
      { key: 'ui.sfDoneText', label: '重复互动提示' },
      { key: 'ui.sfDoneHintText', label: '重复互动说明' },
      { key: 'ui.sfLoadingText', label: '加载文案' },
      { key: 'ui.sfLevelUpText', label: '升级提示' },
      { key: 'ui.sfTimelineTitle', label: '成长历程标题' },
      { key: 'ui.sfCareCountText', label: '照顾人数文案', hint: '支持 {count} 占位符。' },
      { key: 'ui.sfNextNeededText', label: '下一阶段人数文案', hint: '支持 {count} 占位符。' },
      { key: 'ui.sfUnavailableTitle', label: '停用标题' },
      { key: 'ui.sfUnavailableDescription', label: '停用说明', kind: 'textarea', rows: 3 },
      { key: 'ui.sfRestMessage', label: '休息提示', kind: 'textarea', rows: 3 },
      { key: 'ui.sfNetworkErrorText', label: '网络错误提示' },
      { key: 'ui.sfStageDescriptions', label: '阶段文案', kind: 'textarea', rows: 8, hint: '共 6 行，按阶段顺序显示。' },
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
      {
        key: 'mascot.aiApiBase',
        label: 'API Base URL',
        placeholder: 'https://openrouter.ai/api/v1',
        hint: 'OpenRouter 免费示例：`https://openrouter.ai/api/v1`。就算误填成“URL: https://...”现在也会自动纠正。',
      },
      {
        key: 'mascot.aiModel',
        label: '模型名称',
        placeholder: 'liquid/lfm-2.5-1.2b-instruct:free',
        hint: '推荐免费模型：`liquid/lfm-2.5-1.2b-instruct:free`。如果填成 `openrouter/free` 或 `openrouter`，系统也会自动替换到这个稳定模型。',
      },
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
  {
    id: 'system',
    title: '状态页',
    description: '404 等系统状态页的标题与引导按钮文案。',
    accent: 'from-zinc-500/18 via-slate-500/10 to-white',
    fields: [
      { key: 'system.notFoundTitle', label: '404 标题' },
      { key: 'system.notFoundDescription', label: '404 说明', kind: 'textarea', rows: 3 },
      { key: 'system.notFoundBackHomeLabel', label: '404 返回首页按钮文字' },
    ],
  },
]

export const ADMIN_SETTING_SECTION_MAP = Object.fromEntries(
  ADMIN_SETTING_SECTIONS.map(section => [section.id, section]),
) as Record<string, AdminSettingSection>
