import { getHeaderData } from '@/lib/services/site-service'
import HeaderClient from './HeaderClient'

export default async function Header() {
  const { siteName, navItems } = await getHeaderData()
  return <HeaderClient siteName={siteName} navItems={navItems} />
}
