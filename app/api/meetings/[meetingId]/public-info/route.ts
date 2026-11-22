import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ meetingId: string }>
}

// GET /api/meetings/[meetingId]/public-info
// Public access: external participants checking meeting details before joining
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
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    return NextResponse.json({
      name: meeting.name,
      meetingId: meeting.meetingId,
      welcomeMessage: meeting.welcomeMessage,
      isRecorded: meeting.isRecorded,
      hasPassword: Boolean(meeting.attendeePassword),
    })
  } catch (error) {
    console.error('Failed to get public meeting info:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
