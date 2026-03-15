import ArticleForm from '@/components/admin/ArticleForm'

export const metadata = { title: '写新文章' }

export default function NewArticlePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-medium text-[#221e1a]">写新文章</h1>
        <p className="text-sm text-[#a89880] mt-1">把今天的故事写下来</p>
      </div>
      <ArticleForm mode="new" />
    </div>
  )
}
