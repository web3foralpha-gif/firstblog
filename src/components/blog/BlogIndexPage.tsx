import Header from '@/components/blog/Header'
import ArticleCard from '@/components/blog/ArticleCard'
import PikachuWidget from '@/components/blog/PikachuWidget'
import SunflowerWidget from '@/components/blog/SunflowerWidget'
import type { BlogPostSummary } from '@/lib/posts'

type BlogIndexPageProps = {
  posts: BlogPostSummary[]
  title?: string
  description?: string
}

export default function BlogIndexPage({
  posts,
  title = '近期文章',
  description = 'Markdown 驱动 · 静态生成 · 生产环境友好',
}: BlogIndexPageProps) {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          <div className="flex-1 min-w-0 w-full">
            <div className="mb-6 sm:mb-8">
              <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#221e1a] mb-1">{title}</h1>
              <p className="text-sm text-[#a89880]">{description}</p>
              <p className="text-sm text-[#a89880] mt-1">共 {posts.length} 篇</p>
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-20 text-[#a89880]">
                <p className="text-4xl mb-4">📝</p>
                <p>还没有 Markdown 文章，去 `content/posts` 放入第一篇吧。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map(post => (
                  <ArticleCard
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    slug={post.slug}
                    title={post.title}
                    excerpt={post.excerpt}
                    mood={post.mood}
                    accessType="PUBLIC"
                    price={null}
                    createdAt={post.publishedAt}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="w-full lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-20 space-y-4">
            <SunflowerWidget />
            <div className="rounded-2xl border border-[#f0ebe3] bg-white p-4">
              <p className="text-xs text-[#c4b8a7] mb-3 font-medium uppercase tracking-wide">博客架构</p>
              <div className="space-y-2 text-sm text-[#5a4f42]">
                <p>内容来源：`content/posts`</p>
                <p>渲染方式：SSG + ISR</p>
                <p>SEO：RSS / Sitemap / Robots</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[#f0ebe3] bg-white p-4">
              <p className="text-xs text-[#c4b8a7] mb-3 font-medium uppercase tracking-wide">快速入口</p>
              <div className="space-y-1">
                <a href="/about" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#5a4f42] hover:bg-[#faf8f5] hover:text-[#d4711a] transition-colors">
                  <span>👋</span> 关于我
                </a>
                <a href="/guestbook" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#5a4f42] hover:bg-[#faf8f5] hover:text-[#d4711a] transition-colors">
                  <span>💬</span> 留言板
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-[#ddd5c8] mt-10 sm:mt-16 py-6 sm:py-8 text-center text-xs text-[#c4b8a7]">
        <p>用文字记录生活 · {new Date().getFullYear()}</p>
      </footer>

      <PikachuWidget />
    </div>
  )
}
