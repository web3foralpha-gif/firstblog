import { getSetting } from '@/lib/settings'
import HeaderClient from './HeaderClient'

export default async function Header() {
  const siteName = (await getSetting('site.title')).trim() || '我的小站'
  return <HeaderClient siteName={siteName} />
}
