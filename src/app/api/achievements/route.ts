import { NextRequest, NextResponse } from 'next/server'
import { getVisitorAchievements, incrementVisitorStat, updateConsecutiveDays } from '@/lib/services/achievement-service'
import { cookies } from 'next/headers'

function getVisitorId(request: NextRequest): string | null {
  // Try to get visitorId from cookie
  const cookieStore = cookies()
  const visitorId = cookieStore.get('visitor_id')?.value
  
  // Or from header (for client-side tracking)
  const headerVisitorId = request.headers.get('x-visitor-id')
  
  return visitorId || headerVisitorId || null
}

export async function GET(request: NextRequest) {
  const visitorId = getVisitorId(request)
  
  if (!visitorId) {
    return NextResponse.json({ error: 'No visitor ID' }, { status: 400 })
  }
  
  try {
    const data = await getVisitorAchievements(visitorId)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const visitorId = getVisitorId(request)
  
  if (!visitorId) {
    return NextResponse.json({ error: 'No visitor ID' }, { status: 400 })
  }
  
  try {
    const body = await request.json()
    const { action, statType } = body
    
    let newAchievements = []
    
    if (action === 'increment' && statType) {
      newAchievements = await incrementVisitorStat(visitorId, statType)
    } else if (action === 'visit') {
      newAchievements = await updateConsecutiveDays(visitorId)
    }
    
    return NextResponse.json({ 
      success: true, 
      newAchievements: newAchievements.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        rarity: a.rarity,
      }))
    })
  } catch (error) {
    console.error('Error updating achievements:', error)
    return NextResponse.json({ error: 'Failed to update achievements' }, { status: 500 })
  }
}
