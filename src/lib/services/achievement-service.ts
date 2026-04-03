import 'server-only'
import { prisma } from '@/lib/prisma'
import { ACHIEVEMENTS, type Achievement, getAchievementById } from '@/lib/achievements'

type StatField = 
  | 'totalWatering'
  | 'totalFertilizing'
  | 'totalSunbathing'
  | 'totalPetClicks'
  | 'totalComments'
  | 'totalGuestbook'
  | 'totalArticleReads'
  | 'totalLikes'
  | 'consecutiveDays'

const STAT_TO_FIELD: Record<string, StatField> = {
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

export async function getOrCreateVisitorStats(visitorId: string) {
  return prisma.visitorStats.upsert({
    where: { visitorId },
    create: { visitorId },
    update: {},
  })
}

export async function incrementVisitorStat(visitorId: string, statType: string): Promise<Achievement[]> {
  const field = STAT_TO_FIELD[statType]
  if (!field) return []
  
  // Increment the stat
  const stats = await prisma.visitorStats.upsert({
    where: { visitorId },
    create: { visitorId, [field]: 1 },
    update: { [field]: { increment: 1 } },
  })
  
  // Check for newly unlocked achievements
  const newAchievements = await checkAndUnlockAchievements(visitorId, stats)
  return newAchievements
}

export async function updateConsecutiveDays(visitorId: string): Promise<Achievement[]> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const stats = await getOrCreateVisitorStats(visitorId)
  
  if (stats.lastVisitDate) {
    const lastVisit = new Date(stats.lastVisitDate)
    const lastVisitDay = new Date(lastVisit.getFullYear(), lastVisit.getMonth(), lastVisit.getDate())
    const diffDays = Math.floor((today.getTime() - lastVisitDay.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      // Consecutive day
      const updatedStats = await prisma.visitorStats.update({
        where: { visitorId },
        data: {
          consecutiveDays: { increment: 1 },
          lastVisitDate: now,
        },
      })
      return checkAndUnlockAchievements(visitorId, updatedStats)
    } else if (diffDays > 1) {
      // Break in streak
      await prisma.visitorStats.update({
        where: { visitorId },
        data: {
          consecutiveDays: 1,
          lastVisitDate: now,
        },
      })
    }
    // Same day, no update needed
  } else {
    // First visit
    await prisma.visitorStats.update({
      where: { visitorId },
      data: {
        consecutiveDays: 1,
        lastVisitDate: now,
      },
    })
  }
  
  return []
}

async function checkAndUnlockAchievements(
  visitorId: string, 
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
): Promise<Achievement[]> {
  const existingAchievements = await prisma.visitorAchievement.findMany({
    where: { visitorId },
    select: { achievementId: true },
  })
  const existingIds = new Set(existingAchievements.map(a => a.achievementId))
  
  const newlyUnlocked: Achievement[] = []
  
  for (const achievement of ACHIEVEMENTS) {
    if (existingIds.has(achievement.id)) continue
    
    const field = STAT_TO_FIELD[achievement.requirement.type]
    if (!field) continue
    
    const currentValue = stats[field]
    if (currentValue >= achievement.requirement.count) {
      try {
        await prisma.visitorAchievement.create({
          data: {
            visitorId,
            achievementId: achievement.id,
          },
        })
        newlyUnlocked.push(achievement)
      } catch {
        // Already exists (race condition), ignore
      }
    }
  }
  
  return newlyUnlocked
}

export async function getVisitorAchievements(visitorId: string): Promise<{
  unlocked: Array<{ achievement: Achievement; unlockedAt: Date }>
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
}> {
  const [achievements, stats] = await Promise.all([
    prisma.visitorAchievement.findMany({
      where: { visitorId },
    }),
    getOrCreateVisitorStats(visitorId),
  ])
  
  const unlockedIds = new Set(achievements.map(a => a.achievementId))
  
  const unlocked = achievements
    .map(a => {
      const achievement = getAchievementById(a.achievementId)
      if (!achievement) return null
      return { achievement, unlockedAt: a.unlockedAt }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
  
  const locked = ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id))
  
  return {
    unlocked,
    locked,
    stats: {
      totalWatering: stats.totalWatering,
      totalFertilizing: stats.totalFertilizing,
      totalSunbathing: stats.totalSunbathing,
      totalPetClicks: stats.totalPetClicks,
      totalComments: stats.totalComments,
      totalGuestbook: stats.totalGuestbook,
      totalArticleReads: stats.totalArticleReads,
      totalLikes: stats.totalLikes,
      consecutiveDays: stats.consecutiveDays,
    },
  }
}

export async function getAchievementProgress(visitorId: string, achievementId: string): Promise<{
  current: number
  required: number
  percentage: number
} | null> {
  const achievement = getAchievementById(achievementId)
  if (!achievement) return null
  
  const field = STAT_TO_FIELD[achievement.requirement.type]
  if (!field) return null
  
  const stats = await getOrCreateVisitorStats(visitorId)
  const current = stats[field]
  const required = achievement.requirement.count
  
  return {
    current,
    required,
    percentage: Math.min(100, Math.round((current / required) * 100)),
  }
}
