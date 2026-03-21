'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getSafeReferrer, getSessionId, getVisitorId } from '@/lib/visitor'

export default function PageViewTracker() {
  const pathname = usePathname()
  const enterTime = useRef<number>(Date.now())
  const currentPath = useRef<string>(pathname)

  useEffect(() => {
    // 排除管理后台页面
    if (pathname.startsWith('/houtai')) return

    const sessionId = getSessionId()
    const visitorId = getVisitorId()
    enterTime.current = Date.now()
    currentPath.current = pathname

    // 上报进入事件
    fetch('/api/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, visitorId, path: pathname, action: 'enter', referrer: getSafeReferrer() }),
    }).catch(() => {})

    // 离开时上报停留时长
    function reportLeave() {
      const duration = Math.round((Date.now() - enterTime.current) / 1000)
      if (duration < 1) return
      // 用 sendBeacon 保证页面关闭时也能发出
      const payload = JSON.stringify({
        sessionId,
        visitorId,
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
