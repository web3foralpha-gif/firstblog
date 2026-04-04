import type { AdminSettingField } from '@/components/houtai/admin-settings-config'

export type SettingDef = {
  type: string
  label: string
  default?: string
}

export type AdminSettingsCenterProps = {
  title?: string
  subtitle?: string
  mode?: 'full' | 'compact'
  fullPageHref?: string
}

export const SETTINGS_CENTER_UI_KEY = 'blog-fix:settings-center-ui'

export type SettingsSectionMeta = {
  label: string
  tone: string
  note: string
  icon: string
  scope: string[]
}

export function getSectionMeta(sectionId: string): SettingsSectionMeta {
  if (sectionId === 'site') {
    return {
      label: '品牌 / SEO',
      tone: 'border-sky-200 bg-sky-50 text-sky-700',
      note: '搜索引擎、站点识别与标签页表现会直接受影响。',
      icon: '🪪',
      scope: ['搜索结果', '浏览器标签页', '全站主题'],
    }
  }

  if (sectionId === 'navigation') {
    return {
      label: '全站导航',
      tone: 'border-violet-200 bg-violet-50 text-violet-700',
      note: '控制顶部导航、页脚入口和 RSS 对访客的可见性。',
      icon: '🧭',
      scope: ['顶部导航', '页脚导航', 'RSS'],
    }
  }

  if (sectionId === 'home') {
    return {
      label: '首页编排',
      tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
      note: '首页标题、搜索栏、角落卡片和快捷入口会即时同步到前台。',
      icon: '🏠',
      scope: ['首页标题', '搜索栏', '侧边卡片'],
    }
  }

  if (sectionId === 'archive') {
    return {
      label: '归档页面',
      tone: 'border-cyan-200 bg-cyan-50 text-cyan-700',
      note: '适合单独调整归档页的标题、说明和按钮，不再和首页内容混在一起。',
      icon: '🗂',
      scope: ['归档页头', 'CTA 按钮'],
    }
  }

  if (sectionId === 'guestbook') {
    return {
      label: '交流页面',
      tone: 'border-teal-200 bg-teal-50 text-teal-700',
      note: '会影响留言板页头、空状态和留言表单的全部前台文案。',
      icon: '📮',
      scope: ['留言板', '留言表单'],
    }
  }

  if (sectionId === 'footer') {
    return {
      label: '页脚信息',
      tone: 'border-stone-200 bg-stone-50 text-stone-700',
      note: '会影响全站底部说明、友链展示和站点氛围。',
      icon: '🦶',
      scope: ['页脚短句', '友情链接'],
    }
  }

  if (sectionId === 'about') {
    return {
      label: '个人介绍',
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      note: '头像、头图、联系信息和正文都会直接反映在关于页。',
      icon: '👤',
      scope: ['关于页', '联系方式'],
    }
  }

  if (sectionId === 'poster') {
    return {
      label: '分享素材',
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
      note: '文章海报的字体、顶部标签和扫码说明统一在这里维护。',
      icon: '🖼',
      scope: ['分享海报', '二维码说明'],
    }
  }

  if (sectionId === 'payments' || sectionId === 'ai') {
    return {
      label: '服务接入',
      tone: 'border-violet-200 bg-violet-50 text-violet-700',
      note: '这里包含外部平台接入信息，保存前建议再次核对。',
      icon: sectionId === 'payments' ? '💳' : '🤖',
      scope: sectionId === 'payments' ? ['打赏配置', '支付提示'] : ['AI 分身', '模型接入'],
    }
  }

  if (sectionId === 'article') {
    return {
      label: '文章体验',
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      note: '会同时影响文章页的评论区、互动栏、相关推荐和返回入口。',
      icon: '📝',
      scope: ['评论区', '互动栏', '相关推荐'],
    }
  }

  if (sectionId === 'analytics') {
    return {
      label: '统计治理',
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      note: '用于剔除站长自测流量，让访问与互动统计更接近真实访客。',
      icon: '📊',
      scope: ['IP 白名单', '设备白名单'],
    }
  }

  if (sectionId === 'interaction') {
    return {
      label: '互动体验',
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      note: '会影响宠物和向日葵在前台给访客的互动反馈。',
      icon: '✨',
      scope: ['宠物文案', '向日葵反馈'],
    }
  }

  if (sectionId === 'security') {
    return {
      label: '敏感配置',
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
      note: '涉及后台登录与权限安全，改动后建议立即验证登录流程。',
      icon: '🔐',
      scope: ['管理员账号', '登录安全'],
    }
  }

  if (sectionId === 'system') {
    return {
      label: '状态页面',
      tone: 'border-zinc-200 bg-zinc-50 text-zinc-700',
      note: '用于维护 404 等系统状态页，让异常页也保持统一语气。',
      icon: '🧱',
      scope: ['404 页面'],
    }
  }

  return {
    label: '前台展示',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    note: '会直接影响访客前台看到的内容、文案与视觉表现。',
    icon: '🪄',
    scope: ['前台展示'],
  }
}

export function formatSavedTime(value: number | null | undefined) {
  if (!value) return '未记录'

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function buildSectionHref(basePath: string, currentSearch: string, sectionId?: string | null) {
  const params = new URLSearchParams(currentSearch)

  if (sectionId) {
    params.set('section', sectionId)
  } else {
    params.delete('section')
  }

  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function isLongField(field: AdminSettingField) {
  return field.kind === 'textarea' || field.kind === 'image'
}
