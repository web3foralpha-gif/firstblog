import 'server-only'

import { normalizeBlogTheme, parseBlogLinks } from '@/lib/blog-ui'
import { DEFAULT_ABOUT_CONTENT } from '@/lib/content-defaults'
import { getSettings } from '@/lib/settings'

export async function getBlogThemeVariant() {
  const settings = await getSettings(['blog.themeVariant'] as const)
  return normalizeBlogTheme(settings['blog.themeVariant'])
}

export async function getHeaderData() {
  const settings = await getSettings([
    'site.title',
    'nav.homeLabel',
    'nav.archiveLabel',
    'nav.aboutLabel',
    'nav.guestbookLabel',
    'nav.showArchive',
    'nav.showAbout',
    'nav.showGuestbook',
  ] as const)

  return {
    siteName: settings['site.title'].trim() || '我的小站',
    navItems: [
      { href: '/', label: settings['nav.homeLabel'].trim() || '首页' },
      ...(settings['nav.showArchive'] === 'true' ? [{ href: '/archive', label: settings['nav.archiveLabel'].trim() || '归档' }] : []),
      ...(settings['nav.showAbout'] === 'true' ? [{ href: '/about', label: settings['nav.aboutLabel'].trim() || '关于' }] : []),
      ...(settings['nav.showGuestbook'] === 'true' ? [{ href: '/guestbook', label: settings['nav.guestbookLabel'].trim() || '留言板' }] : []),
    ],
  }
}

export async function getFooterData() {
  const settings = await getSettings([
    'blog.footerEyebrow',
    'blog.footerText',
    'blog.friendLinksTitle',
    'blog.friendLinks',
    'nav.homeLabel',
    'nav.archiveLabel',
    'nav.aboutLabel',
    'nav.guestbookLabel',
    'nav.rssLabel',
    'nav.showArchive',
    'nav.showAbout',
    'nav.showGuestbook',
    'nav.showRss',
  ] as const)

  return {
    footerEyebrow: settings['blog.footerEyebrow'].trim() || 'Footer Note',
    footerText: settings['blog.footerText'].trim() || '用文字记录生活',
    linksTitle: settings['blog.friendLinksTitle'].trim() || '友情链接',
    friendLinks: parseBlogLinks(settings['blog.friendLinks']),
    navLinks: [
      { href: '/', label: settings['nav.homeLabel'].trim() || '首页', visible: true },
      { href: '/archive', label: settings['nav.archiveLabel'].trim() || '归档', visible: settings['nav.showArchive'] === 'true' },
      { href: '/about', label: settings['nav.aboutLabel'].trim() || '关于', visible: settings['nav.showAbout'] === 'true' },
      { href: '/guestbook', label: settings['nav.guestbookLabel'].trim() || '留言板', visible: settings['nav.showGuestbook'] === 'true' },
      { href: '/rss.xml', label: settings['nav.rssLabel'].trim() || 'RSS', visible: settings['nav.showRss'] === 'true' },
    ]
      .filter(link => link.visible)
      .map(({ visible: _visible, ...link }) => link),
  }
}

export async function getAboutPageData() {
  const settings = await getSettings([
    'blog.aboutTitle',
    'blog.aboutSubtitle',
    'blog.aboutAvatar',
    'blog.aboutCoverImage',
    'blog.aboutContent',
    'blog.aboutContactsTitle',
    'blog.aboutContacts',
  ] as const)

  return {
    title: settings['blog.aboutTitle'].trim() || '关于我',
    subtitle: settings['blog.aboutSubtitle'].trim(),
    avatar: settings['blog.aboutAvatar'].trim(),
    coverImage: settings['blog.aboutCoverImage'].trim(),
    content: settings['blog.aboutContent'].trim() || DEFAULT_ABOUT_CONTENT,
    contactsTitle: settings['blog.aboutContactsTitle'].trim() || '社交与联系方式',
    contactsValue: settings['blog.aboutContacts'],
  }
}

