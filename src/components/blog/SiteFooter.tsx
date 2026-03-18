import { getSetting } from '@/lib/settings'
import { parseBlogLinks } from '@/lib/blog-ui'

type SiteFooterProps = {
  compact?: boolean
}

export default async function SiteFooter({ compact = false }: SiteFooterProps) {
  const [footerText, linksTitle, linksValue] = await Promise.all([
    getSetting('blog.footerText'),
    getSetting('blog.friendLinksTitle'),
    getSetting('blog.friendLinks'),
  ])

  const links = parseBlogLinks(linksValue)
  const resolvedFooterText = footerText.trim() || '用文字记录生活'
  const resolvedLinksTitle = linksTitle.trim() || '友情链接'
  const year = new Date().getFullYear()

  return (
    <footer className={`border-t border-[var(--border-color)] ${compact ? 'mt-10 sm:mt-14' : 'mt-12 sm:mt-16'} py-6 sm:py-8`}>
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left">
        <p className="text-xs text-[var(--text-faint)]">
          {resolvedFooterText} · {year}
        </p>

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
                className="text-xs text-[var(--text-subtle)] transition-colors hover:text-[var(--accent)]"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  )
}
