import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (slug) {
    revalidatePath(`/article/${slug}`)
  }
  revalidatePath('/')
  return NextResponse.json({ revalidated: true })
}
