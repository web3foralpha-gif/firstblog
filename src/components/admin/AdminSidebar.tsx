'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const links = [
  { href: '/admin', label: '概览', icon: '◈' },
  { href: '/admin/articles', label: '文章管理', icon: '✦' },
  { href: '/admin/articles/new', label: '写新文章', icon: '+' },
  { href: '/admin/comments', label: '评论管理', icon: '✉' },
  { href: '/admin/analytics', label: '访问统计', icon: '📊' },
  { href: '/admin/guestbook', label: '留言板审核', icon: '💬' },
  { href: '/admin/payments', label: '打赏记录', icon: '¥' },
  { href: '/admin/media', label: '媒体库', icon: '⬡' },
  { href: '/admin/sunflower', label: '向日葵', icon: '🌻' },
  { href: '/admin/settings', label: '网站设置', icon: '◎' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 bg-white border-r border-[#ddd5c8] flex flex-col py-6 px-3 min-h-screen flex-shrink-0">
      <div className="px-3 mb-8">
        <p className="font-serif text-base font-medium text-[#221e1a]">管理后台</p>
        <p className="text-xs text-[#a89880] mt-0.5">博主专属</p>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`admin-sidebar-link ${pathname === link.href ? 'active' : ''}`}
          >
            <span className="text-base w-5 text-center flex-shrink-0">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 pt-4 border-t border-[#ddd5c8]">
        <Link href="/" className="admin-sidebar-link mb-1">
          <span className="text-base w-5 text-center">↗</span>
          <span>查看博客</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="admin-sidebar-link w-full text-left text-red-400 hover:text-red-500 hover:bg-red-50"
        >
          <span className="text-base w-5 text-center">⏻</span>
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  )
}
