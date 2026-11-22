import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/dal'

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
        name: true,
        meetingId: true,
        welcomeMessage: true,
        isRecorded: true,
        attendeePassword: true,
        isEnded: true,
        endedAt: true,
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const auth = await verifyAdminSession()

    return NextResponse.json({
      name: meeting.name,
      meetingId: meeting.meetingId,
      welcomeMessage: meeting.welcomeMessage,
      isRecorded: meeting.isRecorded,
      isEnded: Boolean(meeting.isEnded),
      endedAt: meeting.endedAt,
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
