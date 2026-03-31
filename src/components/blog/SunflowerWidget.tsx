'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { collectClientDeviceInfo, getClientDeviceInfoSync } from '@/lib/client-device'
import SunflowerIllustration from './SunflowerIllustration'

type SunflowerState = {
  stage: number
  name: string
  emoji: string
  totalCount: number
  progressCurrent: number
  progressMax: number
  progressPct: number
  isMax: boolean
  nextNeeded: number
  success?: boolean
  unavailable?: boolean
  message?: string
  alreadyDone?: boolean
}

const DEFAULT_ACTIONS = [
  { key: 'water',     label: '浇水',   icon: '💧', color: 'hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100',   feedback: '滋润了！🌊' },
  { key: 'fertilize', label: '施肥',   icon: '💩', color: 'hover:bg-amber-50 hover:border-amber-300 active:bg-amber-100', feedback: '营养充足！✨' },
  { key: 'sun',       label: '晒太阳', icon: '☀️', color: 'hover:bg-yellow-50 hover:border-yellow-300 active:bg-yellow-100', feedback: '沐浴阳光！🌤' },
]

const STAGE_DESCRIPTIONS = [
  '一颗小种子静静等待…',
  '嫩芽破土而出，生命开始了！',
  '茎干挺立，努力向上生长中',
  '叶片舒展，在阳光下呼吸',
  '花骨朵含苞待放，快开了！',
  '盛开啦！感谢所有人的照顾 🌻',
]

function buildFallbackState(message = '向日葵今天在休息，晚一点再来看看它吧。'): SunflowerState {
  return {
    stage: 0,
    name: '种子',
    emoji: '🌰',
    totalCount: 0,
    progressCurrent: 0,
    progressMax: 10,
    progressPct: 0,
    isMax: false,
    nextNeeded: 10,
    success: false,
    unavailable: true,
    message,
    alreadyDone: false,
  }
}

