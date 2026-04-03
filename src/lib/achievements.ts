// Achievement system definitions and utilities

export type AchievementCategory = 'plant' | 'pet' | 'reading' | 'social' | 'special'

export type Achievement = {
  id: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  requirement: {
    type: string
    count: number
  }
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

export const ACHIEVEMENTS: Achievement[] = [
  // Plant care achievements
  {
    id: 'first_water',
    name: '初次浇水',
    description: '第一次给向日葵浇水',
    icon: '💧',
    category: 'plant',
    requirement: { type: 'watering', count: 1 },
    rarity: 'common',
  },
  {
    id: 'gardener_apprentice',
    name: '园艺学徒',
    description: '累计浇水 10 次',
    icon: '🌱',
    category: 'plant',
    requirement: { type: 'watering', count: 10 },
    rarity: 'uncommon',
  },
  {
    id: 'master_gardener',
    name: '园艺大师',
    description: '累计浇水 50 次',
    icon: '🌻',
    category: 'plant',
    requirement: { type: 'watering', count: 50 },
    rarity: 'rare',
  },
  {
    id: 'first_fertilize',
    name: '初次施肥',
    description: '第一次给向日葵施肥',
    icon: '✨',
    category: 'plant',
    requirement: { type: 'fertilizing', count: 1 },
    rarity: 'common',
  },
  {
    id: 'nutrition_expert',
    name: '营养专家',
    description: '累计施肥 20 次',
    icon: '🧪',
    category: 'plant',
    requirement: { type: 'fertilizing', count: 20 },
    rarity: 'uncommon',
  },
  {
    id: 'first_sunbath',
    name: '阳光使者',
    description: '第一次让向日葵晒太阳',
    icon: '☀️',
    category: 'plant',
    requirement: { type: 'sunbathing', count: 1 },
    rarity: 'common',
  },
  {
    id: 'sun_keeper',
    name: '光照守护者',
    description: '累计晒太阳 30 次',
    icon: '🌤️',
    category: 'plant',
    requirement: { type: 'sunbathing', count: 30 },
    rarity: 'rare',
  },
  
  // Pet interaction achievements
  {
    id: 'first_pet_click',
    name: '初见皮卡丘',
    description: '第一次点击皮卡丘',
    icon: '⚡',
    category: 'pet',
    requirement: { type: 'pet_clicks', count: 1 },
    rarity: 'common',
  },
  {
    id: 'pet_friend',
    name: '宠物伙伴',
    description: '点击皮卡丘 20 次',
    icon: '💛',
    category: 'pet',
    requirement: { type: 'pet_clicks', count: 20 },
    rarity: 'uncommon',
  },
  {
    id: 'pikachu_master',
    name: '皮卡丘大师',
    description: '点击皮卡丘 100 次',
    icon: '🏆',
    category: 'pet',
    requirement: { type: 'pet_clicks', count: 100 },
    rarity: 'epic',
  },
  
  // Reading achievements
  {
    id: 'first_read',
    name: '初读者',
    description: '阅读第一篇文章',
    icon: '📖',
    category: 'reading',
    requirement: { type: 'article_reads', count: 1 },
    rarity: 'common',
  },
  {
    id: 'avid_reader',
    name: '阅读爱好者',
    description: '阅读 10 篇文章',
    icon: '📚',
    category: 'reading',
    requirement: { type: 'article_reads', count: 10 },
    rarity: 'uncommon',
  },
  {
    id: 'bookworm',
    name: '书虫',
    description: '阅读 50 篇文章',
    icon: '🐛',
    category: 'reading',
    requirement: { type: 'article_reads', count: 50 },
    rarity: 'rare',
  },
  {
    id: 'first_like',
    name: '初次点赞',
    description: '第一次点赞文章',
    icon: '👍',
    category: 'reading',
    requirement: { type: 'likes', count: 1 },
    rarity: 'common',
  },
  {
    id: 'supportive_reader',
    name: '热心读者',
    description: '点赞 20 篇文章',
    icon: '❤️',
    category: 'reading',
    requirement: { type: 'likes', count: 20 },
    rarity: 'uncommon',
  },
  
  // Social achievements
  {
    id: 'first_comment',
    name: '初次评论',
    description: '发表第一条评论',
    icon: '💬',
    category: 'social',
    requirement: { type: 'comments', count: 1 },
    rarity: 'common',
  },
  {
    id: 'active_commenter',
    name: '活跃评论者',
    description: '发表 10 条评论',
    icon: '🗣️',
    category: 'social',
    requirement: { type: 'comments', count: 10 },
    rarity: 'uncommon',
  },
  {
    id: 'first_guestbook',
    name: '留言板签到',
    description: '在留言板留下第一条留言',
    icon: '✏️',
    category: 'social',
    requirement: { type: 'guestbook', count: 1 },
    rarity: 'common',
  },
  
  // Special achievements
  {
    id: 'daily_visitor',
    name: '常客',
    description: '连续访问 3 天',
    icon: '🌟',
    category: 'special',
    requirement: { type: 'consecutive_days', count: 3 },
    rarity: 'uncommon',
  },
  {
    id: 'loyal_visitor',
    name: '忠实访客',
    description: '连续访问 7 天',
    icon: '🌈',
    category: 'special',
    requirement: { type: 'consecutive_days', count: 7 },
    rarity: 'rare',
  },
  {
    id: 'dedicated_visitor',
    name: '铁杆粉丝',
    description: '连续访问 30 天',
    icon: '👑',
    category: 'special',
    requirement: { type: 'consecutive_days', count: 30 },
    rarity: 'legendary',
  },
]

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map(a => [a.id, a]))

export const RARITY_COLORS: Record<Achievement['rarity'], { bg: string; border: string; text: string }> = {
  common: { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-600' },
  uncommon: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  rare: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  epic: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  legendary: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
}

export const RARITY_LABELS: Record<Achievement['rarity'], string> = {
  common: '普通',
  uncommon: '稀有',
  rare: '珍贵',
  epic: '史诗',
  legendary: '传说',
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENT_MAP.get(id)
}

export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category)
}
