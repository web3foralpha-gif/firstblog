'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

type HeaderClientProps = {
  siteName: string
  navItems: Array<{ href: string; label: string }>
}

export default function HeaderClient({ siteName, navItems }: HeaderClientProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--header-border)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group inline-flex items-center gap-2.5 rounded-full border border-[var(--border-color)] bg-white/72 px-3 py-1.5 shadow-[0_8px_20px_var(--card-shadow)] transition-all hover:border-[var(--accent)]">
          <span className="flex h-9 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] shadow-inner shadow-white/70">
            <svg width="34" height="24" viewBox="0 0 68 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 17C10 10 18 8 18 13C18 18 10 17 10 21C10 25 16 24 16 29" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="5 5" className="text-[var(--accent)] opacity-70" />
              <path d="M17 32C20 37 24 40 28 40" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="5 5" className="text-[var(--accent)] opacity-70" />
              <path d="M26 19L61 10L39 38L34 25L26 19Z" fill="white" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" className="text-[var(--text-secondary)]" />
              <path d="M34 25L61 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-[var(--text-secondary)]" />
              <path d="M34 25L39 38" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-[var(--text-secondary)]" />
              <path d="M41.5 27.5C41.5 25.567 43.067 24 45 24C46.305 24 47.442 24.715 48.043 25.775C48.644 24.715 49.781 24 51.086 24C53.019 24 54.586 25.567 54.586 27.5C54.586 31.26 50.832 33.28 48.043 35.5C45.255 33.28 41.5 31.26 41.5 27.5Z" fill="#F5B5DA" stroke="currentColor" strokeWidth="1.6" className="text-[var(--text-secondary)]" />
            </svg>
          </span>
          <span className="font-serif text-base font-medium tracking-[0.01em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)] sm:text-lg">
            {siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-white/72 p-1 shadow-[0_10px_24px_var(--card-shadow)] sm:flex">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-4 py-1.5 text-sm transition-all hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)] ${
                isActive(href)
                  ? 'bg-[var(--nav-pill-hover)] font-medium text-[var(--accent)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <button
          className="rounded-full border border-[var(--border-color)] bg-white/72 p-2 text-[var(--text-secondary)] shadow-[0_8px_20px_var(--card-shadow)] transition-colors hover:bg-[var(--nav-pill-hover)] sm:hidden"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="菜单"
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[var(--header-border)] bg-[var(--page-bg-overlay)] px-4 py-3 backdrop-blur-xl sm:hidden">
          <div className="theme-panel-soft space-y-1 p-2">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center rounded-2xl px-3 py-2.5 text-sm transition-colors hover:bg-[var(--nav-pill-hover)] hover:text-[var(--accent)] ${
                  isActive(href)
                    ? 'bg-[var(--nav-pill-hover)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
