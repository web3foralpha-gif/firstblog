import Link from 'next/link'
import { getSetting } from '@/lib/settings'

export default async function NotFound() {
  const [title, description, backHomeLabel] = await Promise.all([
    getSetting('system.notFoundTitle'),
    getSetting('system.notFoundDescription'),
    getSetting('system.notFoundBackHomeLabel'),
  ])

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">🍃</p>
        <h1 className="font-serif text-3xl font-medium text-[#221e1a] mb-2">{title.trim() || '页面不存在'}</h1>
        <p className="text-[#8c7d68] mb-8">{description.trim() || '这里什么都没有，也许它从未存在过'}</p>
        <Link href="/" className="btn-primary">{backHomeLabel.trim() || '← 回到首页'}</Link>
      </div>
    </div>
  )
}
