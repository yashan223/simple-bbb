import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/dal'
import { isBBBMeetingRunning } from '@/lib/bbb'

interface RouteContext {
  params: Promise<{ meetingId: string }>
}

// GET /api/meetings/[meetingId]/public-info
export async function GET(request: Request, context: RouteContext) {
  try {
    const { meetingId } = await context.params
    const meeting = await prisma.meeting.findUnique({
      where: { meetingId },
      select: {
        id: true,
        name: true,
        meetingId: true,
        welcomeMessage: true,
        isRecorded: true,
        attendeePassword: true,
        isEnded: true,
        endedAt: true,
        createdAt: true,
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    let isEnded = Boolean(meeting.isEnded)
    let endedAt = meeting.endedAt

    // If not recorded as ended, but created > 3 mins ago, verify BBB running status
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000)
    if (!isEnded && meeting.createdAt < threeMinutesAgo) {
      const running = await isBBBMeetingRunning(meeting.meetingId)
      if (!running) {
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { isEnded: true, endedAt: new Date() },
        })
        isEnded = true
        endedAt = new Date()
      }
    }

    const auth = await verifyAdminSession()

    return NextResponse.json({
      name: meeting.name,
      meetingId: meeting.meetingId,
      welcomeMessage: meeting.welcomeMessage,
      isRecorded: meeting.isRecorded,
      isEnded,
      endedAt,
      hasPassword: Boolean(meeting.attendeePassword),
      isAuthenticated: Boolean(auth?.isAuth),
      adminUser: auth?.user
        ? {
            name: auth.user.name,
            email: auth.user.email,
          }
        : null,
    })
  } catch (error) {
    console.error('Failed to get public meeting info:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
