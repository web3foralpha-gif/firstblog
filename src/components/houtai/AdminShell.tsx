'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

import { ADMIN_HOME_ITEM, ADMIN_NAV_GROUPS, getAdminNavContext, isAdminNavActive } from '@/components/houtai/admin-navigation'

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navContext = getAdminNavContext(pathname)
  const currentGroupLabel = navContext.group?.label ?? '后台总览'
  const currentDescription = navContext.item.description

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved) setCollapsed(saved === 'true')
  }, [])

  function toggleCollapse() {
    setCollapsed(value => {
      localStorage.setItem('admin-sidebar-collapsed', String(!value))
      return !value
    })
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={`border-b border-slate-200 ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
        <div className={`flex ${collapsed ? 'justify-center' : 'items-start justify-between gap-3'}`}>
          {collapsed ? (
            <span className="text-lg">✦</span>
          ) : (
            <Link href="/houtai" className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">✦</span>
                <span className="truncate text-sm font-semibold text-slate-800">后台工作台</span>
              </div>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">{currentGroupLabel}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{navContext.item.label} · {currentDescription}</p>
            </Link>
          )}
        </div>

        <button
          onClick={toggleCollapse}
          className={`hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 lg:flex ${collapsed ? 'mx-auto mt-2' : 'ml-auto mt-3'}`}
          title={collapsed ? '展开侧栏' : '收起侧栏'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            {collapsed ? (
              <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <Link
          href={ADMIN_HOME_ITEM.href}
          className={`nav-item ${isAdminNavActive(pathname, ADMIN_HOME_ITEM.href) ? 'nav-item-active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? ADMIN_HOME_ITEM.label : ADMIN_HOME_ITEM.description}
        >
          <span className="w-5 flex-shrink-0 text-center text-base">{ADMIN_HOME_ITEM.icon}</span>
          {!collapsed && <span className="truncate">{ADMIN_HOME_ITEM.label}</span>}
        </Link>

        {ADMIN_NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
            )}
            {collapsed && <div className="my-2 border-t border-slate-100" />}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isAdminNavActive(pathname, item.href) ? 'nav-item-active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                  title={collapsed ? item.label : item.description}
                >
                  <span className="w-5 flex-shrink-0 text-center text-base">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-slate-200 p-2">
        <Link href="/" target="_blank" className={`nav-item ${collapsed ? 'justify-center px-2' : ''}`} title={collapsed ? '查看博客' : undefined}>
          <span className="w-5 flex-shrink-0 text-center text-base">↗</span>
          {!collapsed && <span className="text-sm">查看博客</span>}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/houtai/login' })}
          className={`nav-item w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? '退出登录' : undefined}
        >
          <span className="w-5 flex-shrink-0 text-center text-base">⏻</span>
          {!collapsed && <span className="text-sm">退出登录</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className={`hidden flex-shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:flex ${collapsed ? 'w-14' : 'w-52'}`}>
        {sidebarContent}
      </aside>

      {mobileOpen ? <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}

      <aside className={`fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{navContext.item.label}</p>
            <p className="truncate text-[11px] text-slate-400">{currentGroupLabel}</p>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-auto p-4 lg:p-8">{children}</main>
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
        }
        .nav-item:hover { background: #f1f5f9; color: #1e293b; }
        .nav-item-active { background: #f1f5f9; color: #1e293b; font-weight: 500; }
      `}</style>
    </div>
  )
}
