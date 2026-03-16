'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function HeaderClient({ siteName }: { siteName: string }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="border-b border-[#ddd5c8] bg-[#faf8f5]/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/blog" className="font-serif text-lg sm:text-xl font-medium text-[#221e1a] tracking-wide hover:text-[#d4711a] transition-colors">
          {siteName}
        </Link>

        <nav className="hidden sm:flex items-center gap-5 text-sm text-[#5a4f42]">
          <Link href="/blog" className="hover:text-[#d4711a] transition-colors">文章</Link>
          <Link href="/about" className="hover:text-[#d4711a] transition-colors">关于</Link>
          <Link href="/guestbook" className="hover:text-[#d4711a] transition-colors">留言板</Link>
        </nav>

        <button
          className="sm:hidden p-2 rounded-lg text-[#5a4f42] hover:bg-[#f0ebe3] transition-colors"
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
        <div className="sm:hidden border-t border-[#ddd5c8] bg-[#faf8f5] px-4 py-3 space-y-1">
          {[['/blog', '文章'], ['/about', '关于'], ['/guestbook', '留言板']].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#5a4f42] hover:bg-[#f0ebe3] hover:text-[#d4711a] transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
