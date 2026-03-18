import 'server-only'

import { runWithDatabase } from '@/lib/db'

export const DEFAULT_ABOUT_CONTENT = `## 你好，我是博主

如果你来到这里，希望这些文字能陪你安静一会儿。

`

export async function getAboutPageContent() {
  return runWithDatabase(
    async db => {
      const setting = await db.siteSetting.findUnique({ where: { key: 'about_content' } })
      return setting?.value?.trim() || DEFAULT_ABOUT_CONTENT
    },
    DEFAULT_ABOUT_CONTENT,
    'about_content',
  )
}
