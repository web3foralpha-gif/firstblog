import 'server-only'

import { DEFAULT_ABOUT_CONTENT } from '@/lib/content-defaults'
import { getSetting } from '@/lib/settings'

export async function getAboutPageTitle() {
  const title = await getSetting('blog.aboutTitle')
  return title.trim() || '关于我'
}

export async function getAboutPageSubtitle() {
  return (await getSetting('blog.aboutSubtitle')).trim()
}

export async function getAboutPageAvatar() {
  return (await getSetting('blog.aboutAvatar')).trim()
}

export async function getAboutPageCoverImage() {
  return (await getSetting('blog.aboutCoverImage')).trim()
}

export async function getAboutPageContactsTitle() {
  const title = await getSetting('blog.aboutContactsTitle')
  return title.trim() || '社交与联系方式'
}

export async function getAboutPageContacts() {
  return await getSetting('blog.aboutContacts')
}

export async function getAboutPageContent() {
  const content = await getSetting('blog.aboutContent')
  return content.trim() || DEFAULT_ABOUT_CONTENT
}
