'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function HeaderClient({ siteName }: { siteName: string }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[var(--page-bg-overlay)] backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/blog" className="font-serif text-lg sm:text-xl font-medium tracking-wide text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]">
          {siteName}
        </Link>

        <nav className="hidden sm:flex items-center gap-5 text-sm text-[var(--text-secondary)]">
          <Link href="/blog" className="transition-colors hover:text-[var(--accent)]">文章</Link>
          <Link href="/about" className="transition-colors hover:text-[var(--accent)]">关于</Link>
          <Link href="/guestbook" className="transition-colors hover:text-[var(--accent)]">留言板</Link>
        </nav>

        <button
          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)] sm:hidden"
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
        <div className="space-y-1 border-t border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-3 sm:hidden">
          {[['/blog', '文章'], ['/about', '关于'], ['/guestbook', '留言板']].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--accent)]"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
