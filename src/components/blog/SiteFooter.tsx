import { getFooterData } from '@/lib/services/site-service'

type SiteFooterProps = {
  compact?: boolean
}

export default async function SiteFooter({ compact = false }: SiteFooterProps) {
  const { footerEyebrow, footerText, linksTitle, friendLinks, navLinks } = await getFooterData()
  const year = new Date().getFullYear()

  return (
    <footer className={`border-t border-[var(--border-color)] ${compact ? 'mt-10 sm:mt-14' : 'mt-12 sm:mt-16'} py-6 sm:py-8`}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="theme-panel-soft flex flex-col gap-4 px-5 py-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--text-faint)]">{footerEyebrow}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {footerText} · {year}
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

          {friendLinks.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-end">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-faint)]">
                {linksTitle}
              </span>
              {friendLinks.map(link => (
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
