import Header from '@/components/blog/Header'
import MarkdownContent from '@/components/blog/MarkdownContent'
import { getAboutPageContent } from '@/lib/services/site-service'

export const revalidate = 3600

export default async function AboutPage() {
  const content = await getAboutPageContent()

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="font-serif text-3xl font-medium text-[#221e1a] mb-10">关于我</h1>
        <MarkdownContent content={content} />
      </main>
    </div>
  )
}
