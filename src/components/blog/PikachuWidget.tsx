'use client'

import Image from 'next/image'
import { FormEvent, useEffect, useRef, useState } from 'react'

type PublicSettings = {
  saluteText: string
  clickText: string
  phrases: string[]
  chatEnabled: boolean
  chatPlaceholder: string
}

type BubbleState = {
  text: string
  mode: 'hover' | 'click' | 'reply' | 'hint'
}

type WidgetPosition = {
  x: number
  y: number
}

type ChatMessage = {
  role: 'assistant' | 'user'
  text: string
}

type DragState = {
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

const STORAGE_KEY = 'pikachu-widget-position-v2'
const WIDGET_SIZE = 88
const EDGE_GAP = 16
const QUICK_PROMPTS = [
  '今天有什么新文章？',
  '帮我推荐一篇文章',
  '送我一句今天的鼓励',
]

const DEFAULT_SETTINGS: PublicSettings = {
  saluteText: '忠诚！',
  clickText: '⚡ 电击！',
  phrases: ['皮卡～皮卡丘！', '你好呀～ ⚡', '皮皮～！', '电击！⚡⚡', '皮卡丘！❤️', '要一起玩吗？'],
  chatEnabled: true,
  chatPlaceholder: '问问皮卡丘…',
}

const DEFAULT_HISTORY: ChatMessage[] = [
  { role: 'assistant', text: '皮卡～ 我在这儿，想聊文章、心情还是网站内容？' },
]

function appendMessage(history: ChatMessage[], next: ChatMessage): ChatMessage[] {
  return [...history, next].slice(-12)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getDefaultPosition(width: number, height: number): WidgetPosition {
  return {
    x: Math.max(EDGE_GAP, width - WIDGET_SIZE - 24),
    y: Math.max(EDGE_GAP, height - WIDGET_SIZE - 28),
  }
}

function clampPosition(position: WidgetPosition, width: number, height: number): WidgetPosition {
  return {
    x: clamp(position.x, EDGE_GAP, Math.max(EDGE_GAP, width - WIDGET_SIZE - EDGE_GAP)),
    y: clamp(position.y, EDGE_GAP, Math.max(EDGE_GAP, height - WIDGET_SIZE - EDGE_GAP)),
  }
}

function parseSettings(raw: Record<string, string>): PublicSettings {
  const phrases = raw['ui.pikaPhrases']
    ?.split('|')
    .map(item => item.trim())
    .filter(Boolean)

  return {
    saluteText: raw['ui.pikaSaluteText']?.trim() || DEFAULT_SETTINGS.saluteText,
    clickText: raw['ui.pikaClickText']?.trim() || DEFAULT_SETTINGS.clickText,
    phrases: phrases?.length ? phrases : DEFAULT_SETTINGS.phrases,
    chatEnabled: raw['mascot.chatEnabled'] !== 'false',
    chatPlaceholder: raw['mascot.chatPlaceholder']?.trim() || DEFAULT_SETTINGS.chatPlaceholder,
  }
}

export default function PikachuWidget() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [position, setPosition] = useState<WidgetPosition | null>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [bubble, setBubble] = useState<BubbleState | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>(DEFAULT_HISTORY)
  const [sending, setSending] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [mounted, setMounted] = useState(false)

  const bubbleTimerRef = useRef<number | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const skipClickRef = useRef(false)
  const chatBodyRef = useRef<HTMLDivElement | null>(null)

  function clearBubbleTimer() {
    if (bubbleTimerRef.current !== null) {
      window.clearTimeout(bubbleTimerRef.current)
      bubbleTimerRef.current = null
    }
  }

  function showBubble(text: string, mode: BubbleState['mode'], duration = 2600) {
    clearBubbleTimer()
    setBubble({ text, mode })
    if (duration > 0) {
      bubbleTimerRef.current = window.setTimeout(() => {
        setBubble(current => (current?.text === text ? null : current))
      }, duration)
    }
  }

  useEffect(() => {
    setMounted(true)

    const width = window.innerWidth
    const height = window.innerHeight
    const basePosition = getDefaultPosition(width, height)
    const saved = window.localStorage.getItem(STORAGE_KEY)

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<WidgetPosition>
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(clampPosition({ x: parsed.x, y: parsed.y }, width, height))
        } else {
          setPosition(basePosition)
        }
      } catch {
        setPosition(basePosition)
      }
    } else {
      setPosition(basePosition)
    }

    setViewport({ width, height })

    const resize = () => {
      const nextWidth = window.innerWidth
      const nextHeight = window.innerHeight
      setViewport({ width: nextWidth, height: nextHeight })
      setPosition(current => clampPosition(current || getDefaultPosition(nextWidth, nextHeight), nextWidth, nextHeight))
    }

    window.addEventListener('resize', resize)
    return () => {
      clearBubbleTimer()
      window.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    let cancelled = false

    fetch('/api/settings/public', { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load settings')
        return res.json()
      })
      .then((data: Record<string, string>) => {
        if (!cancelled) setSettings(parseSettings(data))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted || !position) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
  }, [mounted, position])

  useEffect(() => {
    if (!panelOpen) return
    chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [history, panelOpen])

  useEffect(() => {
    if (!dragging) return

    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag || viewport.width === 0 || viewport.height === 0) return

      const deltaX = event.clientX - drag.startX
      const deltaY = event.clientY - drag.startY
      const nextPosition = clampPosition(
        { x: drag.originX + deltaX, y: drag.originY + deltaY },
        viewport.width,
        viewport.height
      )

      if (!drag.moved && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
        drag.moved = true
        skipClickRef.current = true
        setBubble(null)
      }

      setPosition(nextPosition)
    }

    function handlePointerEnd() {
      const drag = dragRef.current
      dragRef.current = null
      setDragging(false)
      if (drag?.moved) {
        showBubble('位置记住啦，皮卡！', 'hint', 1600)
      }
      window.setTimeout(() => {
        skipClickRef.current = false
      }, 20)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [dragging, viewport.height, viewport.width])

  useEffect(() => {
    if (!panelOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setPanelOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [panelOpen])

  useEffect(() => {
    if (!settings.chatEnabled) setPanelOpen(false)
  }, [settings.chatEnabled])

  if (!mounted || !position) return null

  const panelAlign =
    viewport.width === 0 || position.x > viewport.width / 2
      ? 'right-0 origin-bottom-right'
      : 'left-0 origin-bottom-left'

  async function sendMessage(nextMessage?: string) {
    const content = (nextMessage ?? message).trim()
    if (!content || sending) return

    setMessage('')
    setSending(true)
    setPanelOpen(true)
    setHistory(current => appendMessage(current, { role: 'user', text: content }))

    try {
      const res = await fetch('/api/mascot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      })

      const data = await res.json().catch(() => ({}))
      const reply =
        typeof data.reply === 'string' && data.reply.trim()
          ? data.reply.trim()
          : '皮卡……刚才信号有点抖，再问我一次吧。'

      setHistory(current => appendMessage(current, { role: 'assistant', text: reply }))
      showBubble(reply, 'reply', 4200)
    } catch {
      const fallback = '皮卡……网络抖了一下，再试一次吧。'
      setHistory(current => appendMessage(current, { role: 'assistant', text: fallback }))
      showBubble(fallback, 'reply', 3200)
    } finally {
      setSending(false)
    }
  }

  function handleHoverStart() {
    if (dragging || panelOpen) return
    clearBubbleTimer()
    setBubble({ text: settings.saluteText, mode: 'hover' })
  }

  function handleHoverEnd() {
    setBubble(current => (current?.mode === 'hover' ? null : current))
  }

  function handleAvatarClick() {
    if (skipClickRef.current) return
    const randomPhrase = settings.phrases[Math.floor(Math.random() * settings.phrases.length)] || settings.clickText
    showBubble(randomPhrase, 'click')
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!position) return
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    }
    setDragging(true)
  }

  function resetPosition() {
    const next = getDefaultPosition(window.innerWidth, window.innerHeight)
    setPosition(next)
    showBubble('归位完成～', 'hint', 1600)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage()
  }

  return (
    <div
      className="fixed z-50 select-none"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {bubble && (
        <div className="absolute -top-24 left-1/2 w-56 -translate-x-1/2 rounded-2xl border border-[#f1dca1] bg-[#fffaf0] px-4 py-2.5 text-sm leading-6 text-[#6f4d15] shadow-[0_14px_30px_rgba(202,142,32,0.18)]">
          <div className="font-medium">{bubble.text}</div>
          <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[#f1dca1] bg-[#fffaf0]" />
        </div>
      )}

      {settings.chatEnabled && panelOpen && (
        <div
          className={`absolute bottom-[calc(100%+18px)] w-[min(22rem,calc(100vw-2rem))] rounded-[28px] border border-[#f3e5bf] bg-white/95 p-4 shadow-[0_24px_60px_rgba(139,94,28,0.18)] backdrop-blur ${panelAlign}`}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d39b17]">Pikachu Buddy</p>
              <h3 className="mt-1 text-base font-semibold text-[#3f2c0d]">网站宠物小助手</h3>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-full border border-[#f3e5bf] px-2.5 py-1 text-xs text-[#8a6a24] transition hover:bg-[#fff6dc]"
            >
              关闭
            </button>
          </div>

          <div
            ref={chatBodyRef}
            className="mb-3 max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-[#fffaf0] p-3"
          >
            {history.map((item, index) => (
              <div key={`${item.role}-${index}`} className={item.role === 'user' ? 'text-right' : 'text-left'}>
                <div
                  className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                    item.role === 'user'
                      ? 'bg-[#f6c945] text-[#5b3d05]'
                      : 'bg-white text-[#5a4f42] shadow-[0_8px_20px_rgba(90,79,66,0.08)]'
                  }`}
                >
                  {item.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="text-left">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-[#8c7d68] shadow-[0_8px_20px_rgba(90,79,66,0.08)]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#f6c945]" />
                  <span>皮卡正在组织语言…</span>
                </div>
              </div>
            )}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendMessage(prompt)}
                disabled={sending}
                className="rounded-full border border-[#f3e5bf] bg-[#fffdf6] px-3 py-1.5 text-xs text-[#8a6a24] transition hover:border-[#efc24b] hover:bg-[#fff2bf] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
              rows={3}
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder={settings.chatPlaceholder}
              className="w-full resize-none rounded-2xl border border-[#efe2c0] bg-[#fffef9] px-3 py-2.5 text-sm text-[#3f2c0d] outline-none transition focus:border-[#efc24b] focus:ring-2 focus:ring-[#f6e2a3]"
              maxLength={300}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[#b19561]">支持提问文章、页面功能和今日心情建议</span>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="rounded-full bg-[#f6c945] px-4 py-2 text-sm font-medium text-[#5b3d05] transition hover:bg-[#efbf2f] disabled:cursor-not-allowed disabled:bg-[#f0e4b5] disabled:text-[#9a8248]"
              >
                {sending ? '思考中...' : '发送'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative flex items-end gap-2">
        <div className="mb-2 flex flex-col gap-2">
          {settings.chatEnabled && (
            <button
              type="button"
              onClick={() => setPanelOpen(current => !current)}
              className="rounded-full border border-[#f3e5bf] bg-white/95 px-3 py-1.5 text-xs font-medium text-[#8a6a24] shadow-[0_12px_24px_rgba(90,79,66,0.1)] transition hover:-translate-y-0.5 hover:bg-[#fff8de]"
            >
              聊天
            </button>
          )}
          <button
            type="button"
            onClick={resetPosition}
            className="rounded-full border border-[#f3e5bf] bg-white/95 px-3 py-1.5 text-xs font-medium text-[#8a6a24] shadow-[0_12px_24px_rgba(90,79,66,0.1)] transition hover:-translate-y-0.5 hover:bg-[#fff8de]"
          >
            归位
          </button>
        </div>

        <button
          type="button"
          onPointerDown={handlePointerDown}
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
          onFocus={handleHoverStart}
          onBlur={handleHoverEnd}
          onClick={handleAvatarClick}
          aria-label="打开皮卡丘宠物"
          className={`group relative h-[88px] w-[88px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff7c9,transparent_45%),linear-gradient(180deg,#ffe56f,#f5b619)] p-2 shadow-[0_22px_50px_rgba(214,160,29,0.4)] transition ${
            dragging ? 'cursor-grabbing scale-105' : 'cursor-grab hover:-translate-y-1'
          }`}
        >
          <div className="absolute inset-0 rounded-full border border-[#f3d768] bg-[radial-gradient(circle,#fff7ce_0%,transparent_60%)] opacity-80" />
          <div className="absolute -right-0.5 top-2 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#68c971] shadow-sm" />
          <div className="absolute -left-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#fff5bf]/70 blur-md transition group-hover:scale-125" />
          <Image
            src="/pikachu-doll.png"
            alt="皮卡丘网站宠物"
            fill
            sizes="88px"
            priority
            className="rounded-full object-contain drop-shadow-[0_10px_16px_rgba(102,72,9,0.28)]"
          />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#5b3d05] px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-[#fff4c8]">
            DRAG
          </span>
        </button>
      </div>
    </div>
  )
}
