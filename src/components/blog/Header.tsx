import { getSetting } from '@/lib/settings'
import HeaderClient from './HeaderClient'

export default async function Header() {
  const [
    siteName,
    homeLabel,
    archiveLabel,
    aboutLabel,
    guestbookLabel,
    showArchive,
    showAbout,
    showGuestbook,
  ] = await Promise.all([
    getSetting('site.title'),
    getSetting('nav.homeLabel'),
    getSetting('nav.archiveLabel'),
    getSetting('nav.aboutLabel'),
    getSetting('nav.guestbookLabel'),
    getSetting('nav.showArchive'),
    getSetting('nav.showAbout'),
    getSetting('nav.showGuestbook'),
  ])

  const navItems = [
    { href: '/', label: homeLabel.trim() || '首页' },
    ...(showArchive === 'true' ? [{ href: '/archive', label: archiveLabel.trim() || '归档' }] : []),
    ...(showAbout === 'true' ? [{ href: '/about', label: aboutLabel.trim() || '关于' }] : []),
    ...(showGuestbook === 'true' ? [{ href: '/guestbook', label: guestbookLabel.trim() || '留言板' }] : []),
  ]

  return <HeaderClient siteName={siteName.trim() || '我的小站'} navItems={navItems} />
}
