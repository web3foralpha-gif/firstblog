import type { Metadata } from 'next'

import BlogIndexPage from '@/components/blog/BlogIndexPage'
import { getAllPosts } from '@/lib/posts'

export const metadata: Metadata = {
  title: '博客',
  description: 'Markdown 驱动的静态博客列表页。',
}

export const revalidate = 3600

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <BlogIndexPage
      posts={posts}
      title="博客文章"
      description="内容来自 content/posts，使用 SSG + ISR 持续更新。"
    />
  )
}
