'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV_GROUPS = [
  {
    label: '内容管理',
    items: [
      { href: '/houtai/articles',  icon: '📄', label: '文章管理' },
      { href: '/houtai/articles/new', icon: '✏️', label: '写新文章' },
      { href: '/houtai/comments',  icon: '💬', label: '评论管理' },
      { href: '/houtai/guestbook', icon: '📮', label: '留言审核' },
      { href: '/houtai/media',     icon: '🖼️', label: '媒体库' },
    ],
  },
  {
    label: '互动数据',
    items: [
      { href: '/houtai/analytics', icon: '📊', label: '访问统计' },
      { href: '/houtai/sunflower', icon: '🌻', label: '向日葵' },
      { href: '/houtai/payments',  icon: '💳', label: '打赏记录' },
    ],
  },
  {
    label: '系统设置',
    items: [
      { href: '/houtai/settings',  icon: '⚙️', label: '网站设置' },
      { href: '/houtai/backup',   icon: '💾', label: '备份导出' },
    ],
  },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // 移动端切换路由后自动关闭菜单
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // 记住折叠状态
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved) setCollapsed(saved === 'true')
  }, [])
  function toggleCollapse() {
    setCollapsed(v => {
      localStorage.setItem('admin-sidebar-collapsed', String(!v))
      return !v
    })
  }

  const isActive = (href: string) =>
    href === '/houtai' ? pathname === '/houtai' : pathname.startsWith(href)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo 区域 */}
      <div className={`flex items-center h-14 px-4 border-b border-slate-200 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <Link href="/houtai" className="flex items-center gap-2 min-w-0">
            <span className="text-lg">✦</span>
            <span className="font-semibold text-slate-800 text-sm truncate">管理后台</span>
          </Link>
        )}
        {collapsed && <span className="text-lg">✦</span>}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          title={collapsed ? '展开侧栏' : '收起侧栏'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            {collapsed
              ? <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
        </button>
      </div>

      {/* 导航区域 */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* 仪表盘 */}
        <Link href="/houtai"
          className={`nav-item ${isActive('/houtai') && pathname === '/houtai' ? 'nav-item-active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? '仪表盘' : undefined}
        >
          <span className="text-base w-5 text-center flex-shrink-0">🏠</span>
          {!collapsed && <span className="truncate">仪表盘</span>}
        </Link>

        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                {group.label}
              </p>
            )}
            {collapsed && <div className="border-t border-slate-100 my-2" />}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <Link key={item.href} href={item.href}
                  className={`nav-item ${isActive(item.href) ? 'nav-item-active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* 底部操作 */}
      <div className={`p-2 border-t border-slate-200 space-y-0.5 flex-shrink-0`}>
        <Link href="/" target="_blank"
          className={`nav-item ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? '查看博客' : undefined}
        >
          <span className="text-base w-5 text-center flex-shrink-0">↗</span>
          {!collapsed && <span className="text-sm">查看博客</span>}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/houtai/login' })}
          className={`nav-item w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? '退出登录' : undefined}
        >
          <span className="text-base w-5 text-center flex-shrink-0">⏻</span>
          {!collapsed && <span className="text-sm">退出登录</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 桌面侧边栏 */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-14' : 'w-52'}`}>
        {sidebarContent}
      </aside>

      {/* 移动端抽屉遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 移动端侧边栏 */}
      <aside className={`fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200 z-50 flex flex-col lg:hidden transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 移动端顶栏 */}
        <header className="lg:hidden flex items-center h-14 px-4 bg-white border-b border-slate-200 gap-3 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="font-semibold text-slate-800 text-sm">管理后台</span>
        </header>

        <main className="flex-1 p-4 lg:p-8 min-w-0 overflow-auto">
          {children}
        </main>
      </div>

      <style>{`
        .nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 13.5px;
          color: #475569;
          transition: background .12s, color .12s;
          text-decoration: none;
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
        }
        .nav-item:hover { background: #f1f5f9; color: #1e293b; }
        .nav-item-active { background: #f1f5f9; color: #1e293b; font-weight: 500; }
      `}</style>
    </div>
  )
}
