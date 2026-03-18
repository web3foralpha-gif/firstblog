import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始初始化数据...')
  const aboutContent = `## 你好，我是博主 👋

这是一个记录生活、分享心情的小小角落。

欢迎常来坐坐。`

  // 创建示例文章
  await prisma.article.upsert({
    where: { slug: 'hello-world-demo' },
    update: {},
    create: {
      slug: 'hello-world-demo',
      title: '你好，世界 👋',
      content: `## 欢迎来到我的小站

这是博客的第一篇文章，一个崭新的开始。

在这里，我会记录日常生活的点点滴滴——也许是一个触动我的瞬间，也许是一本书里的某句话，也许只是今天天气特别好。

## 为什么写博客？

> 写作是一种思考的方式。当你把想法写下来，它就不再只存在于脑海中，而是变成了某种可以审视、打磨的东西。

所以，我开始写了。

## 接下来

这个博客会慢慢填充内容，感谢你在这里。✨`,
      excerpt: '这是博客的第一篇文章，一个崭新的开始……',
      mood: '🥰',
      accessType: 'PUBLIC',
      published: true,
    },
  })

  await prisma.article.upsert({
    where: { slug: 'secret-article-demo' },
    update: {},
    create: {
      slug: 'secret-article-demo',
      title: '一些私密的想法 🔒',
      content: '这是加密文章的内容，只有输入正确密码才能看到。\n\n这里可以写一些不想公开分享的心情日记。',
      excerpt: '这篇文章需要密码才能阅读…',
      mood: '😌',
      accessType: 'PASSWORD',
      passwordHash: await bcrypt.hash('demo123', 12),
      published: true,
    },
  })

  await prisma.article.upsert({
    where: { slug: 'paid-article-demo' },
    update: {},
    create: {
      slug: 'paid-article-demo',
      title: '深度思考：关于时间的一些想法 ☕',
      content: '这是打赏文章的内容，感谢你的支持！\n\n这里是文章的完整内容……',
      excerpt: '打赏解锁后可阅读全文…',
      mood: '🤔',
      accessType: 'PAID',
      price: 5,
      published: true,
    },
  })

  // 关于页面默认内容
  await prisma.setting.upsert({
    where: { key: 'blog.aboutContent' },
    update: {},
    create: {
      key: 'blog.aboutContent',
      value: aboutContent,
      type: 'string',
    },
  })

  await prisma.siteSetting.upsert({
    where: { key: 'about_content' },
    update: {},
    create: {
      key: 'about_content',
      value: aboutContent,
    },
  })

  console.log('✅ 初始化完成！')
  console.log('💡 加密文章测试密码：demo123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