export default function SunflowerWidget() {
  const deviceInfoRef = useRef(getClientDeviceInfoSync())
  const [state, setState] = useState<SunflowerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [justLeveledUp, setJustLeveledUp] = useState(false)
  const [shake, setShake] = useState(false)
  const [actions, setActions] = useState(DEFAULT_ACTIONS)
  const [doneText, setDoneText] = useState('你已经照顾过向日葵啦 🌸')
  const [serviceMessage, setServiceMessage] = useState<string | null>(null)

  // 从公开 API 拉取文案
  useEffect(() => {
    fetch('/api/settings/public')
      .then(r => r.json())
      .then(data => {
        setActions(prev => prev.map((a, i) => ({
          ...a,
          feedback: [data['ui.sfWaterText'], data['ui.sfFertilizeText'], data['ui.sfSunText']][i] || a.feedback,
        })))
        if (data['ui.sfDoneText']) setDoneText(data['ui.sfDoneText'])
      })
      .catch(() => {})
  }, [])

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/sunflower')
      const data = await res.json().catch(() => null)

      if (data) {
        setState(data)
        setServiceMessage(data.unavailable ? (data.message || '向日葵今天在休息，晚一点再来看看它吧。') : null)
      } else {
        const fallback = buildFallbackState()
        setState(fallback)
        setServiceMessage(fallback.message || null)
      }
    } catch {
      const fallback = buildFallbackState()
      setState(fallback)
      setServiceMessage(fallback.message || null)
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchState()
    // 每 30 秒轮询一次
    const interval = setInterval(fetchState, 30000)
    return () => clearInterval(interval)
  }, [fetchState])

  useEffect(() => {
    let disposed = false
    void collectClientDeviceInfo().then(deviceInfo => {
      if (!disposed && deviceInfo) {
        deviceInfoRef.current = deviceInfo
      }
    })
    return () => {
      disposed = true
    }
  }, [])

  async function interact(action: string, actionFeedback: string) {
    if (acting || alreadyDone) {
      if (alreadyDone) {
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
      return
    }
    setActing(true)

    try {
      const res = await fetch('/api/sunflower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, deviceInfo: deviceInfoRef.current }),
      })
      const data = await res.json()

      if (data.unavailable) {
        setState(data)
        setServiceMessage(data.message || '向日葵今天先休息一下，稍后再来看看它吧。')
        setFeedback(data.message || '向日葵今天先休息一下，稍后再来看看它吧。')
      } else if (data.alreadyDone) {
        setAlreadyDone(true)
        setFeedback(doneText)
      } else {
        const prevStage = state?.stage ?? 0
        setState(data)
        setServiceMessage(null)
        setFeedback(actionFeedback)
        if (data.stage > prevStage) {
          setJustLeveledUp(true)
          setTimeout(() => setJustLeveledUp(false), 3000)
        }
      }
    } catch {
      setFeedback('网络错误，请重试')
    } finally {
      setActing(false)
      setTimeout(() => setFeedback(null), 2500)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-bg)] p-6 text-center shadow-[0_10px_30px_var(--card-shadow)]">
        <div className="text-3xl mb-2 animate-pulse">🌱</div>
        <p className="text-xs text-[var(--text-subtle)]">加载中…</p>
      </div>
    )
  }

  const currentState = state ?? buildFallbackState()

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-bg)] shadow-[0_10px_30px_var(--card-shadow)]">
      {/* 升级庆祝横幅 */}
      {justLeveledUp && (
        <div className="bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 text-center py-2 animate-bounce">
          <span className="text-sm font-medium text-orange-800">
            🎉 向日葵成长到新阶段啦！
          </span>
        </div>
      )}

      <div className="p-5">
        {/* 向日葵插图 */}
        <div className={`relative mb-2 ${shake ? 'animate-bounce' : ''}`}>
          <SunflowerIllustration stage={currentState.stage} />

          {/* 浮动反馈文字 */}
          {feedback && (
            <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-3">
              <div className="max-w-full animate-bounce rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-bg)] px-3 py-1 text-center text-xs text-[var(--text-secondary)] shadow-sm">
                <span className="block max-w-full whitespace-normal break-words">
                  {feedback}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 阶段信息 */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-xl">{currentState.emoji}</span>
            <span className="font-serif text-base font-medium text-[var(--text-primary)]">{currentState.name}阶段</span>
          </div>
          <p className="text-xs text-[var(--text-subtle)]">{STAGE_DESCRIPTIONS[currentState.stage]}</p>
          {serviceMessage && !currentState.unavailable && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-[#9a6a13]">
              {serviceMessage}
            </p>
          )}
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-xs text-[var(--text-muted)]">
              已有 <span className="font-medium text-[var(--accent)]">{currentState.totalCount}</span> 人照顾
            </span>
            {!currentState.isMax && (
              <span className="text-xs text-[var(--text-faint)]">
                还差 {currentState.nextNeeded} 人
              </span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
            <div
              className="h-2 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${currentState.progressPct}%`,
                background: currentState.isMax
                  ? 'linear-gradient(90deg, #f5c800, #f59200)'
                  : 'linear-gradient(90deg, #a8d840, #5aaa28)',
              }}
            />
          </div>
          {!currentState.isMax && (
            <div className="flex justify-between mt-1">
              {/* 阶段节点 */}
              <span className="text-[10px] text-[var(--text-faint)]">{currentState.totalCount - currentState.progressCurrent}</span>
              <span className="text-[10px] text-[var(--text-faint)]">{currentState.totalCount - currentState.progressCurrent + currentState.progressMax}</span>
            </div>
          )}
        </div>

        {/* 互动按钮 */}
        {currentState.unavailable ? (
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted-bg)] px-4 py-3 text-center">
            <p className="text-sm text-[var(--text-muted)]">向日葵今天在安静晒太阳</p>
            <p className="mt-0.5 text-xs text-[var(--text-faint)]">互动功能正在整理中，晚一点再来看看它吧。</p>
          </div>
        ) : alreadyDone ? (
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted-bg)] px-4 py-3 text-center">
            <p className="text-sm text-[var(--text-subtle)]">{doneText}</p>
            <p className="mt-0.5 text-xs text-[var(--text-faint)]">感谢你的爱护！</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {actions.map(a => (
              <button
                key={a.key}
                onClick={() => interact(a.key, a.feedback)}
                disabled={acting}
                className={`flex flex-col items-center gap-1 rounded-xl border border-[var(--border-soft)] py-3 text-center transition-all disabled:opacity-60 ${a.color} active:scale-95`}
              >
                <span className="text-xl leading-none">{a.icon}</span>
                <span className="text-xs text-[var(--text-secondary)]">{a.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 阶段里程碑展示 */}
        <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
          <p className="mb-2 text-center text-[10px] text-[var(--text-faint)]">成长历程</p>
          <div className="flex justify-between items-center">
            {['🌰', '🌱', '🌿', '🍃', '🌼', '🌻'].map((emoji, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className={`text-base leading-none transition-all ${i <= currentState.stage ? 'opacity-100' : 'opacity-25 grayscale'}`}>
                  {emoji}
                </span>
                {i < 5 && (
                  <div className={`mt-1 h-px w-4 ${i < currentState.stage ? 'bg-[#5aaa28]' : 'bg-[var(--surface-soft)]'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
