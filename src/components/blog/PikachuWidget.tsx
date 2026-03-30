'use client'

import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

type PublicSettings = {
  saluteText: string
  clickText: string
  phrases: string[]
  chatEnabled: boolean
  panelLabel: string
  panelTitle: string
  greeting: string
  quickPrompts: string[]
  chatPlaceholder: string
  helperText: string
  closeText: string
  sendText: string
  sendingText: string
  typingText: string
}

type BubbleState = {
  text: string
  mode: 'hover' | 'click' | 'reply' | 'hint'
}

type ChatMessage = {
  role: 'assistant' | 'user'
  text: string
}

type MotionState = {
  x: number
  y: number
  scale: number
}

type PetMode = 'play' | 'hide' | 'peek' | 'curious' | 'salute' | 'chat'

type SpriteFrame = {
  id: number
  x?: number
  y?: number
  scale?: number
  flip?: boolean
}

type SpriteAnimation = {
  interval: number
  frames: SpriteFrame[]
}

const LEGACY_PANEL_TITLE = '数字分身'
const LEGACY_GREETING = '你好，我会带着你的风格陪访客聊天。'
const LEGACY_QUICK_PROMPTS = '介绍一下你自己|最近推荐读哪篇文章|你现在在忙什么'

const DEFAULT_SETTINGS: PublicSettings = {
  saluteText: '忠诚！',
  clickText: '⚡ 电击！',
  phrases: ['皮卡～皮卡丘！', '你好呀～ ⚡', '皮皮～！', '电击！⚡⚡', '皮卡丘！❤️', '要一起玩吗？'],
  chatEnabled: true,
  panelLabel: 'PIKACHU BUDDY',
  panelTitle: '网站宠物小助手',
  greeting: '皮卡～ 我会在右下角陪着你，想聊文章、心情还是网站内容？',
  quickPrompts: ['今天有什么新文章？', '帮我推荐一篇文章', '送我一句今天的鼓励'],
  chatPlaceholder: '问问皮卡丘…',
  helperText: '支持提问文章、页面功能和今日心情建议',
  closeText: '关闭',
  sendText: '发送',
  sendingText: '思考中...',
  typingText: '皮卡正在组织语言…',
}

function buildGreetingHistory(greeting: string): ChatMessage[] {
  return [{ role: 'assistant', text: greeting }]
}

const DEFAULT_HISTORY: ChatMessage[] = buildGreetingHistory(DEFAULT_SETTINGS.greeting)

const ALL_SPRITE_IDS = Array.from({ length: 46 }, (_, index) => index + 1)

const LYING_FRAME_STYLE = { y: 20, scale: 1.02 } satisfies Partial<SpriteFrame>

function sprite(id: number, extra: Partial<SpriteFrame> = {}): SpriteFrame {
  return { id, ...extra }
}

function spriteSrc(id: number) {
  return `/pets/pikachu-shimeji/shime${id}.png`
}

const PET_ANIMATION_VARIANTS: Record<PetMode, SpriteAnimation[]> = {
  play: [
    {
      interval: 260,
      frames: [sprite(1), sprite(2), sprite(3), sprite(4, { x: -3 }), sprite(3), sprite(2)],
    },
    {
      interval: 260,
      frames: [sprite(5), sprite(6), sprite(7, { y: 1 }), sprite(8), sprite(9, { x: 1 }), sprite(10), sprite(11), sprite(10)],
    },
    {
      interval: 320,
      frames: [sprite(17, { x: -1 }), sprite(18, { x: -2 }), sprite(17, { x: -1 })],
    },
    {
      interval: 340,
      frames: [sprite(19, { x: -2 }), sprite(20, { x: 1 }), sprite(21, { x: -2 }), sprite(20, { x: 1 })],
    },
    {
      interval: 320,
      frames: [sprite(22, { y: 1 }), sprite(26), sprite(27, { x: 1 }), sprite(26)],
    },
    {
      interval: 400,
      frames: [sprite(23, LYING_FRAME_STYLE), sprite(24, LYING_FRAME_STYLE), sprite(25, LYING_FRAME_STYLE), sprite(24, LYING_FRAME_STYLE)],
    },
    {
      interval: 340,
      frames: [sprite(28, { x: -1 }), sprite(27, { x: 1 }), sprite(28, { x: -1 })],
    },
    {
      interval: 320,
      frames: [sprite(33, { y: 5 }), sprite(34, { x: -16 }), sprite(35, { x: -16 }), sprite(36, { x: -16 }), sprite(35, { x: -16 })],
    },
    {
      interval: 280,
      frames: [sprite(37), sprite(38, { x: -2 }), sprite(37)],
    },
  ],
  hide: [
    {
      interval: 420,
      frames: [sprite(14), sprite(13), sprite(14)],
    },
    {
      interval: 420,
      frames: [sprite(13), sprite(15, { x: 18 }), sprite(13)],
    },
  ],
  peek: [
    {
      interval: 340,
      frames: [sprite(13), sprite(12), sprite(14), sprite(12)],
    },
    {
      interval: 340,
      frames: [sprite(13), sprite(15, { x: 18 }), sprite(16, { x: 18 }), sprite(15, { x: 18 })],
    },
  ],
  curious: [
    {
      interval: 240,
      frames: [sprite(43), sprite(44), sprite(45), sprite(46), sprite(45), sprite(44)],
    },
  ],
  salute: [
    {
      interval: 180,
      frames: [sprite(37)],
    },
  ],
  chat: [
    {
      interval: 320,
      frames: [sprite(29, { x: -1, y: -5 }), sprite(30, { y: 1 }), sprite(31), sprite(32, { y: 1 }), sprite(31), sprite(30, { y: 1 })],
    },
  ],
}

