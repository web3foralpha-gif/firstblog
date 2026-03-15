import { prisma } from '@/lib/prisma'
import Header from '@/components/blog/Header'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

export const dynamic = 'force-dynamic'

const DEFAULT_ABOUT = `## 你好，我是博主 👋

这是一个记录生活、分享心情的小小角落。

在这里你会看到我的日常碎碎念、旅行见闻、读书笔记，以及偶尔的深夜感悟。

文字是我与世界沟通的方式，也是我留给自己的备忘录。

欢迎常来坐坐。`

export default async function AboutPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'about_content' } }).catch(() => null)
  const content = setting?.value || DEFAULT_ABOUT

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="font-serif text-3xl font-medium text-[#221e1a] mb-10">关于我</h1>
        <article className="prose-blog">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {content}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  )
}