export async function getHomePageData() {
  const settings = await getSettings([
    'blog.homeTitle',
    'blog.homeDescription',
    'blog.searchPlaceholder',
    'blog.searchButtonLabel',
    'blog.searchClearLabel',
    'blog.resultsSummaryTemplate',
    'blog.filteredResultsSummaryTemplate',
    'blog.emptyStateText',
    'blog.emptySearchText',
    'blog.showCornerCard',
    'blog.cornerTitle',
    'blog.cornerContent',
    'blog.showQuickLinksCard',
    'blog.quickLinksTitle',
    'blog.quickLinkAboutLabel',
    'blog.quickLinkAboutHref',
    'blog.quickLinkGuestbookLabel',
    'blog.quickLinkGuestbookHref',
    'nav.archiveLabel',
    'nav.rssLabel',
    'nav.showArchive',
    'nav.showRss',
  ] as const)

  return {
    homeTitle: settings['blog.homeTitle'].trim(),
    homeDescription: settings['blog.homeDescription'].trim(),
    searchPlaceholder: settings['blog.searchPlaceholder'].trim() || '搜标题、摘要、关键词…',
    searchButtonLabel: settings['blog.searchButtonLabel'].trim() || '搜索',
    searchClearLabel: settings['blog.searchClearLabel'].trim() || '清除',
    resultsSummaryTemplate: settings['blog.resultsSummaryTemplate'].trim() || '共 {count} 篇',
    filteredResultsSummaryTemplate: settings['blog.filteredResultsSummaryTemplate'].trim() || '当前筛选：{query} · 共 {count} 篇',
    emptyStateText: settings['blog.emptyStateText'].trim() || '还没有公开文章，过几天再来看看吧。',
    emptySearchText: settings['blog.emptySearchText'].trim() || '暂时没有匹配这组关键词的文章。',
    showCornerCard: settings['blog.showCornerCard'] === 'true',
    cornerTitle: settings['blog.cornerTitle'].trim() || '小站角落',
    cornerLines: settings['blog.cornerContent']
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean),
    showQuickLinksCard: settings['blog.showQuickLinksCard'] === 'true',
    quickLinksTitle: settings['blog.quickLinksTitle'].trim() || '快速入口',
    aboutLabel: settings['blog.quickLinkAboutLabel'].trim(),
    aboutHref: settings['blog.quickLinkAboutHref'].trim(),
    guestbookLabel: settings['blog.quickLinkGuestbookLabel'].trim(),
    guestbookHref: settings['blog.quickLinkGuestbookHref'].trim(),
    archiveLabel: settings['nav.archiveLabel'].trim() || '归档',
    showArchiveLink: settings['nav.showArchive'] === 'true',
    rssLabel: settings['nav.rssLabel'].trim() || 'RSS',
    showRssLink: settings['nav.showRss'] === 'true',
  }
}

export async function getArchivePageData() {
  const settings = await getSettings([
    'archive.eyebrowLabel',
    'archive.pageTitle',
    'archive.pageDescription',
    'archive.backHomeLabel',
    'archive.rssButtonLabel',
    'nav.showRss',
  ] as const)

  return {
    eyebrow: settings['archive.eyebrowLabel'].trim() || 'Archive',
    title: settings['archive.pageTitle'].trim() || '文章归档',
    description: settings['archive.pageDescription'].trim() || '这里按时间整理所有公开文章。想按主题找内容，也可以去首页直接搜关键词。',
    backHomeLabel: settings['archive.backHomeLabel'].trim() || '返回首页',
    rssButtonLabel: settings['archive.rssButtonLabel'].trim() || 'RSS 订阅',
    showRss: settings['nav.showRss'] === 'true',
  }
}

export async function getGuestbookMetadataData() {
  const settings = await getSettings([
    'guestbook.pageTitle',
    'guestbook.metaDescription',
  ] as const)

  return {
    title: settings['guestbook.pageTitle'].trim() || '留言板',
    description: settings['guestbook.metaDescription'].trim() || '访客可以在这里留下公开留言、足迹和问候。',
  }
}