function pickAnimation(mode: PetMode, current?: SpriteAnimation | null) {
  const variants = PET_ANIMATION_VARIANTS[mode]
  if (variants.length === 1) return variants[0]

  let next = variants[Math.floor(Math.random() * variants.length)] || variants[0]

  if (current && variants.length > 1) {
    while (next === current) {
      next = variants[Math.floor(Math.random() * variants.length)] || variants[0]
    }
  }

  return next
}

function appendMessage(history: ChatMessage[], next: ChatMessage): ChatMessage[] {
  return [...history, next].slice(-12)
}

function parsePipeList(raw?: string): string[] {
  return (
    raw
      ?.split('|')
      .map(item => item.trim())
      .filter(Boolean) ?? []
  )
}

function pickText(raw: string | undefined, fallback: string, legacy?: string): string {
  const trimmed = raw?.trim()
  if (!trimmed) return fallback
  if (legacy && trimmed === legacy) return fallback
  return trimmed
}

function parseSettings(raw: Record<string, string>): PublicSettings {
  const phrases = parsePipeList(raw['ui.pikaPhrases'])
  const quickPromptSource = pickText(
    raw['mascot.quickPrompts'],
    DEFAULT_SETTINGS.quickPrompts.join('|'),
    LEGACY_QUICK_PROMPTS,
  )
  const quickPrompts = parsePipeList(quickPromptSource)

  return {
    saluteText: pickText(raw['ui.pikaSaluteText'], DEFAULT_SETTINGS.saluteText),
    clickText: pickText(raw['ui.pikaClickText'], DEFAULT_SETTINGS.clickText),
    phrases: phrases.length ? phrases : DEFAULT_SETTINGS.phrases,
    chatEnabled: raw['mascot.chatEnabled'] !== 'false',
    panelLabel: pickText(raw['mascot.panelLabel'], DEFAULT_SETTINGS.panelLabel),
    panelTitle: pickText(raw['mascot.panelTitle'], DEFAULT_SETTINGS.panelTitle, LEGACY_PANEL_TITLE),
    greeting: pickText(raw['mascot.greeting'], DEFAULT_SETTINGS.greeting, LEGACY_GREETING),
    quickPrompts: quickPrompts.length ? quickPrompts : DEFAULT_SETTINGS.quickPrompts,
    chatPlaceholder: pickText(raw['mascot.chatPlaceholder'], DEFAULT_SETTINGS.chatPlaceholder),
    helperText: pickText(raw['mascot.helperText'], DEFAULT_SETTINGS.helperText),
    closeText: pickText(raw['mascot.closeText'], DEFAULT_SETTINGS.closeText),
    sendText: pickText(raw['mascot.sendText'], DEFAULT_SETTINGS.sendText),
    sendingText: pickText(raw['mascot.sendingText'], DEFAULT_SETTINGS.sendingText),
    typingText: pickText(raw['mascot.typingText'], DEFAULT_SETTINGS.typingText),
  }
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function getRandomMotion(compact: boolean): MotionState {
  return {
    x: randomBetween(compact ? -8 : -12, compact ? 3 : 5),
    y: randomBetween(compact ? -2.5 : -4, compact ? 2.5 : 4),
    scale: randomBetween(0.99, 1.02),
  }
}

export default function PikachuWidget() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [bubble, setBubble] = useState<BubbleState | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>(DEFAULT_HISTORY)
  const [sending, setSending] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [petMode, setPetMode] = useState<PetMode>('play')
  const [motion, setMotion] = useState<MotionState>({ x: -4, y: 0, scale: 1 })
  const [hovered, setHovered] = useState(false)
  const [frameCursor, setFrameCursor] = useState(0)
  const [compact, setCompact] = useState(false)
  const [activeAnimation, setActiveAnimation] = useState<SpriteAnimation>(() => pickAnimation('play'))

  const bubbleTimerRef = useRef<number | null>(null)
  const introTimerRef = useRef<number[]>([])
  const motionTimerRef = useRef<number | null>(null)
  const frameTimerRef = useRef<number | null>(null)
  const playVariantTimerRef = useRef<number | null>(null)
  const chatBodyRef = useRef<HTMLDivElement | null>(null)
  const introPlayedRef = useRef(false)
  const hoveredRef = useRef(false)
  const panelOpenRef = useRef(false)
  const curiousTimerRef = useRef<number | null>(null)
  const seededGreetingRef = useRef(DEFAULT_SETTINGS.greeting)

  function clearBubbleTimer() {
    if (bubbleTimerRef.current !== null) {
      window.clearTimeout(bubbleTimerRef.current)
      bubbleTimerRef.current = null
    }
  }

  function clearIntroTimers() {
    introTimerRef.current.forEach(timer => window.clearTimeout(timer))
    introTimerRef.current = []
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
    return () => {
      clearBubbleTimer()
      clearIntroTimers()
      if (motionTimerRef.current !== null) {
        window.clearInterval(motionTimerRef.current)
      }
      if (frameTimerRef.current !== null) {
        window.clearInterval(frameTimerRef.current)
      }
      if (playVariantTimerRef.current !== null) {
        window.clearInterval(playVariantTimerRef.current)
      }
      if (curiousTimerRef.current !== null) {
        window.clearTimeout(curiousTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    function syncCompact() {
      setCompact(window.innerWidth < 640)
    }

    syncCompact()
    window.addEventListener('resize', syncCompact)
    return () => window.removeEventListener('resize', syncCompact)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return

    ALL_SPRITE_IDS.forEach(id => {
      const img = new window.Image()
      img.src = spriteSrc(id)
    })
  }, [mounted])

  useEffect(() => {
    hoveredRef.current = hovered
  }, [hovered])

  useEffect(() => {
    panelOpenRef.current = panelOpen
  }, [panelOpen])

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
    if (!panelOpen) return
    chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [history, panelOpen])

  useEffect(() => {
    setHistory(current => {
      if (current.length !== 1 || current[0]?.role !== 'assistant') {
        seededGreetingRef.current = settings.greeting
        return current
      }

      if (current[0].text !== seededGreetingRef.current) {
        seededGreetingRef.current = settings.greeting
        return current
      }

      seededGreetingRef.current = settings.greeting
      return buildGreetingHistory(settings.greeting)
    })
  }, [settings.greeting])

  useEffect(() => {
    if (!mounted || introPlayedRef.current) return

    introPlayedRef.current = true
    clearIntroTimers()
    setPetMode('play')
    setMotion({ x: compact ? -5 : -8, y: 0, scale: 1.01 })

    introTimerRef.current.push(
      window.setTimeout(() => {
        if (hoveredRef.current || panelOpenRef.current) return
        setPetMode('hide')
        setMotion({ x: compact ? 3 : 4, y: compact ? 1 : 2, scale: 0.99 })
      }, 1000),
    )

    introTimerRef.current.push(
      window.setTimeout(() => {
        if (hoveredRef.current || panelOpenRef.current) return
        setPetMode('peek')
        setMotion({ x: compact ? 4 : 6, y: 0, scale: 1 })
        showBubble('皮…？', 'hint', 1800)
      }, 2400),
    )

    introTimerRef.current.push(
      window.setTimeout(() => {
        if (hoveredRef.current || panelOpenRef.current) return
        setPetMode('curious')
        setMotion({ x: compact ? -4 : -5, y: -1, scale: 1.02 })
      }, 4300),
    )

    introTimerRef.current.push(
      window.setTimeout(() => {
        if (hoveredRef.current || panelOpenRef.current) return
        setPetMode('play')
      }, 6200),
    )
  }, [compact, mounted])

  useEffect(() => {
    if (curiousTimerRef.current !== null) {
      window.clearTimeout(curiousTimerRef.current)
      curiousTimerRef.current = null
    }

    if (petMode !== 'curious' || hovered || panelOpen) return

    curiousTimerRef.current = window.setTimeout(() => {
      setPetMode('play')
    }, 1800)

    return () => {
      if (curiousTimerRef.current !== null) {
        window.clearTimeout(curiousTimerRef.current)
        curiousTimerRef.current = null
      }
    }
  }, [petMode, hovered, panelOpen])

  useEffect(() => {
    setActiveAnimation(current => pickAnimation(petMode, current))
  }, [petMode])

  useEffect(() => {
    if (!mounted) return

    if (motionTimerRef.current !== null) {
      window.clearInterval(motionTimerRef.current)
      motionTimerRef.current = null
    }

    if (hovered || panelOpen || petMode !== 'play') return

    motionTimerRef.current = window.setInterval(() => {
      setMotion(getRandomMotion(compact))
    }, 3000)

    return () => {
      if (motionTimerRef.current !== null) {
        window.clearInterval(motionTimerRef.current)
        motionTimerRef.current = null
      }
    }
  }, [mounted, hovered, panelOpen, petMode, compact])

  useEffect(() => {
    if (!mounted) return

    if (playVariantTimerRef.current !== null) {
      window.clearInterval(playVariantTimerRef.current)
      playVariantTimerRef.current = null
    }

    if (petMode !== 'play' || hovered || panelOpen) return

    playVariantTimerRef.current = window.setInterval(() => {
      setActiveAnimation(current => pickAnimation('play', current))
    }, compact ? 4200 : 4800)

    return () => {
      if (playVariantTimerRef.current !== null) {
        window.clearInterval(playVariantTimerRef.current)
        playVariantTimerRef.current = null
      }
    }
  }, [compact, hovered, mounted, panelOpen, petMode])

  useEffect(() => {
    if (!mounted) return

    if (frameTimerRef.current !== null) {
      window.clearInterval(frameTimerRef.current)
      frameTimerRef.current = null
    }

    setFrameCursor(0)

    const animation = activeAnimation
    if (animation.frames.length <= 1) return

    frameTimerRef.current = window.setInterval(() => {
      setFrameCursor(current => (current + 1) % animation.frames.length)
    }, animation.interval)

    return () => {
      if (frameTimerRef.current !== null) {
        window.clearInterval(frameTimerRef.current)
        frameTimerRef.current = null
      }
    }
  }, [activeAnimation, mounted])

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

  useEffect(() => {
    if (!panelOpen && petMode === 'chat' && !hovered) {
      setPetMode('play')
    }
  }, [panelOpen, petMode, hovered])

  const currentFrame =
    activeAnimation.frames[frameCursor % activeAnimation.frames.length] || PET_ANIMATION_VARIANTS.play[0]?.frames[0]

  const stageStyle = useMemo<CSSProperties>(() => {
    const x = motion.x + (petMode === 'chat' ? -4 : 0)
    const y = motion.y + (petMode === 'salute' ? -4 : 0)

    return {
      transform: `translate3d(${x}px, ${y}px, 0) scale(${motion.scale})`,
      willChange: 'transform',
    }
  }, [motion, petMode])

  const spriteStyle = useMemo<CSSProperties>(
    () => ({
      ['--sprite-x' as string]: `${currentFrame.x ?? 0}px`,
      ['--sprite-y' as string]: `${currentFrame.y ?? 0}px`,
      ['--sprite-scale' as string]: String(currentFrame.scale ?? 1),
      ['--sprite-flip' as string]: String(currentFrame.flip ? -1 : 1),
      willChange: 'transform',
    }),
    [currentFrame],
  )

  const spriteClasses = [
    'mascot-sprite-shell',
    petMode === 'hide' ? 'mascot-sprite-shell--hide' : '',
    petMode === 'peek' ? 'mascot-sprite-shell--peek' : '',
    petMode === 'curious' ? 'mascot-sprite-shell--curious' : '',
    petMode === 'salute' ? 'mascot-sprite-shell--salute' : '',
    petMode === 'chat' ? 'mascot-sprite-shell--chat' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (!mounted) return null

  async function sendMessage(nextMessage?: string) {
    const content = (nextMessage ?? message).trim()
    if (!content || sending) return

    setMessage('')
    setSending(true)
    setPanelOpen(true)
    setPetMode('chat')
    setHistory(current => appendMessage(current, { role: 'user', text: content }))

    try {
      const res = await fetch('/api/mascot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: history.slice(-6),
        }),
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
    setHovered(true)
    setPetMode('salute')
    setMotion({ x: -8, y: -2, scale: 1.02 })
    showBubble(settings.saluteText, 'hover', 0)
  }

  function handleHoverEnd() {
    setHovered(false)
    setBubble(current => (current?.mode === 'hover' ? null : current))
    setPetMode(panelOpen ? 'chat' : 'play')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage()
  }

  function openChatPanel() {
    setPanelOpen(true)
    setPetMode('chat')
    setBubble(null)
  }

  function closeChatPanel() {
    setPanelOpen(false)
    setPetMode('play')
    setBubble(null)
  }

  function toggleChatPanel() {
    if (panelOpen) {
      closeChatPanel()
      return
    }

    openChatPanel()
  }

  function handleMessageKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    void sendMessage()
  }

  return (
    <div className="fixed bottom-0 right-[-6px] z-50 select-none sm:bottom-3 sm:right-1">
      {settings.chatEnabled && panelOpen && (
        <div className="absolute bottom-[calc(100%+14px)] right-4 w-[min(22rem,calc(100vw-1.25rem))] rounded-[28px] border border-[#f3e5bf] bg-white/95 p-4 shadow-[0_24px_60px_rgba(139,94,28,0.18)] backdrop-blur sm:right-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d39b17]">{settings.panelLabel}</p>
              <h3 className="mt-1 text-base font-semibold text-[#3f2c0d]">{settings.panelTitle}</h3>
            </div>
            <button
              type="button"
              onClick={closeChatPanel}
              className="rounded-full border border-[#f3e5bf] px-2.5 py-1 text-xs text-[#8a6a24] transition hover:bg-[#fff6dc]"
            >
              {settings.closeText}
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
                  <span>{settings.typingText}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {settings.quickPrompts.map(prompt => (
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
              onKeyDown={handleMessageKeyDown}
              placeholder={settings.chatPlaceholder}
              className="w-full resize-none rounded-2xl border border-[#efe2c0] bg-[#fffef9] px-3 py-2.5 text-sm text-[#3f2c0d] outline-none transition focus:border-[#efc24b] focus:ring-2 focus:ring-[#f6e2a3]"
              maxLength={300}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[#b19561]">{settings.helperText}</span>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="rounded-full bg-[#f6c945] px-4 py-2 text-sm font-medium text-[#5b3d05] transition hover:bg-[#efbf2f] disabled:cursor-not-allowed disabled:bg-[#f0e4b5] disabled:text-[#9a8248]"
              >
                {sending ? settings.sendingText : settings.sendText}
              </button>
            </div>
          </form>
        </div>
      )}

      {bubble && (
        <div className="absolute bottom-[calc(100%+16px)] right-3 w-[min(14rem,calc(100vw-2.75rem))] rounded-[22px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(255,247,226,0.98))] px-4 py-3 text-[13px] leading-5 text-[#6a4919] shadow-[0_18px_40px_rgba(184,136,52,0.15)] backdrop-blur-xl sm:bottom-[calc(100%+20px)] sm:right-8 sm:w-[15.5rem] sm:px-4 sm:py-3 sm:text-sm sm:leading-6">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />
          <div className="relative font-semibold tracking-[0.01em]">{bubble.text}</div>
          <div className="absolute bottom-[-7px] right-7 h-4 w-4 rotate-45 rounded-[4px] border-b border-r border-white/80 bg-[#fff3db] shadow-[8px_10px_20px_rgba(184,136,52,0.08)] sm:right-10" />
        </div>
      )}

      <div className="relative">
        <div className="relative h-[94px] w-[120px] sm:h-[156px] sm:w-[194px]">
          <button
            type="button"
            onMouseEnter={handleHoverStart}
            onMouseLeave={handleHoverEnd}
            onFocus={handleHoverStart}
            onBlur={handleHoverEnd}
            onClick={() => {
              if (settings.chatEnabled) {
                toggleChatPanel()
                return
              }
            }}
            aria-label="打开皮卡丘宠物"
            className="absolute inset-0 overflow-visible bg-transparent"
          >
            <div className="pointer-events-none absolute bottom-[5px] right-[16px] h-4 w-[64px] rounded-full bg-[radial-gradient(circle,rgba(139,106,44,0.14),transparent_72%)] blur-[3px] sm:bottom-[12px] sm:right-[32px] sm:h-7 sm:w-[98px]" />
            <div className="pointer-events-none absolute bottom-[0] right-[12px] h-[64px] w-[82px] rounded-[22px] bg-[radial-gradient(circle_at_52%_38%,rgba(255,255,255,0.78),rgba(255,255,255,0)_72%)] sm:bottom-[10px] sm:right-[28px] sm:h-[104px] sm:w-[126px]" />

            <div className="mascot-stage" style={stageStyle}>
              <div className={spriteClasses} style={spriteStyle}>
                <div className="mascot-aura" />
                <img
                  src={spriteSrc(currentFrame.id)}
                  alt="皮卡丘像素宠物"
                  draggable={false}
                  loading="eager"
                  decoding="async"
                  className="mascot-sprite"
                />
              </div>
            </div>

          </button>
        </div>
      </div>

      <style jsx>{`
        .mascot-stage {
          position: absolute;
          right: 10px;
          bottom: 3px;
          z-index: 2;
          width: 92px;
          height: 92px;
          transition: transform 0.72s cubic-bezier(0.22, 0.61, 0.36, 1);
          transform-origin: 78% 100%;
        }

        .mascot-sprite-shell {
          position: relative;
          width: 100%;
          height: 100%;
          --mode-x: 0px;
          --mode-y: 0px;
        }

        .mascot-sprite-shell--hide {
          --mode-x: 40px;
          --mode-y: 2px;
        }

        .mascot-sprite-shell--peek {
          --mode-x: 22px;
          --mode-y: 1px;
        }

        .mascot-sprite-shell--curious {
          --mode-x: -2px;
        }

        .mascot-sprite-shell--salute {
          --mode-y: -4px;
        }

        .mascot-sprite-shell--chat {
          --mode-x: -4px;
          --mode-y: 1px;
        }

        .mascot-aura {
          position: absolute;
          left: 8px;
          bottom: 14px;
          width: 50px;
          height: 50px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 236, 149, 0.25), rgba(255, 236, 149, 0) 72%);
          filter: blur(8px);
          opacity: 0.9;
        }

        .mascot-sprite {
          position: absolute;
          right: -6px;
          bottom: -1px;
          width: 92px;
          height: 92px;
          image-rendering: pixelated;
          object-fit: contain;
          filter: drop-shadow(0 10px 14px rgba(112, 76, 14, 0.16));
          transform: translate3d(
              calc(var(--sprite-x, 0px) + var(--mode-x, 0px)),
              calc(var(--sprite-y, 0px) + var(--mode-y, 0px)),
              0
            )
            scaleX(var(--sprite-flip, 1)) scale(var(--sprite-scale, 1));
          transform-origin: 72% 100%;
          transition: transform 0.16s steps(1), filter 0.25s ease;
        }

        .mascot-sprite-shell--salute .mascot-sprite,
        .mascot-sprite-shell--curious .mascot-sprite {
          filter: drop-shadow(0 14px 22px rgba(112, 76, 14, 0.2));
        }

        @media (min-width: 640px) {
          .mascot-stage {
            right: 22px;
            bottom: 6px;
            width: 136px;
            height: 136px;
          }

          .mascot-sprite-shell--hide {
            --mode-x: 52px;
          }

          .mascot-sprite-shell--peek {
            --mode-x: 30px;
          }

          .mascot-aura {
            left: 18px;
            bottom: 24px;
            width: 76px;
            height: 76px;
            filter: blur(14px);
          }

          .mascot-sprite {
            right: -10px;
            bottom: -2px;
            width: 136px;
            height: 136px;
            filter: drop-shadow(0 16px 26px rgba(112, 76, 14, 0.2));
          }

        }
      `}</style>
    </div>
  )
}
