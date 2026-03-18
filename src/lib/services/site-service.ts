import 'server-only'

import { DEFAULT_ABOUT_CONTENT } from '@/lib/content-defaults'
import { getSetting } from '@/lib/settings'

export async function getAboutPageContent() {
  const content = await getSetting('blog.aboutContent')
  return content.trim() || DEFAULT_ABOUT_CONTENT
}
