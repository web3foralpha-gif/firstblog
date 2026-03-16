import 'server-only'

import { runWithDatabase } from '@/lib/db'

export type ApprovedGuestbookMessage = {
  id: string
  nickname: string
  avatar: string
  content: string
  emoji: string | null
  pinned: boolean
  createdAt: Date
  email: string | null
  emailVisible: boolean
}

export async function getApprovedGuestbookMessages(): Promise<ApprovedGuestbookMessage[]> {
  return runWithDatabase(
    async db =>
      db.guestbook.findMany({
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
      }),
    [],
    'guestbook_messages',
  )
}
