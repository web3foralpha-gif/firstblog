import { getSetting } from '@/lib/settings'
import { parseBlogLinks } from '@/lib/blog-ui'

type SiteFooterProps = {
  compact?: boolean
}

export default async function SiteFooter({ compact = false }: SiteFooterProps) {
  const [
    footerEyebrow,
    footerText,
    linksTitle,
    linksValue,
    homeLabel,
    archiveLabel,
    aboutLabel,
    guestbookLabel,
    rssLabel,
    showArchive,
    showAbout,
    showGuestbook,
    showRss,
  ] = await Promise.all([
    getSetting('blog.footerEyebrow'),
    getSetting('blog.footerText'),
    getSetting('blog.friendLinksTitle'),
    getSetting('blog.friendLinks'),
    getSetting('nav.homeLabel'),
    getSetting('nav.archiveLabel'),
    getSetting('nav.aboutLabel'),
    getSetting('nav.guestbookLabel'),
    getSetting('nav.rssLabel'),
    getSetting('nav.showArchive'),
    getSetting('nav.showAbout'),
    getSetting('nav.showGuestbook'),
    getSetting('nav.showRss'),
  ])

  const links = parseBlogLinks(linksValue)
  const resolvedFooterEyebrow = footerEyebrow.trim() || 'Footer Note'
  const resolvedFooterText = footerText.trim() || '用文字记录生活'
  const resolvedLinksTitle = linksTitle.trim() || '友情链接'
  const year = new Date().getFullYear()
  const navLinks = [
    { href: '/', label: homeLabel.trim() || '首页', visible: true },
    { href: '/archive', label: archiveLabel.trim() || '归档', visible: showArchive === 'true' },
    { href: '/about', label: aboutLabel.trim() || '关于', visible: showAbout === 'true' },
    { href: '/guestbook', label: guestbookLabel.trim() || '留言板', visible: showGuestbook === 'true' },
    { href: '/rss.xml', label: rssLabel.trim() || 'RSS', visible: showRss === 'true' },
  ]
    .filter(link => link.visible)
    .map(({ visible: _visible, ...link }) => link)

  return (
    <footer className={`border-t border-[var(--border-color)] ${compact ? 'mt-10 sm:mt-14' : 'mt-12 sm:mt-16'} py-6 sm:py-8`}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="theme-panel-soft flex flex-col gap-4 px-5 py-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-faint)]">{resolvedFooterEyebrow}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {resolvedFooterText} · {year}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-[var(--border-soft)] bg-white/45 px-3 py-1.5 text-xs text-[var(--text-subtle)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {links.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-end">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-faint)]">
                {resolvedLinksTitle}
              </span>
              {links.map(link => (
                <a
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                  className="rounded-full border border-[var(--border-soft)] bg-white/45 px-3 py-1.5 text-xs text-[var(--text-subtle)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
