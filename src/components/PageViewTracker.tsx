'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// 生成或复用匿名 sessionId（存 sessionStorage，关闭标签即失效）
function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'ssr'
  let id = sessionStorage.getItem('_sid')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('_sid', id)
  }
  return id
}

export default function PageViewTracker() {
  const pathname = usePathname()
  const enterTime = useRef<number>(Date.now())
  const currentPath = useRef<string>(pathname)

  useEffect(() => {
    // 排除管理后台页面
    if (pathname.startsWith('/admin')) return

    const sessionId = getSessionId()
    enterTime.current = Date.now()
    currentPath.current = pathname

    // 上报进入事件
    fetch('/api/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, path: pathname, action: 'enter' }),
    }).catch(() => {})

    // 离开时上报停留时长
    function reportLeave() {
      const duration = Math.round((Date.now() - enterTime.current) / 1000)
      if (duration < 1) return
      // 用 sendBeacon 保证页面关闭时也能发出
      const payload = JSON.stringify({
        sessionId,
        path: currentPath.current,
        action: 'leave',
        duration,
      })
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/pageview', new Blob([payload], { type: 'application/json' }))
      } else {
        fetch('/api/pageview', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
      }
    }

    window.addEventListener('beforeunload', reportLeave)
    return () => {
      window.removeEventListener('beforeunload', reportLeave)
      reportLeave() // 路由切换时也上报
    }
  }, [pathname])

  return null
}
