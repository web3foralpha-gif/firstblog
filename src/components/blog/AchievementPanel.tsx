'use client'

import { useState, useEffect, useCallback } from 'react'
import { ACHIEVEMENTS, RARITY_COLORS, RARITY_LABELS, type Achievement } from '@/lib/achievements'

type UnlockedAchievement = {
  achievement: Achievement
  unlockedAt: string
}

type AchievementData = {
  unlocked: UnlockedAchievement[]
  locked: Achievement[]
  stats: {
    totalWatering: number
    totalFertilizing: number
    totalSunbathing: number
    totalPetClicks: number
    totalComments: number
    totalGuestbook: number
    totalArticleReads: number
    totalLikes: number
    consecutiveDays: number
  }
}

export default function AchievementPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'unlocked' | 'locked'>('unlocked')

  const fetchAchievements = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/achievements')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && !data) {
      fetchAchievements()
    }
  }, [isOpen, data, fetchAchievements])

  const unlockedCount = data?.unlocked.length || 0
  const totalCount = ACHIEVEMENTS.length

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface-bg)] shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:bottom-28 sm:right-6"
        aria-label="查看成就"
      >
        <span className="text-xl">🏅</span>
        {unlockedCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
            {unlockedCount}
          </span>
        )}
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-bg)] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--surface-bg)] px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">我的成就</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    已解锁 {unlockedCount} / {totalCount}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-soft)]"
                >
                  <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setActiveTab('unlocked')}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === 'unlocked'
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]'
                  }`}
                >
                  已解锁 ({unlockedCount})
                </button>
                <button
                  onClick={() => setActiveTab('locked')}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === 'locked'
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]'
                  }`}
                >
                  未解锁 ({totalCount - unlockedCount})
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(80vh - 140px)' }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                </div>
              ) : activeTab === 'unlocked' ? (
                <div className="space-y-3">
                  {data?.unlocked.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-4xl mb-3">🔒</p>
                      <p className="text-[var(--text-muted)]">还没有解锁任何成就</p>
                      <p className="mt-1 text-sm text-[var(--text-subtle)]">与向日葵和皮卡丘互动来解锁成就吧</p>
                    </div>
                  ) : (
                    data?.unlocked.map(({ achievement, unlockedAt }) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        unlocked
                        unlockedAt={new Date(unlockedAt)}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {data?.locked.map(achievement => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      unlocked={false}
                      stats={data.stats}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function AchievementCard({
  achievement,
  unlocked,
  unlockedAt,
  stats,
}: {
  achievement: Achievement
  unlocked: boolean
  unlockedAt?: Date
  stats?: AchievementData['stats']
}) {
  const colors = RARITY_COLORS[achievement.rarity]
  const rarityLabel = RARITY_LABELS[achievement.rarity]

  const getProgress = () => {
    if (!stats) return null
    const mapping: Record<string, keyof typeof stats> = {
      watering: 'totalWatering',
      fertilizing: 'totalFertilizing',
      sunbathing: 'totalSunbathing',
      pet_clicks: 'totalPetClicks',
      comments: 'totalComments',
      guestbook: 'totalGuestbook',
      article_reads: 'totalArticleReads',
      likes: 'totalLikes',
      consecutive_days: 'consecutiveDays',
    }
    const field = mapping[achievement.requirement.type]
    if (!field) return null
    const current = stats[field]
    const required = achievement.requirement.count
    return { current, required, percentage: Math.min(100, Math.round((current / required) * 100)) }
  }

  const progress = !unlocked ? getProgress() : null

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        unlocked
          ? `${colors.bg} ${colors.border}`
          : 'border-[var(--border-soft)] bg-[var(--surface-soft)] opacity-70'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${
            unlocked ? 'bg-white/80 shadow-sm' : 'bg-[var(--surface-bg)] grayscale'
          }`}
        >
          {achievement.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium ${unlocked ? colors.text : 'text-[var(--text-muted)]'}`}>
              {achievement.name}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                unlocked ? `${colors.bg} ${colors.text}` : 'bg-[var(--surface-bg)] text-[var(--text-subtle)]'
              }`}
            >
              {rarityLabel}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{achievement.description}</p>
          
          {unlocked && unlockedAt && (
            <p className="mt-1.5 text-xs text-[var(--text-subtle)]">
              {unlockedAt.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} 解锁
            </p>
          )}
          
          {!unlocked && progress && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-subtle)]">
                <span>进度</span>
                <span>{progress.current} / {progress.required}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
