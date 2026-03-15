import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">🍃</p>
        <h1 className="font-serif text-3xl font-medium text-[#221e1a] mb-2">页面不存在</h1>
        <p className="text-[#8c7d68] mb-8">这里什么都没有，也许它从未存在过</p>
        <Link href="/" className="btn-primary">← 回到首页</Link>
      </div>
    </div>
  )
}
