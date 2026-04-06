export type AdminNavItem = {
  href: string
  icon: string
  label: string
  description: string
}

export type AdminNavGroup = {
  label: string
  description: string
  items: AdminNavItem[]
}

export const ADMIN_HOME_ITEM: AdminNavItem = {
  href: '/houtai',
  icon: '🏠',
  label: '控制中心',
  description: '看全站概览、待办和配置入口。',
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: '内容工作区',
    description: '写作、审核、资源都在这一组里完成。',
    items: [
      { href: '/houtai/articles', icon: '📄', label: '文章管理', description: '管理文章列表、权限和置顶。' },
      { href: '/houtai/articles/new', icon: '✏️', label: '写新文章', description: '直接进入写作工作区。' },
      { href: '/houtai/comments', icon: '💬', label: '评论管理', description: '集中审核评论与批量处理。' },
      { href: '/houtai/guestbook', icon: '📮', label: '留言审核', description: '处理留言、邮箱显示和置顶。' },
      { href: '/houtai/media', icon: '🗂️', label: '媒体库', description: '上传、筛选和复制媒体链接。' },
    ],
  },
  {
    label: '运营分析',
    description: '访客、互动、打赏和成长数据都在这里。',
    items: [
      { href: '/houtai/analytics', icon: '📊', label: '访问统计', description: '看真实访客、设备和互动轨迹。' },
      { href: '/houtai/sunflower', icon: '🌻', label: '向日葵', description: '查看养成互动和成长状态。' },
      { href: '/houtai/payments', icon: '💳', label: '打赏记录', description: '核对支付和付费解锁情况。' },
    ],
  },
  {
    label: '站点配置',
    description: '站点形象、服务接入和备份出口。',
    items: [
      { href: '/houtai/settings', icon: '⚙️', label: '配置中心', description: '分组修改前台与服务配置。' },
      { href: '/houtai/backup', icon: '💾', label: '备份导出', description: '处理备份与导出操作。' },
    ],
  },
]

export function isAdminNavActive(pathname: string, href: string) {
  return href === '/houtai' ? pathname === '/houtai' : pathname.startsWith(href)
}

export function getAdminNavContext(pathname: string) {
  if (isAdminNavActive(pathname, ADMIN_HOME_ITEM.href)) {
    return {
      item: ADMIN_HOME_ITEM,
      group: null,
    }
  }

  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find(entry => isAdminNavActive(pathname, entry.href))
    if (item) {
      return { item, group }
    }
  }

  return {
    item: ADMIN_HOME_ITEM,
    group: null,
  }
}
