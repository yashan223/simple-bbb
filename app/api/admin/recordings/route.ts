import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/dal'
import { getBBBRecordings } from '@/lib/bbb'

export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  try {

    const meetings = await prisma.meeting.findMany({
      select: { meetingId: true, name: true },
    })

    const meetingMap = new Map<string, string>()
    for (const m of meetings) {
      meetingMap.set(m.meetingId, m.name)
    }

    const allRecordings = await getBBBRecordings()

    const pulseRecordings = allRecordings
      .filter((rec) => meetingMap.has(rec.meetingId) || rec.meetingId.startsWith('pulse-'))
      .map((rec) => ({
        ...rec,
        name: meetingMap.get(rec.meetingId) || rec.name,
      }))

    return NextResponse.json({ recordings: pulseRecordings })
  } catch (error) {
    console.error('Failed to get recordings:', error)
    return NextResponse.json({ error: 'Failed to retrieve recordings' }, { status: 500 })
  }
}
