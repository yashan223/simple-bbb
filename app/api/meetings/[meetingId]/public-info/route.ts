import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/dal'
import { getBBBMeetingInfo } from '@/lib/bbb'

interface RouteContext {
  params: Promise<{ meetingId: string }>
}

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
        moderatorPassword: true,
        hasStarted: true,
        isEnded: true,
        endedAt: true,
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    let isEnded = Boolean(meeting.isEnded)
    let endedAt = meeting.endedAt

    if (!isEnded) {
      try {
        const info = await getBBBMeetingInfo(meeting.meetingId, meeting.moderatorPassword)

        let hasStarted = meeting.hasStarted
        if (!hasStarted && (info.hasUserJoined || info.running)) {
          hasStarted = true
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { hasStarted: true },
          })
        }

        if (hasStarted) {
          const endedOnBBB =
            info.hasBeenForciblyEnded ||
            info.notFound ||
            (!info.running && info.hasUserJoined)

          if (endedOnBBB) {
            const updated = await prisma.meeting.update({
              where: { id: meeting.id },
              data: { isEnded: true, endedAt: new Date() },
            })
            isEnded = true
            endedAt = updated.endedAt
          }
        }
      } catch (err) {
        console.error('Error checking BBB status in public-info:', err)
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
