'use client'

import { useEffect, useState } from 'react'

type ThemeIndicatorProps = {
  theme: string
}

const THEME_MESSAGES: Record<string, { title: string; subtitle: string; icon: string }> = {
  festival: {
    title: '喜庆模式',
    subtitle: '祝您节日快乐',
    icon: '🎊',
  },
  memorial: {
    title: '缅怀模式',
    subtitle: '沉痛悼念',
    icon: '🕯',
  },
}

export default function ThemeIndicator({ theme }: ThemeIndicatorProps) {
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  const message = THEME_MESSAGES[theme]

  useEffect(() => {
    if (!message) return

    const storageKey = `theme-indicator-dismissed-${theme}`
    const dismissedTime = localStorage.getItem(storageKey)
    
    // Show again after 24 hours
    if (dismissedTime && Date.now() - parseInt(dismissedTime) < 24 * 60 * 60 * 1000) {
      setDismissed(true)
      return
    }

    // Animate in
    const timer = setTimeout(() => setVisible(true), 500)
    return () => clearTimeout(timer)
  }, [message, theme])

  if (!message || dismissed) return null

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => {
      setDismissed(true)
      localStorage.setItem(`theme-indicator-dismissed-${theme}`, Date.now().toString())
    }, 300)
  }

  const isFestival = theme === 'festival'
  const isMemorial = theme === 'memorial'

  return (
    <div
      className={`
        fixed z-50 transition-all duration-500
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        ${isFestival ? 'top-[8px] left-1/2 -translate-x-1/2' : ''}
        ${isMemorial ? 'top-[100px] left-4' : ''}
      `}
    >
      <div
        className={`
          flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg backdrop-blur-md
          ${isFestival ? 'bg-gradient-to-r from-red-600/95 to-amber-500/95 text-white' : ''}
          ${isMemorial ? 'bg-black/80 text-white border border-white/20' : ''}
        `}
      >
        <span className="text-lg">{message.icon}</span>
        <div className="flex flex-col">
          <span className={`text-xs font-semibold ${isFestival ? 'text-amber-100' : 'text-gray-300'}`}>
            {message.title}
          </span>
          <span className={`text-sm font-medium ${isFestival ? 'text-white' : 'text-white/90'}`}>
            {message.subtitle}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className={`
            ml-2 p-1 rounded-full transition-colors
            ${isFestival ? 'hover:bg-white/20' : 'hover:bg-white/10'}
          `}
          aria-label="关闭提示"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
