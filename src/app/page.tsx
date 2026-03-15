import { prisma } from '@/lib/prisma'
import { generateExcerpt } from '@/lib/utils'
import Header from '@/components/blog/Header'
import ArticleCard from '@/components/blog/ArticleCard'
import PikachuWidget from '@/components/blog/PikachuWidget'
import SunflowerWidget from '@/components/blog/SunflowerWidget'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '首页' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

async function getHomeData(page: number) {
  try {
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where: { published: true },
        orderBy: [{ pinned: 'desc' }, { pinnedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: { id: true, slug: true, title: true, excerpt: true, content: true, mood: true, pinned: true, accessType: true, price: true, createdAt: true },
      }),
      prisma.article.count({ where: { published: true } }),
    ])

    return { articles, total }
  } catch {
    return { articles: [], total: 0 }
  }
}

export default async function HomePage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1)
  const { articles, total } = await getHomeData(page)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* 移动端：单列；桌面端：左文章 + 右侧边栏 */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

          {/* 文章列表 */}
          <div className="flex-1 min-w-0 w-full">
            <div className="mb-6 sm:mb-8">
              <h1 className="font-serif text-2xl sm:text-3xl font-medium text-[#221e1a] mb-1">近期文章</h1>
              <p className="text-sm text-[#a89880]">共 {total} 篇</p>
            </div>

            {articles.length === 0 ? (
              <div className="text-center py-20 text-[#a89880]">
                <p className="text-4xl mb-4">✍️</p>
                <p>还没有文章，快去写第一篇吧</p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map(article => (
                  <ArticleCard
                    key={article.id}
                    slug={article.slug}
                    title={article.title}
                    excerpt={article.excerpt || generateExcerpt(article.content)}
                    mood={article.mood}
                    pinned={article.pinned}
                    accessType={article.accessType as 'PUBLIC' | 'PASSWORD' | 'PAID'}
                    price={article.price}
                    createdAt={article.createdAt}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-10 sm:mt-12">
                {page > 1 && <a href={`/?page=${page - 1}`} className="btn-secondary text-sm">← 上一页</a>}
                <span className="text-sm text-[#a89880]">{page} / {totalPages}</span>
                {page < totalPages && <a href={`/?page=${page + 1}`} className="btn-secondary text-sm">下一页 →</a>}
              </div>
            )}
          </div>

          {/* 侧边栏：移动端在文章下方全宽；桌面端固定右侧 */}
          <aside className="w-full lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-20 space-y-4">
            <SunflowerWidget />
            <div className="rounded-2xl border border-[#f0ebe3] bg-white p-4">
              <p className="text-xs text-[#c4b8a7] mb-3 font-medium uppercase tracking-wide">快速入口</p>
              <div className="space-y-1">
                <a href="/guestbook" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#5a4f42] hover:bg-[#faf8f5] hover:text-[#d4711a] transition-colors">
                  <span>💬</span> 留言板
                </a>
                <a href="/about" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#5a4f42] hover:bg-[#faf8f5] hover:text-[#d4711a] transition-colors">
                  <span>👋</span> 关于我
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
