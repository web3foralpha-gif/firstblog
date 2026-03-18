import BlogTheme from '@/components/blog/BlogTheme'
import Header from '@/components/blog/Header'
import MarkdownContent from '@/components/blog/MarkdownContent'
import SiteFooter from '@/components/blog/SiteFooter'
import { getAboutPageContent } from '@/lib/services/site-service'

export const revalidate = 3600

export default async function AboutPage() {
  const content = await getAboutPageContent()

  return (
    <BlogTheme>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
          <h1 className="mb-10 font-serif text-3xl font-medium text-[var(--text-primary)]">关于我</h1>
          <MarkdownContent content={content} />
        </main>
        <SiteFooter compact />
      </div>
    </BlogTheme>
  )
}