export async function getGuestbookPageData() {
  const settings = await getSettings([
    'guestbook.pageTitle',
    'guestbook.pageSubtitle',
    'guestbook.messagesDividerLabel',
    'guestbook.emptyText',
    'guestbook.formDividerLabel',
    'guestbook.formTitle',
    'guestbook.formSubtitle',
    'guestbook.nicknameLabel',
    'guestbook.nicknamePlaceholder',
    'guestbook.emailLabel',
    'guestbook.emailPlaceholder',
    'guestbook.emailPublicOnLabel',
    'guestbook.emailPublicOffLabel',
    'guestbook.emojiLabel',
    'guestbook.contentLabel',
    'guestbook.contentPlaceholder',
    'guestbook.submitLabel',
    'guestbook.submittingLabel',
    'guestbook.successTitle',
    'guestbook.successMessage',
    'guestbook.successActionLabel',
  ] as const)

  return {
    pageTitle: settings['guestbook.pageTitle'].trim() || '留言板',
    pageSubtitle: settings['guestbook.pageSubtitle'].trim() || '大家留下的足迹，匿名、真实',
    messagesDividerLabel: settings['guestbook.messagesDividerLabel'].trim() || '大家说的话',
    emptyText: settings['guestbook.emptyText'].trim() || '还没有留言，往下写下第一句话吧',
    formDividerLabel: settings['guestbook.formDividerLabel'].trim() || '写下你的留言',
    formCopy: {
      formTitle: settings['guestbook.formTitle'].trim() || '写下你的留言',
      formSubtitle: settings['guestbook.formSubtitle'].trim() || '审核通过后公开展示',
      nicknameLabel: settings['guestbook.nicknameLabel'].trim() || '昵称 *',
      nicknamePlaceholder: settings['guestbook.nicknamePlaceholder'].trim() || '你的名字',
      emailLabel: settings['guestbook.emailLabel'].trim() || '邮箱（可选）',
      emailPlaceholder: settings['guestbook.emailPlaceholder'].trim() || 'your@email.com',
      emailPublicOnLabel: settings['guestbook.emailPublicOnLabel'].trim() || '公开邮箱（其他访客可见）',
      emailPublicOffLabel: settings['guestbook.emailPublicOffLabel'].trim() || '不公开邮箱（仅博主可见）',
      emojiLabel: settings['guestbook.emojiLabel'].trim() || '选个心情（可选）',
      contentLabel: settings['guestbook.contentLabel'].trim() || '留言内容 *',
      contentPlaceholder: settings['guestbook.contentPlaceholder'].trim() || '说点什么吧 ✍️',
      submitLabel: settings['guestbook.submitLabel'].trim() || '发布留言 ✨',
      submittingLabel: settings['guestbook.submittingLabel'].trim() || '提交中…',
      successTitle: settings['guestbook.successTitle'].trim() || '留言已收到！',
      successMessage: settings['guestbook.successMessage'].trim() || '留言已提交，审核后会展示在留言板',
      successActionLabel: settings['guestbook.successActionLabel'].trim() || '再写一条',
    },
  }
}

export async function getPaymentSuccessPageData() {
  const settings = await getSettings([
    'pay.successTitle',
    'pay.successUnlockedDescription',
    'pay.successPendingDescription',
    'pay.successEmailHint',
    'pay.successReadNowLabel',
    'pay.successLinkNoticeLabel',
    'pay.successBackHomeLabel',
  ] as const)

  return {
    successTitle: settings['pay.successTitle'].trim() || '感谢你的支持！',
    successUnlockedDescription: settings['pay.successUnlockedDescription'].trim() || '文章《{title}》已为你解锁',
    successPendingDescription: settings['pay.successPendingDescription'].trim() || '支付正在处理中，链接将很快发送到你的邮箱。',
    successEmailHint: settings['pay.successEmailHint'].trim() || '访问链接已发送到你的邮箱，请务必保存以便下次访问。',
    successReadNowLabel: settings['pay.successReadNowLabel'].trim() || '立即阅读 →',
    successLinkNoticeLabel: settings['pay.successLinkNoticeLabel'].trim() || '你的专属访问链接（请收藏）：',
    successBackHomeLabel: settings['pay.successBackHomeLabel'].trim() || '← 返回首页',
  }
}

export async function getNotFoundPageData() {
  const settings = await getSettings([
    'system.notFoundTitle',
    'system.notFoundDescription',
    'system.notFoundBackHomeLabel',
  ] as const)

  return {
    title: settings['system.notFoundTitle'].trim() || '页面不存在',
    description: settings['system.notFoundDescription'].trim() || '这里什么都没有，也许它从未存在过',
    backHomeLabel: settings['system.notFoundBackHomeLabel'].trim() || '← 回到首页',
  }
}

export async function getAboutPageTitle() {
  return (await getAboutPageData()).title
}

export async function getAboutPageSubtitle() {
  return (await getAboutPageData()).subtitle
}

export async function getAboutPageAvatar() {
  return (await getAboutPageData()).avatar
}

export async function getAboutPageCoverImage() {
  return (await getAboutPageData()).coverImage
}

export async function getAboutPageContactsTitle() {
  return (await getAboutPageData()).contactsTitle
}

export async function getAboutPageContacts() {
  return (await getAboutPageData()).contactsValue
}

export async function getAboutPageContent() {
  return (await getAboutPageData()).content
}
