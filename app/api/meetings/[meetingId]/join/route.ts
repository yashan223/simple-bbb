import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createBBBMeeting, getBBBJoinUrl } from '@/lib/bbb'
import { verifyAdminSession } from '@/lib/dal'

interface RouteContext {
  params: Promise<{ meetingId: string }>
}

const JoinSchema = z.object({
  displayName: z.string().trim().min(1, 'Please enter your display name'),
  password: z.string().optional(),
})

// POST /api/meetings/[meetingId]/join
export async function POST(request: Request, context: RouteContext) {
  try {
    const { meetingId } = await context.params
    const body = await request.json()
    const validation = JoinSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Display name is required' },
        { status: 400 }
      )
    }

    const { displayName, password } = validation.data

    const meeting = await prisma.meeting.findUnique({
      where: { meetingId },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // CRITICAL: If meeting was ended by host, reject the join request and do NOT recreate it!
    if (meeting.isEnded) {
      return NextResponse.json(
        { error: 'This meeting has ended and is closed. No further participants can join.' },
        { status: 410 }
      )
    }

    // Check if the current user is an authenticated Admin (Host)
    const auth = await verifyAdminSession()
    const isHost = Boolean(auth?.isAuth)

    // Unauthenticated guests must provide attendee password if one is required
    if (!isHost) {
      if (meeting.attendeePassword && password) {
        if (password.trim() !== meeting.attendeePassword.trim()) {
          return NextResponse.json({ error: 'Incorrect meeting password' }, { status: 403 })
        }
      } else if (meeting.attendeePassword && !password) {
        return NextResponse.json({ error: 'Meeting password is required' }, { status: 403 })
      }
    }

    // Ensure meeting exists on BBB server
    await createBBBMeeting({
      meetingId: meeting.meetingId,
      name: meeting.name,
      attendeePassword: meeting.attendeePassword,
      moderatorPassword: meeting.moderatorPassword,
      welcomeMessage: meeting.welcomeMessage,
      maxParticipants: meeting.maxParticipants,
      isRecorded: meeting.isRecorded,
    })

    // Authenticated admin joins with moderatorPassword (Host)
    // Guest joins with attendeePassword (Guest)
    const joinPassword = isHost ? meeting.moderatorPassword : meeting.attendeePassword
    const hostName = auth?.user?.name || 'Meeting Host'
    const effectiveName = displayName || (isHost ? hostName : 'Guest Participant')

    const joinUrl = getBBBJoinUrl({
      meetingId: meeting.meetingId,
      fullName: effectiveName,
      password: joinPassword,
    })

    return NextResponse.json({
      success: true,
      joinUrl,
      role: isHost ? 'host' : 'guest',
    })
  } catch (error) {
    console.error('Participant join error:', error)
    return NextResponse.json({ error: 'Failed to join meeting' }, { status: 500 })
  }
}
