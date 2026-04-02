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
  'nav.homeLabel':        { type: 'string',  default: '首页',              public: true,  label: '导航-首页名称' },
  'nav.archiveLabel':     { type: 'string',  default: '归档',              public: true,  label: '导航-归档名称' },
  'nav.aboutLabel':       { type: 'string',  default: '关于',              public: true,  label: '导航-关于名称' },
  'nav.guestbookLabel':   { type: 'string',  default: '留言板',            public: true,  label: '导航-留言板名称' },
  'nav.rssLabel':         { type: 'string',  default: 'RSS',               public: true,  label: '导航-RSS 名称' },
  'nav.showArchive':      { type: 'boolean', default: 'true',              public: true,  label: '显示归档导航' },
  'nav.showAbout':        { type: 'boolean', default: 'true',              public: true,  label: '显示关于导航' },
  'nav.showGuestbook':    { type: 'boolean', default: 'true',              public: true,  label: '显示留言板导航' },
  'nav.showRss':          { type: 'boolean', default: 'true',              public: true,  label: '显示 RSS 入口' },
  'blog.homeTitle':       { type: 'string',  default: '最新文章',          public: true,  label: '博客首页标题' },
  'blog.homeDescription': { type: 'string',  default: '记录生活小事、方言与人生感悟，也写下正在发生的真实心情。', public: true, label: '博客首页副标题' },
  'blog.searchPlaceholder': { type: 'string', default: '搜标题、摘要、关键词…', public: true, label: '首页搜索占位文字' },
  'blog.searchButtonLabel': { type: 'string', default: '搜索',            public: true,  label: '首页搜索按钮文字' },
  'blog.searchClearLabel':  { type: 'string', default: '清除',            public: true,  label: '首页清除按钮文字' },
  'blog.resultsSummaryTemplate': { type: 'string', default: '共 {count} 篇', public: true, label: '首页结果统计文案' },
  'blog.filteredResultsSummaryTemplate': { type: 'string', default: '当前筛选：{query} · 共 {count} 篇', public: true, label: '首页筛选结果统计文案' },
  'blog.emptyStateText':    { type: 'string', default: '还没有公开文章，过几天再来看看吧。', public: true, label: '首页空状态文案' },
  'blog.emptySearchText':   { type: 'string', default: '暂时没有匹配这组关键词的文章。', public: true, label: '首页搜索无结果文案' },
  'blog.showCornerCard':    { type: 'boolean', default: 'true',          public: true,  label: '显示小站角落卡片' },
  'blog.showQuickLinksCard': { type: 'boolean', default: 'true',         public: true,  label: '显示快速入口卡片' },
  'blog.cornerTitle':     { type: 'string',  default: '小站角落',          public: true,  label: '小站角落标题' },
  'blog.cornerContent':   { type: 'string',  default: '适合慢慢读几篇文章，发一会儿呆。\n右边的向日葵会记得每一次浇水、施肥和晒太阳。\n如果想留下点什么，留言板一直开着。', public: true, label: '小站角落文案' },
  'blog.quickLinksTitle': { type: 'string',  default: '快速入口',         public: true,  label: '快速入口标题' },
  'blog.quickLinkAboutLabel': { type: 'string', default: '关于我',        public: true,  label: '快速入口一名称' },
  'blog.quickLinkAboutHref':  { type: 'string', default: '/about',        public: true,  label: '快速入口一链接' },
  'blog.quickLinkGuestbookLabel': { type: 'string', default: '留言板',    public: true,  label: '快速入口二名称' },
  'blog.quickLinkGuestbookHref':  { type: 'string', default: '/guestbook', public: true, label: '快速入口二链接' },
  'archive.eyebrowLabel': { type: 'string',  default: 'Archive',          public: true,  label: '归档页英文标签' },
  'archive.pageTitle':    { type: 'string',  default: '文章归档',         public: true,  label: '归档页标题' },
  'archive.pageDescription': { type: 'string', default: '这里按时间整理所有公开文章。想按主题找内容，也可以去首页直接搜关键词。', public: true, label: '归档页说明' },
  'archive.backHomeLabel': { type: 'string', default: '返回首页',         public: true,  label: '归档页返回按钮文字' },
  'archive.rssButtonLabel': { type: 'string', default: 'RSS 订阅',        public: true,  label: '归档页 RSS 按钮文字' },
  'guestbook.metaDescription': { type: 'string', default: '访客可以在这里留下公开留言、足迹和问候。', public: true, label: '留言板 SEO 描述' },
  'guestbook.pageTitle':   { type: 'string',  default: '留言板',          public: true,  label: '留言板标题' },
  'guestbook.pageSubtitle': { type: 'string', default: '大家留下的足迹，匿名、真实', public: true, label: '留言板副标题' },
  'guestbook.messagesDividerLabel': { type: 'string', default: '大家说的话', public: true, label: '留言列表分隔标题' },
  'guestbook.emptyText':   { type: 'string',  default: '还没有留言，往下写下第一句话吧', public: true, label: '留言板空状态文案' },
  'guestbook.formDividerLabel': { type: 'string', default: '写下你的留言', public: true, label: '留言表单分隔标题' },
  'guestbook.formTitle':   { type: 'string',  default: '写下你的留言',     public: true,  label: '留言表单标题' },
  'guestbook.formSubtitle': { type: 'string', default: '审核通过后公开展示', public: true, label: '留言表单说明' },
  'guestbook.nicknameLabel': { type: 'string', default: '昵称 *',         public: true,  label: '留言昵称标签' },
  'guestbook.nicknamePlaceholder': { type: 'string', default: '你的名字', public: true, label: '留言昵称占位文字' },
  'guestbook.emailLabel':  { type: 'string',  default: '邮箱（可选）',    public: true,  label: '留言邮箱标签' },
  'guestbook.emailPlaceholder': { type: 'string', default: 'your@email.com', public: true, label: '留言邮箱占位文字' },
  'guestbook.emailPublicOnLabel': { type: 'string', default: '公开邮箱（其他访客可见）', public: true, label: '公开邮箱提示' },
  'guestbook.emailPublicOffLabel': { type: 'string', default: '不公开邮箱（仅博主可见）', public: true, label: '隐藏邮箱提示' },
  'guestbook.emojiLabel':  { type: 'string',  default: '选个心情（可选）', public: true,  label: '留言心情标签' },
  'guestbook.contentLabel': { type: 'string', default: '留言内容 *',       public: true,  label: '留言内容标签' },
  'guestbook.contentPlaceholder': { type: 'string', default: '说点什么吧 ✍️', public: true, label: '留言内容占位文字' },
  'guestbook.submitLabel': { type: 'string',  default: '发布留言 ✨',      public: true,  label: '留言提交按钮文字' },
  'guestbook.submittingLabel': { type: 'string', default: '提交中…',      public: true,  label: '留言提交中按钮文字' },
  'guestbook.successTitle': { type: 'string', default: '留言已收到！',     public: true,  label: '留言成功标题' },
  'guestbook.successMessage': { type: 'string', default: '留言已提交，审核后会展示在留言板', public: true, label: '留言成功提示' },
  'guestbook.successActionLabel': { type: 'string', default: '再写一条',   public: true,  label: '留言成功操作按钮文字' },
  'blog.aboutTitle':     { type: 'string',  default: '关于我',            public: true,  label: '关于页标题' },
  'blog.aboutSubtitle':  { type: 'string',  default: '写给偶然路过这里的你。', public: true, label: '关于页副标题' },
  'blog.aboutAvatar':    { type: 'string',  default: '',                  public: true,  label: '关于页头像' },
  'blog.aboutCoverImage': { type: 'string', default: '',                  public: true,  label: '关于页头图' },
  'blog.aboutContent':   { type: 'string',  default: DEFAULT_ABOUT_CONTENT, public: false, label: '关于页内容' },
  'blog.aboutContactsTitle': { type: 'string', default: '社交与联系方式',  public: true,  label: '关于页联系区标题' },
  'blog.aboutContacts':  { type: 'string',  default: '',                  public: true,  label: '关于页联系列表' },
  'blog.footerEyebrow':   { type: 'string',  default: 'Footer Note',      public: true,  label: '页脚英文标签' },
  'blog.footerText':      { type: 'string',  default: '用文字记录生活', public: true, label: '页脚文字' },
  'blog.friendLinksTitle': { type: 'string', default: '友情链接', public: true, label: '友链标题' },
  'blog.friendLinks':     { type: 'string',  default: '', public: true, label: '友情链接列表' },
  'blog.themeVariant':    { type: 'string',  default: 'warm', public: true, label: '前台主题' },
  'article.passwordBadgeLabel': { type: 'string', default: '🔒 加密文章', public: true, label: '文章加密标签' },
  'article.paidBadgeLabel': { type: 'string', default: '💰 打赏文章', public: true, label: '文章打赏标签' },
  'article.commentSectionTitle': { type: 'string', default: '评论', public: true, label: '评论区标题' },
  'article.commentEmptyText': { type: 'string', default: '还没有评论，来说第一句话吧 ✍️', public: true, label: '评论区空状态文案' },
  'article.commentFormTitle': { type: 'string', default: '留下你的足迹', public: true, label: '评论表单标题' },
  'article.commentNicknameLabel': { type: 'string', default: '昵称 *', public: true, label: '评论昵称标签' },
  'article.commentNicknamePlaceholder': { type: 'string', default: '你的名字', public: true, label: '评论昵称占位文字' },
  'article.commentEmailLabel': { type: 'string', default: '邮箱', public: true, label: '评论邮箱标签' },
  'article.commentEmailOptionalLabel': { type: 'string', default: '（可选）', public: true, label: '评论邮箱可选提示' },
  'article.commentEmailPlaceholder': { type: 'string', default: 'your@email.com', public: true, label: '评论邮箱占位文字' },
  'article.commentContentLabel': { type: 'string', default: '评论 *', public: true, label: '评论内容标签' },
  'article.commentContentPlaceholder': { type: 'string', default: '说点什么吧…', public: true, label: '评论内容占位文字' },
  'article.commentSubmitLabel': { type: 'string', default: '发表评论', public: true, label: '评论提交按钮文字' },
  'article.commentSubmittingLabel': { type: 'string', default: '提交中…', public: true, label: '评论提交中按钮文字' },
  'article.commentRequiredError': { type: 'string', default: '请填写昵称和评论内容', public: true, label: '评论必填错误文案' },
  'article.commentSuccessMessage': { type: 'string', default: '评论已提交，审核通过后即可显示 🎉', public: true, label: '评论成功提示' },
  'article.commentErrorMessage': { type: 'string', default: '提交失败，请稍后重试', public: true, label: '评论失败提示' },
  'article.readStatLabel': { type: 'string', default: '阅读', public: true, label: '文章统计-阅读名称' },
  'article.likeStatLabel': { type: 'string', default: '点赞', public: true, label: '文章统计-点赞名称' },
  'article.shareStatLabel': { type: 'string', default: '转发', public: true, label: '文章统计-转发名称' },
  'article.commentStatLabel': { type: 'string', default: '评论', public: true, label: '文章统计-评论名称' },
  'article.likeActionLabel': { type: 'string', default: '点赞', public: true, label: '文章点赞按钮文字' },
  'article.likedActionLabel': { type: 'string', default: '已点赞', public: true, label: '文章已点赞按钮文字' },
  'article.processingLabel': { type: 'string', default: '处理中…', public: true, label: '文章处理中按钮文字' },
  'article.copyLinkActionLabel': { type: 'string', default: '复制链接', public: true, label: '复制链接按钮文字' },
  'article.copyingLinkLabel': { type: 'string', default: '复制中…', public: true, label: '复制链接中按钮文字' },
  'article.posterActionLabel': { type: 'string', default: '生成海报', public: true, label: '生成海报按钮文字' },
  'article.posterGeneratingLabel': { type: 'string', default: '生成中…', public: true, label: '生成海报中按钮文字' },
  'article.commentActionLabel': { type: 'string', default: '去评论', public: true, label: '去评论按钮文字' },
  'article.interactionHint': { type: 'string', default: '《{title}》的阅读、点赞、转发和评论都会进入后台互动统计。', public: true, label: '互动栏提示文案' },
  'article.sharePreviewTitle': { type: 'string', default: '文章海报预览', public: true, label: '海报预览标题' },
  'article.sharePreviewSubtitle': { type: 'string', default: '可先预览，再自行复制或保存', public: true, label: '海报预览副标题' },
  'article.copyPosterActionLabel': { type: 'string', default: '复制海报', public: true, label: '复制海报按钮文字' },
  'article.copyPosterCopyingLabel': { type: 'string', default: '复制中…', public: true, label: '复制海报中按钮文字' },
  'article.closeLabel': { type: 'string', default: '关闭', public: true, label: '通用关闭按钮文字' },
  'article.posterMobileHint': { type: 'string', default: '移动端可长按海报保存，桌面端可右键另存为。', public: true, label: '海报预览底部提示' },
  'article.copyLinkSuccess': { type: 'string', default: '文章链接已复制，去转发吧。', public: true, label: '复制链接成功提示' },
  'article.copyLinkError': { type: 'string', default: '复制链接失败，请稍后重试。', public: true, label: '复制链接失败提示' },
  'article.posterGenerateSuccess': { type: 'string', default: '分享海报已生成，可预览后自行复制或保存。', public: true, label: '海报生成成功提示' },
  'article.posterGenerateError': { type: 'string', default: '分享图生成失败', public: true, label: '海报生成失败提示' },
  'article.copyPosterSuccess': { type: 'string', default: '海报已复制到剪贴板。', public: true, label: '复制海报成功提示' },
  'article.copyPosterError': { type: 'string', default: '复制海报失败，请稍后重试。', public: true, label: '复制海报失败提示' },
  'article.copyPosterUnsupportedError': { type: 'string', default: '当前浏览器不支持复制图片，请长按或右键保存。', public: true, label: '复制海报不支持提示' },
  'article.likeError': { type: 'string', default: '点赞失败', public: true, label: '点赞失败提示' },
  'article.relatedEyebrow': { type: 'string', default: 'More', public: true, label: '相关推荐英文标签' },
  'article.relatedTitle': { type: 'string', default: '继续阅读', public: true, label: '相关推荐标题' },
  'article.relatedArchiveLabel': { type: 'string', default: '时间归档 →', public: true, label: '相关推荐归档入口文字' },
  'article.relatedPasswordBadgeLabel': { type: 'string', default: '🔒 加密', public: true, label: '相关推荐加密标签' },
  'article.relatedPaidBadgeLabel': { type: 'string', default: '💰 打赏', public: true, label: '相关推荐打赏标签' },
  'article.markdownBackLabel': { type: 'string', default: '← 返回首页', public: true, label: 'Markdown 文章返回入口文字' },
  'article.updatedAtPrefix': { type: 'string', default: '更新于', public: true, label: '文章更新时间前缀' },
  'article.readingTimeSuffix': { type: 'string', default: '分钟阅读', public: true, label: '阅读时长后缀' },
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
  'pay.paywallTitle':     { type: 'string',    default: '打赏解锁', public: true, label: '付费解锁标题' },
  'pay.paywallDescription': { type: 'string', default: '本文需要打赏 ¥{price} 解锁', public: true, label: '付费解锁说明' },
  'pay.paywallHint':      { type: 'string',    default: '支付成功后将向你的邮箱发送永久访问链接', public: true, label: '付费解锁提示' },
  'pay.paywallEmailPlaceholder': { type: 'string', default: '你的邮箱（用于接收链接）', public: true, label: '付费解锁邮箱占位文字' },
  'pay.paywallErrorMessage': { type: 'string', default: '跳转失败，请稍后重试', public: true, label: '付费解锁失败提示' },
  'pay.paywallSubmittingLabel': { type: 'string', default: '跳转支付中…', public: true, label: '付费解锁提交中按钮文字' },
  'pay.paywallSubmitLabel': { type: 'string', default: '打赏 ¥{price} 解锁 →', public: true, label: '付费解锁提交按钮文字' },
  'pay.paywallProviderHint': { type: 'string', default: '由 Stripe 提供安全支付', public: true, label: '付费解锁底部提示' },
  'pay.successTitle':     { type: 'string',    default: '感谢你的支持！', public: true, label: '支付成功页标题' },
  'pay.successUnlockedDescription': { type: 'string', default: '文章《{title}》已为你解锁', public: true, label: '支付成功页解锁提示' },
  'pay.successPendingDescription': { type: 'string', default: '支付正在处理中，链接将很快发送到你的邮箱。', public: true, label: '支付成功页处理中提示' },
  'pay.successEmailHint': { type: 'string',    default: '访问链接已发送到你的邮箱，请务必保存以便下次访问。', public: true, label: '支付成功页邮箱提示' },
  'pay.successReadNowLabel': { type: 'string', default: '立即阅读 →', public: true, label: '支付成功页立即阅读按钮文字' },
  'pay.successLinkNoticeLabel': { type: 'string', default: '你的专属访问链接（请收藏）：', public: true, label: '支付成功页专属链接提示' },
  'pay.successBackHomeLabel': { type: 'string', default: '← 返回首页', public: true, label: '支付成功页返回首页按钮文字' },

  // 互动文案
  'ui.pikaSaluteText':    { type: 'string', default: '忠诚！',       public: true, label: '皮卡丘悬停文字' },
  'ui.pikaClickText':     { type: 'string', default: '⚡ 电击！',    public: true, label: '皮卡丘点击文字（备选）' },
  'ui.pikaPhrases':       { type: 'string', default: '皮卡～皮卡丘！|你好呀～ ⚡|皮皮～！|电击！⚡⚡|皮卡丘！❤️|要一起玩吗？', public: true, label: '点击台词（| 分隔）' },
  'ui.sfWaterLabel':      { type: 'string', default: '浇水', public: true, label: '向日葵浇水按钮文字' },
  'ui.sfFertilizeLabel':  { type: 'string', default: '施肥', public: true, label: '向日葵施肥按钮文字' },
  'ui.sfSunLabel':        { type: 'string', default: '晒太阳', public: true, label: '向日葵晒太阳按钮文字' },
  'ui.sfWaterText':       { type: 'string', default: '滋润了！🌊', public: true, label: '向日葵浇水反馈' },
  'ui.sfFertilizeText':   { type: 'string', default: '营养充足！✨', public: true, label: '向日葵施肥反馈' },
  'ui.sfSunText':         { type: 'string', default: '沐浴阳光！🌤', public: true, label: '向日葵晒太阳反馈' },
  'ui.sfDoneText':        { type: 'string', default: '你已经照顾过向日葵啦 🌸', public: true, label: '向日葵重复互动提示' },
  'ui.sfDoneHintText':    { type: 'string', default: '感谢你的爱护！', public: true, label: '向日葵重复互动说明' },
  'ui.sfLoadingText':     { type: 'string', default: '加载中…', public: true, label: '向日葵加载文案' },
  'ui.sfLevelUpText':     { type: 'string', default: '🎉 向日葵成长到新阶段啦！', public: true, label: '向日葵升级提示' },
  'ui.sfTimelineTitle':   { type: 'string', default: '成长历程', public: true, label: '向日葵成长历程标题' },
  'ui.sfCareCountText':   { type: 'string', default: '已有 {count} 人照顾', public: true, label: '向日葵照顾人数文案' },
  'ui.sfNextNeededText':  { type: 'string', default: '还差 {count} 人', public: true, label: '向日葵下一阶段文案' },
  'ui.sfUnavailableTitle': { type: 'string', default: '向日葵今天在安静晒太阳', public: true, label: '向日葵停用标题' },
  'ui.sfUnavailableDescription': { type: 'string', default: '互动功能正在整理中，晚一点再来看看它吧。', public: true, label: '向日葵停用说明' },
  'ui.sfRestMessage':     { type: 'string', default: '向日葵今天在休息，晚一点再来看看它吧。', public: true, label: '向日葵休息提示' },
  'ui.sfNetworkErrorText': { type: 'string', default: '网络错误，请重试', public: true, label: '向日葵网络错误提示' },
  'ui.sfStageDescriptions': { type: 'string', default: '一颗小种子静静等待…\n嫩芽破土而出，生命开始了！\n茎干挺立，努力向上生长中\n叶片舒展，在阳光下呼吸\n花骨朵含苞待放，快开了！\n盛开啦！感谢所有人的照顾 🌻', public: true, label: '向日葵阶段文案' },

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
  'system.notFoundTitle':   { type: 'string',    default: '页面不存在', public: true, label: '404 标题' },
  'system.notFoundDescription': { type: 'string', default: '这里什么都没有，也许它从未存在过', public: true, label: '404 说明' },
  'system.notFoundBackHomeLabel': { type: 'string', default: '← 回到首页', public: true, label: '404 返回首页按钮文字' },
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
