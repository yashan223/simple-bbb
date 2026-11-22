import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createBBBMeeting, getBBBJoinUrl } from '@/lib/bbb'

interface RouteContext {
  params: Promise<{ meetingId: string }>
}

const JoinSchema = z.object({
  displayName: z.string().trim().min(1, 'Please enter your display name'),
  password: z.string().optional(),
})

// POST /api/meetings/[meetingId]/join
// Public access: allows external attendees to join BBB meeting without any PulseEdu account
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

    // If meeting has attendeePassword and user provided password, check it
    if (meeting.attendeePassword && password) {
      if (password.trim() !== meeting.attendeePassword.trim()) {
        return NextResponse.json({ error: 'Incorrect meeting password' }, { status: 403 })
      }
    }

    // Ensure meeting is created on BBB server
    await createBBBMeeting({
      meetingId: meeting.meetingId,
      name: meeting.name,
      attendeePassword: meeting.attendeePassword,
      moderatorPassword: meeting.moderatorPassword,
      welcomeMessage: meeting.welcomeMessage,
      maxParticipants: meeting.maxParticipants,
      isRecorded: meeting.isRecorded,
    })

    // Generate BBB join URL with attendee password
    const joinUrl = getBBBJoinUrl({
      meetingId: meeting.meetingId,
      fullName: displayName,
      password: meeting.attendeePassword,
    })

    return NextResponse.json({
      success: true,
      joinUrl,
    })
  } catch (error) {
    console.error('Participant join error:', error)
    return NextResponse.json({ error: 'Failed to join meeting' }, { status: 500 })
  }
}
