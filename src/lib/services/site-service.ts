import 'server-only'

import { runWithDatabase } from '@/lib/db'

export const DEFAULT_ABOUT_CONTENT = `## 你好，我是博主

这是一个已经完成基础生产化改造的个人博客。

现在前台博客由 Markdown 内容驱动，发布链路更稳定，页面更适合做静态生成和搜索引擎收录。

如果你来到这里，希望这些文字能陪你安静一会儿。`

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
