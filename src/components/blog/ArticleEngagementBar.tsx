'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { collectClientDeviceInfo, getClientDeviceInfoSync } from '@/lib/client-device'
import type { DeviceInfoPayload } from '@/lib/device-info'
import { getSafeReferrer, getSessionId, getVisitorId } from '@/lib/visitor'

type EngagementSummary = {
  articleId: string
  viewCount: number
  qualifiedViewCount: number
  uniqueVisitorCount: number
  likeCount: number
  shareCount: number
  shareLinkCount: number
  shareImageCount: number
  commentCount: number
  likedByVisitor: boolean
}

type Props = {
  articleId: string
  slug: string
  title: string
  sharePath: string
  commentsCount: number
  initialSummary: EngagementSummary
  showCommentLink?: boolean
}

type FlashState = {
  type: 'success' | 'error'
  message: string
} | null

type SharePreviewState = {
  blob: Blob
  url: string
} | null

function buildPayload(articleId: string, path: string, deviceInfo?: DeviceInfoPayload | null) {
  return {
    articleId,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    path,
    referrer: getSafeReferrer(),
    deviceInfo: deviceInfo || null,
  }
}

export default function ArticleEngagementBar({
  articleId,
  slug,
  title,
  sharePath,
  commentsCount,
  initialSummary,
  showCommentLink = false,
}: Props) {
  const [summary, setSummary] = useState<EngagementSummary>({
    ...initialSummary,
    commentCount: commentsCount || initialSummary.commentCount,
  })
  const [flash, setFlash] = useState<FlashState>(null)
  const [busy, setBusy] = useState<'like' | 'link' | 'image' | null>(null)
  const [sharePreview, setSharePreview] = useState<SharePreviewState>(null)
  const enteredAtRef = useRef(Date.now())
  const maxScrollDepthRef = useRef(0)
  const qualifiedRef = useRef(false)
  const leaveReportedRef = useRef(false)
  const pathRef = useRef(sharePath)
  const deviceInfoRef = useRef<DeviceInfoPayload | null>(getClientDeviceInfoSync())

  const displayReadCount = useMemo(() => summary.qualifiedViewCount || summary.viewCount, [summary.qualifiedViewCount, summary.viewCount])

  useEffect(() => {
    setSummary(current => ({ ...current, commentCount: commentsCount || current.commentCount }))
  }, [commentsCount])

  useEffect(() => {
    let disposed = false
    void collectClientDeviceInfo().then(deviceInfo => {
      if (!disposed && deviceInfo) {
        deviceInfoRef.current = deviceInfo
      }
    })

    const buildCurrentPayload = () => buildPayload(articleId, pathRef.current, deviceInfoRef.current)
    enteredAtRef.current = Date.now()
    maxScrollDepthRef.current = 0
    qualifiedRef.current = false
    leaveReportedRef.current = false
    pathRef.current = sharePath

    fetch('/api/article-interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'view-enter',
        ...buildCurrentPayload(),
      }),
    }).catch(() => {})

    const sendQualified = (reason: 'duration' | 'scroll' | 'leave') => {
      if (qualifiedRef.current) return
      qualifiedRef.current = true

      const duration = Math.round((Date.now() - enteredAtRef.current) / 1000)
      const body = JSON.stringify({
        action: 'view-qualified',
        ...buildCurrentPayload(),
        duration,
        scrollDepth: maxScrollDepthRef.current,
        metadata: { reason },
      })

      if (reason === 'leave' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/article-interactions', new Blob([body], { type: 'application/json' }))
      } else {
        fetch('/api/article-interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: reason === 'leave',
        })
          .then(() => {
            setSummary(current => ({
              ...current,
              qualifiedViewCount: current.qualifiedViewCount + 1,
            }))
          })
          .catch(() => {})
      }
    }

    const reportLeave = (useBeacon: boolean) => {
      if (leaveReportedRef.current) return

      const duration = Math.round((Date.now() - enteredAtRef.current) / 1000)
      if (duration < 1) return

      leaveReportedRef.current = true

      const body = JSON.stringify({
        action: 'view-leave',
        ...buildCurrentPayload(),
        duration,
      })

      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon('/api/article-interactions', new Blob([body], { type: 'application/json' }))
        return
      }

      fetch('/api/article-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }

    const timer = window.setTimeout(() => sendQualified('duration'), 15000)

    const handleScroll = () => {
      const fullHeight = document.documentElement.scrollHeight - window.innerHeight
      if (fullHeight <= 0) return
      const currentDepth = Math.round((window.scrollY / fullHeight) * 100)
      maxScrollDepthRef.current = Math.max(maxScrollDepthRef.current, currentDepth)

      if (maxScrollDepthRef.current >= 40) {
        sendQualified('scroll')
      }
    }

    const handleBeforeUnload = () => {
      const duration = Math.round((Date.now() - enteredAtRef.current) / 1000)
      if (duration >= 15 || maxScrollDepthRef.current >= 40) {
        sendQualified('leave')
      }
      reportLeave(true)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      disposed = true
      window.clearTimeout(timer)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      handleBeforeUnload()
      reportLeave(false)
    }
  }, [articleId, sharePath])

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), 2200)
    return () => window.clearTimeout(timer)
  }, [flash])

  useEffect(() => {
    if (!sharePreview) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSharePreview()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [sharePreview])

  useEffect(() => {
    return () => {
      if (sharePreview) {
        URL.revokeObjectURL(sharePreview.url)
      }
    }
  }, [sharePreview])

  async function toggleLike() {
    try {
      setBusy('like')
      const res = await fetch('/api/article-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-like',
          ...buildPayload(articleId, sharePath, deviceInfoRef.current),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.summary) {
        throw new Error(String(data?.error || '点赞失败'))
      }
      setSummary(data.summary)
    } catch (error) {
      setFlash({ type: 'error', message: error instanceof Error ? error.message : '点赞失败' })
    } finally {
      setBusy(null)
    }
  }

  async function recordShare(mode: 'link' | 'image') {
    const res = await fetch('/api/article-interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'share',
        mode,
        channel: mode === 'image' ? 'image_download' : 'copy_link',
        ...buildPayload(articleId, sharePath, deviceInfoRef.current),
      }),
    })
    const data = await res.json().catch(() => null)
    if (data?.summary) {
      setSummary(data.summary)
    }
  }

  function closeSharePreview() {
    setSharePreview(current => {
      if (current) {
        URL.revokeObjectURL(current.url)
      }
      return null
    })
  }

  async function copyShareLink() {
    try {
      setBusy('link')
      const targetUrl = typeof window !== 'undefined' ? new URL(sharePath, window.location.origin).toString() : sharePath

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(targetUrl)
      } else {
        const input = document.createElement('input')
        input.value = targetUrl
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        input.remove()
      }

      await recordShare('link')
      setFlash({ type: 'success', message: '文章链接已复制，去转发吧。' })
    } catch {
      setFlash({ type: 'error', message: '复制链接失败，请稍后重试。' })
    } finally {
      setBusy(null)
    }
  }

  async function openShareImagePreview() {
    try {
      setBusy('image')
      const res = await fetch(`/api/articles/${slug}/share-image?v=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error('分享图生成失败')
      }
      const blob = await res.blob()
      const currentPreviewUrl = sharePreview?.url
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl)
      }
      const objectUrl = URL.createObjectURL(blob)
      setSharePreview({ blob, url: objectUrl })

      await recordShare('image')
      setFlash({ type: 'success', message: '分享海报已生成，可预览后自行复制或保存。' })
    } catch (error) {
      setFlash({ type: 'error', message: error instanceof Error ? error.message : '分享图生成失败' })
    } finally {
      setBusy(null)
    }
  }

  async function copyShareImage() {
    if (!sharePreview) return

    try {
      setBusy('image')

      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        throw new Error('当前浏览器不支持复制图片，请长按或右键保存。')
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [sharePreview.blob.type || 'image/png']: sharePreview.blob,
        }),
      ])

      setFlash({ type: 'success', message: '海报已复制到剪贴板。' })
    } catch (error) {
      setFlash({ type: 'error', message: error instanceof Error ? error.message : '复制海报失败，请稍后重试。' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mt-10 rounded-3xl border border-[var(--border-color)] bg-[var(--surface-soft)]/70 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-subtle)]">
          <span className="rounded-full bg-white/80 px-3 py-1">阅读 {displayReadCount}</span>
          <span className="rounded-full bg-white/80 px-3 py-1">点赞 {summary.likeCount}</span>
          <span className="rounded-full bg-white/80 px-3 py-1">转发 {summary.shareCount}</span>
          <span className="rounded-full bg-white/80 px-3 py-1">评论 {summary.commentCount}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleLike}
            disabled={busy === 'like'}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              summary.likedByVisitor
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--border-color)] bg-white/80 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
            }`}
          >
            {busy === 'like' ? '处理中…' : summary.likedByVisitor ? '已点赞' : '点赞'}
          </button>
          <button
            type="button"
            onClick={copyShareLink}
            disabled={busy === 'link'}
            className="rounded-full border border-[var(--border-color)] bg-white/80 px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {busy === 'link' ? '复制中…' : '复制链接'}
          </button>
          <button
            type="button"
            onClick={openShareImagePreview}
            disabled={busy === 'image'}
            className="rounded-full border border-[var(--border-color)] bg-white/80 px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {busy === 'image' ? '生成中…' : '生成海报'}
          </button>
          {showCommentLink ? (
            <a
              href="#comments"
              className="rounded-full border border-[var(--border-color)] bg-white/80 px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              去评论
            </a>
          ) : null}
        </div>
      </div>

      {flash ? (
        <p className={`mt-3 text-sm ${flash.type === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
          {flash.message}
        </p>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-faint)]">
          《{title}》的阅读、点赞、转发和评论都会进入后台互动统计。
        </p>
      )}

      {sharePreview ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={closeSharePreview}
        >
          <div
            className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">文章海报预览</p>
                <p className="mt-1 text-xs text-slate-500">可先预览，再自行复制或保存</p>
              </div>
              <button
                type="button"
                onClick={closeSharePreview}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800"
                aria-label="关闭海报预览"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto bg-[#f8f5ef] p-3">
              <img
                src={sharePreview.url}
                alt={`${title} 海报预览`}
                className="mx-auto h-auto w-full rounded-[22px] bg-white object-contain shadow-sm"
              />
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyShareImage}
                  disabled={busy === 'image'}
                  className="flex-1 rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy === 'image' ? '复制中…' : '复制海报'}
                </button>
                <button
                  type="button"
                  onClick={closeSharePreview}
                  className="flex-1 rounded-full border border-[var(--border-color)] bg-white px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  关闭
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">移动端可长按海报保存，桌面端可右键另存为。</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
