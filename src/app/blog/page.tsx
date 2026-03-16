import type { Metadata } from 'next'

import BlogIndexPage from '@/components/blog/BlogIndexPage'
import { getAllPosts } from '@/lib/posts'

export const metadata: Metadata = {
  title: '博客',
  description: '写下生活、心情与一些正在发生的小事。',
}

export const revalidate = 3600

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <BlogIndexPage
      posts={posts}
      title="博客文章"
      description="写下生活、心情与一些正在发生的小事。"
    />
  )
}
