import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/dal'
import { getBBBRecordings } from '@/lib/bbb'

// GET /api/admin/recordings - List only recordings created through PulseEdu
export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 })
  }

  try {
    // 1. Fetch meeting IDs created in this PulseEdu instance
    const meetings = await prisma.meeting.findMany({
      select: { meetingId: true, name: true },
    })

    const meetingMap = new Map<string, string>()
    for (const m of meetings) {
      meetingMap.set(m.meetingId, m.name)
    }

    // 2. Query BigBlueButton for recordings
    const allRecordings = await getBBBRecordings()

    // 3. Filter strictly: ONLY include recordings that belong to meetings created through PulseEdu
    // This removes all external/foreign recordings from other users on the server
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
