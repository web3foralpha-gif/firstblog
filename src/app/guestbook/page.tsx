import { prisma } from '@/lib/prisma'
import Header from '@/components/blog/Header'
import PikachuWidget from '@/components/blog/PikachuWidget'
import InlineGuestbookForm from '@/components/blog/InlineGuestbookForm'
import { formatDate } from '@/lib/utils'
import { getPublicGuestbookEmail } from '@/lib/guestbook'
import type { Metadata } from 'next'

export const revalidate = 60

export const metadata: Metadata = { title: '留言板' }

export default async function GuestbookPage() {
  const messages = await prisma.guestbook.findMany({
    where: { status: 'APPROVED' },
    orderBy: [{ pinned: 'desc' }, { pinnedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      nickname: true,
      avatar: true,
      content: true,
      emoji: true,
      pinned: true,
      createdAt: true,
      email: true,
      emailVisible: true,
    },
  })

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* 页头 */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl font-medium text-[#221e1a] mb-3">留言板</h1>
          <p className="text-sm text-[#8c7d68]">大家留下的足迹，匿名、真实</p>
          <p className="text-xs text-[#c4b8a7] mt-1">共 {messages.length} 条留言</p>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <hr className="flex-1 border-[#ddd5c8]" />
          <span className="text-xs text-[#c4b8a7]">大家说的话</span>
          <hr className="flex-1 border-[#ddd5c8]" />
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🌿</p>
            <p className="text-[#a89880] text-sm">还没有留言，往下写下第一句话吧</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 gap-4 space-y-4">
            {messages.map(msg => {
              const publicEmail = getPublicGuestbookEmail(msg)

              return (
                <div key={msg.id} className="break-inside-avoid card px-5 py-4 mb-4">
                  {msg.pinned && (
                    <div className="mb-2">
                      <span className="inline-flex items-center rounded-full bg-[#faeeda] px-2.5 py-1 text-[11px] font-medium text-[#854f0b]">
                        📌 置顶留言
                      </span>
                    </div>
                  )}
                  <p className="text-[15px] text-[#3d3530] leading-relaxed mb-3 font-serif whitespace-pre-wrap">
                    {msg.emoji && <span className="mr-1">{msg.emoji}</span>}
                    {msg.content}
                  </p>
                  <div className="flex items-center gap-2 pt-2 border-t border-[#f0ebe3]">
                    <span className="text-lg leading-none">{msg.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-[#a89880] font-medium">{msg.nickname}</span>
                      {publicEmail && (
                        <a href={`mailto:${publicEmail}`} className="block text-[11px] text-[#d4711a] hover:underline truncate">{publicEmail}</a>
                      )}
                    </div>
                    <time className="text-xs text-[#c4b8a7] flex-shrink-0">{formatDate(msg.createdAt)}</time>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-4 mt-12 mb-8">
          <hr className="flex-1 border-[#ddd5c8]" />
          <span className="text-xs text-[#c4b8a7]">写下你的留言</span>
          <hr className="flex-1 border-[#ddd5c8]" />
        </div>

        <InlineGuestbookForm />
      </main>

      <footer className="border-t border-[#ddd5c8] mt-16 py-8 text-center text-xs text-[#c4b8a7]">
        <p>用文字记录生活 · {new Date().getFullYear()}</p>
      </footer>

      <PikachuWidget />
    </div>
  )
}
