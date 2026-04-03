'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { RARITY_COLORS, RARITY_LABELS, type Achievement } from '@/lib/achievements'

type AchievementNotification = {
  id: string
  achievement: Achievement
}

type AchievementContextType = {
  showAchievement: (achievement: Achievement) => void
  showAchievements: (achievements: Achievement[]) => void
}

const AchievementContext = createContext<AchievementContextType | null>(null)

export function useAchievementToast() {
  const context = useContext(AchievementContext)
  if (!context) {
    throw new Error('useAchievementToast must be used within AchievementToastProvider')
  }
  return context
}

export function AchievementToastProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([])

  const showAchievement = useCallback((achievement: Achievement) => {
    const id = `${achievement.id}-${Date.now()}`
    setNotifications(prev => [...prev, { id, achievement }])
  }, [])

  const showAchievements = useCallback((achievements: Achievement[]) => {
    const newNotifications = achievements.map((achievement, index) => ({
      id: `${achievement.id}-${Date.now()}-${index}`,
      achievement,
    }))
    setNotifications(prev => [...prev, ...newNotifications])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <AchievementContext.Provider value={{ showAchievement, showAchievements }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3">
        {notifications.map(notification => (
          <AchievementToastItem
            key={notification.id}
            achievement={notification.achievement}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </AchievementContext.Provider>
  )
}

function AchievementToastItem({
  achievement,
  onClose,
}: {
  achievement: Achievement
  onClose: () => void
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const colors = RARITY_COLORS[achievement.rarity]
  const rarityLabel = RARITY_LABELS[achievement.rarity]

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true))

    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(onClose, 300)
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(onClose, 300)
  }

  return (
    <div
      className={`
        w-80 overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300
        ${colors.border} ${colors.bg}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      {/* Animated shine effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -inset-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shine_2s_ease-in-out]"
          style={{ transform: 'skewX(-20deg)' }}
        />
      </div>

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎉</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">成就解锁!</span>
          </div>
          <button
            onClick={handleClose}
            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10"
          >
            <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Achievement Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/80 text-3xl shadow-sm">
            {achievement.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold ${colors.text}`}>{achievement.name}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium bg-white/50 ${colors.text}`}>
                {rarityLabel}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{achievement.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add keyframes for shine animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes shine {
      0% { transform: translateX(-100%) skewX(-20deg); }
      100% { transform: translateX(200%) skewX(-20deg); }
    }
  `
  document.head.appendChild(style)
}
